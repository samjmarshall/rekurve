import { expect, test } from "@playwright/test";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
} from "../utils/auth-helper";
import { getSessionCookie } from "../utils/session-cookie";

test.describe("tRPC — Unauthenticated", () => {
  test("protected procedure returns UNAUTHORIZED without session", async ({
    request,
  }) => {
    const response = await request.get("/api/trpc/leads.getAll");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error.json.data.code).toBe("UNAUTHORIZED");
  });
});

test.describe("tRPC — Authenticated", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await deleteTestSession(session.userId);
  });

  const stubs = [
    { endpoint: "leads.getAll", expected: [] },
    { endpoint: "lots.getAll", expected: [] },
    { endpoint: "messages.getPending", expected: [] },
    { endpoint: "nurture.getActive", expected: [] },
    { endpoint: "ai.healthCheck", expected: { status: "ok" } },
  ];

  for (const { endpoint, expected } of stubs) {
    test(`${endpoint} returns expected stub data`, async ({
      context,
      baseURL,
    }) => {
      await context.addCookies([
        getSessionCookie(session.signedToken, baseURL!),
      ]);

      const response = await context.request.get(`/api/trpc/${endpoint}`);
      expect(response.ok()).toBe(true);

      const body = await response.json();
      expect(body.result.data.json).toEqual(expected);
    });
  }
});
