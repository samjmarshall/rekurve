export const MIN_BUFFER_MS = 15 * 60 * 1000;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type SnoozeValidation =
  | { ok: true; date: Date }
  | { ok: false; error: string };

export function validateSnoozeTime(
  value: string,
  now: Date = new Date(),
  minBufferMs: number = MIN_BUFFER_MS,
): SnoozeValidation {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Pick a valid date and time." };
  }
  if (parsed.getTime() < now.getTime() + minBufferMs) {
    return {
      ok: false,
      error: "Snooze time must be at least 15 minutes from now.",
    };
  }
  return { ok: true, date: parsed };
}

/**
 * Returns the next Monday at 09:00 local time relative to `from`. If `from`
 * is already a Monday, jumps a full week ahead so the chip always advances.
 */
export function nextMonday9am(from: Date = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay();
  const offset = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
  d.setDate(d.getDate() + offset);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
