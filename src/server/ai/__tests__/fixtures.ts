import type { DraftMessageOutput } from "~/server/ai/draft-schemas";

/**
 * Shared base draft-output fixture, owned by the ai domain (home of
 * draftMessageOutputSchema) — downstream domains' tests import it from here
 * (pattern: the leads reference domain, src/server/leads/__tests__/fixtures.ts).
 * Override any fields per test — leave defaults otherwise.
 */
export function makeDraftOutput(
  overrides: Partial<DraftMessageOutput> = {},
): DraftMessageOutput {
  return {
    channel: "sms",
    subject: null,
    body: "[test] body",
    aiReasoning: "[test]",
    priority: 50,
    ...overrides,
  };
}
