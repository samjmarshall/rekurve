import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";
import type { createCaller } from "../root";

type Caller = ReturnType<typeof createCaller>;

beforeEach(() => {
  rs.resetModules();

  // Mock env to avoid missing env vars
  rs.doMock("~/env", () => ({
    env: {
      DATABASE_URL: "postgres://mock",
      HUBSPOT_ACCESS_TOKEN: "mock",
      HUBSPOT_CLIENT_SECRET: "mock",
    },
  }));

  // Mock db — routers don't query the DB yet (stubs)
  rs.doMock("~/server/db", () => ({
    db: {},
  }));

  // Default: unauthenticated (null session)
  rs.doMock("~/lib/session", () => ({
    getSession: rs.fn().mockResolvedValue(null),
  }));
});

describe("tRPC — Unauthenticated", () => {
  test("protected procedure throws UNAUTHORIZED without session", async () => {
    const { createCaller } = await import("../root");
    const { createTRPCContext } = await import("../trpc");

    const ctx = await createTRPCContext({ headers: new Headers() });
    const caller = createCaller(ctx);

    try {
      await caller.leads.getAll();
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});

describe("tRPC — Authenticated", () => {
  beforeEach(() => {
    rs.doMock("~/lib/session", () => ({
      getSession: rs.fn().mockResolvedValue({
        user: { id: "test-user-id", email: "test@example.com", name: "Test" },
        session: { id: "test-session-id" },
      }),
    }));
  });

  const stubs = [
    {
      name: "leads.getAll",
      call: (c: Caller) => c.leads.getAll(),
      expected: [],
    },
    { name: "lots.getAll", call: (c: Caller) => c.lots.getAll(), expected: [] },
    {
      name: "messages.getPending",
      call: (c: Caller) => c.messages.getPending(),
      expected: [],
    },
    {
      name: "nurture.getActive",
      call: (c: Caller) => c.nurture.getActive(),
      expected: [],
    },
    {
      name: "ai.healthCheck",
      call: (c: Caller) => c.ai.healthCheck(),
      expected: { status: "ok" },
    },
  ];

  for (const { name, call, expected } of stubs) {
    test(`${name} returns expected stub data`, async () => {
      const { createCaller } = await import("../root");
      const { createTRPCContext } = await import("../trpc");

      const ctx = await createTRPCContext({ headers: new Headers() });
      const caller = createCaller(ctx);

      const result = await call(caller);
      expect(result).toEqual(expected);
    });
  }
});
