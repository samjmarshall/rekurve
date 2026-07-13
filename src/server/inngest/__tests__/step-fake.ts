import { rs } from "@rstest/core";

/**
 * Shared inline-run Inngest step fakes for worker tests: `step.run(id, fn)`
 * invokes `fn` immediately (no memoisation), recording the byte-stable step
 * ids so tests can pin them.
 *
 * Build a FRESH step per test (call the factory inside the test body) — a
 * describe-level instance would have its mocks cleared/restored between
 * tests, leaving step.run returning undefined.
 */
export function makeStep() {
  return {
    run: rs.fn().mockImplementation((_id: string, fn: () => unknown) => fn()),
  };
}

/**
 * Richer variant for workers that block on `step.waitForEvent`: the wait
 * resolves with `waitResult` (pass null to simulate an Inngest timeout).
 */
export function makeWaitingStep(waitResult: unknown) {
  return {
    ...makeStep(),
    waitForEvent: rs.fn().mockResolvedValue(waitResult),
  };
}
