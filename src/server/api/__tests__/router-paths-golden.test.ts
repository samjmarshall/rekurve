import { beforeAll, describe, expect, rs, test } from "@rstest/core";

/**
 * Golden invariant test (#325): pins the tRPC procedure paths the client is
 * typed and built against. A missing or renamed path is a breaking API change
 * for every deployed client bundle; any drift must be a deliberate decision,
 * never a refactor side effect.
 */

let procedurePaths: string[];

beforeAll(async () => {
  // Import-safety only — no procedure is invoked. ~/server/db does a
  // module-scope neon() that needs a real DATABASE_URL; ~/server/auth/session pulls in
  // better-auth's module-scope init; ~/env validates at import. The schema
  // modules need no mock — "server-only" resolves to the rstest alias stub and
  // their drizzle pgTable defs are side-effect-free.
  rs.doMock("~/env", () => ({ env: {} }));
  rs.doMock("~/server/db", () => ({ db: {} }));
  rs.doMock("~/server/auth/session", () => ({ getSession: rs.fn() }));

  const { appRouter } = await import("../root");
  procedurePaths = Object.keys(appRouter._def.procedures).sort();
});

describe("appRouter — golden procedure paths", () => {
  test("procedure paths are exactly the published client surface", () => {
    expect(procedurePaths).toEqual([
      "ai.healthCheck",
      "conversations.list",
      "leads.create",
      "leads.delete",
      "leads.getById",
      "leads.getByStage",
      "leads.list",
      "leads.update",
      "lots.getAll",
      "messages.approve",
      "messages.dismiss",
      "messages.editAndApprove",
      "messages.listPending",
      "messages.snooze",
    ]);
  });
});
