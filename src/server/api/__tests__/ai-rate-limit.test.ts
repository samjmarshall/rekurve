import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";

beforeEach(() => {
  rs.resetModules();

  rs.doMock("~/env", () => ({
    env: {
      DATABASE_URL: "postgres://mock",
      HUBSPOT_ACCESS_TOKEN: "mock",
      HUBSPOT_CLIENT_SECRET: "mock",
    },
  }));

  rs.doMock("~/server/db", () => ({ db: {} }));

  rs.doMock("~/lib/session", () => ({
    getSession: rs.fn().mockResolvedValue({
      user: { id: "test-user-id", email: "test@example.com", name: "Test" },
      session: { id: "test-session-id" },
    }),
  }));
});

function makeLimitResult(
  success: boolean,
  reset: number,
): {
  success: boolean;
  reset: number;
  limit: number;
  remaining: number;
  pending: Promise<void>;
} {
  return {
    success,
    reset,
    limit: 10,
    remaining: success ? 9 : 0,
    pending: Promise.resolve(),
  };
}

async function buildCaller(aiLimiterMock: { limit: ReturnType<typeof rs.fn> }) {
  rs.doMock("~/lib/rate-limit", () => ({
    aiLimiter: aiLimiterMock,
  }));

  const {
    createTRPCRouter,
    aiProcedure,
    createCallerFactory,
    createTRPCContext,
  } = await import("../trpc");

  const testRouter = createTRPCRouter({
    stub: aiProcedure.query(() => ({ ok: true })),
  });

  const ctx = await createTRPCContext({ headers: new Headers() });
  const caller = createCallerFactory(testRouter)(ctx);
  return caller;
}

describe("aiProcedure rate-limit middleware", () => {
  test("under limit — stub query resolves without throwing", async () => {
    const mockLimit = rs
      .fn()
      .mockResolvedValue(makeLimitResult(true, Date.now() + 60_000));
    const caller = await buildCaller({ limit: mockLimit });

    const result = await caller.stub();
    expect(result).toEqual({ ok: true });
  });

  test("exceeded — throws TRPCError TOO_MANY_REQUESTS with reset in cause", async () => {
    const reset = Date.now() + 30_000;
    const mockLimit = rs.fn().mockResolvedValue(makeLimitResult(false, reset));
    const caller = await buildCaller({ limit: mockLimit });

    try {
      await caller.stub();
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("TOO_MANY_REQUESTS");
      expect(
        ((e as TRPCError).cause as unknown as { reset: number }).reset,
      ).toBe(reset);
    }
  });

  test("Upstash failure — fails open, console.warn called with ai-rate-limit tag", async () => {
    const mockLimit = rs.fn().mockRejectedValue(new Error("timeout"));
    const warnSpy = rs
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const caller = await buildCaller({ limit: mockLimit });

    const result = await caller.stub();
    expect(result).toEqual({ ok: true });
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0]?.[0]).toContain("ai-rate-limit");

    warnSpy.mockRestore();
  });
});
