import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import { TRPCError } from "@trpc/server";
import {
  type RootCaller as Caller,
  getRootCaller,
  mockTrpcContextDeps,
} from "./caller-harness";

beforeEach(() => {
  rs.resetModules();

  // Default: unauthenticated (null session)
  mockTrpcContextDeps({ session: null });

  // Mock db — minimal shape for any stub queries
  rs.doMock("~/server/db", () => ({
    db: {
      query: {},
    },
  }));
});

describe("tRPC — Unauthenticated", () => {
  test("protected procedure throws UNAUTHORIZED without session", async () => {
    const caller = await getRootCaller();

    try {
      await caller.leads.getByStage();
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });
});

describe("tRPC — Authenticated", () => {
  beforeEach(() => {
    mockTrpcContextDeps();
  });

  // Routers with dedicated tests aren't re-covered here: per-domain routers
  // test next to their domain (src/server/leads/__tests__/leads.router.test.ts);
  // not-yet-migrated ones in *-router.test.ts alongside this file.
  const stubs = [
    { name: "lots.getAll", call: (c: Caller) => c.lots.getAll(), expected: [] },
    {
      name: "ai.healthCheck",
      call: (c: Caller) => c.ai.healthCheck(),
      expected: { status: "ok" },
    },
  ];

  for (const { name, call, expected } of stubs) {
    test(`${name} returns expected stub data`, async () => {
      const caller = await getRootCaller();

      const result = await call(caller);
      expect(result).toEqual(expected);
    });
  }
});
