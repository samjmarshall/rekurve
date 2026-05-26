import { describe, expect, rs, test } from "@rstest/core";

// Hoist mocks before route.ts module loads to prevent DB/session connections.
rs.mock("~/env", () => ({
  env: { NODE_ENV: "test" },
}));
rs.mock("~/server/api/root", () => ({ appRouter: {} }));
rs.mock("~/server/api/trpc", () => ({ createTRPCContext: rs.fn() }));

import { responseMeta } from "../route";

describe("responseMeta", () => {
  test("no errors — returns empty object", () => {
    const result = responseMeta({ errors: [] });
    expect(result).toEqual({});
  });

  test("error without cause.reset — returns empty object", () => {
    const result = responseMeta({ errors: [{ cause: undefined }] });
    expect(result).toEqual({});
  });

  test("error with cause.reset ~30s in future — returns Retry-After header as ceil of seconds", () => {
    const reset = Date.now() + 30_000;
    const result = responseMeta({
      errors: [{ cause: { reset } }],
    });
    expect(result).toHaveProperty("headers");
    const retryAfter = (result as { headers: Headers }).headers.get(
      "Retry-After",
    );
    expect(retryAfter).toMatch(/^\d+$/);
    const seconds = parseInt(retryAfter!, 10);
    expect(seconds).toBeGreaterThanOrEqual(1);
    expect(seconds).toBeLessThanOrEqual(30);
  });
});
