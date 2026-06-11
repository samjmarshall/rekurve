/**
 * Bounds the latency of a DB operation so a hung Neon HTTP request fails fast
 * with a catchable error instead of running until Vercel's function timeout
 * (which surfaces as a `504 Vercel Runtime Timeout`). The Neon serverless HTTP
 * driver exposes no per-statement timeout when used through Drizzle, so we race
 * the operation against a timer at the application layer.
 *
 * The underlying fetch is not aborted — in a serverless invocation it is
 * discarded when the instance freezes after the response is sent. The point is
 * to reject promptly so an Inngest step reports a *retriable* error (and Inngest
 * retries it later with backoff, by which time a cold compute is warm) rather
 * than burning the whole function budget and 504-ing.
 */
export class DbTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`DB operation "${label}" exceeded ${ms}ms`);
    this.name = "DbTimeoutError";
  }
}

export function withDbTimeout<T>(
  label: string,
  ms: number,
  operation: () => Promise<T>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DbTimeoutError(label, ms)), ms);
  });
  return Promise.race([operation(), timeout]).finally(() =>
    clearTimeout(timer),
  );
}
