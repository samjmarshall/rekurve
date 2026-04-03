import { test } from "@playwright/test";

test.describe("Leads CRUD — E2E", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Requires direct DB access — skipped in CI",
  );

  test("create a lead via the full enquiry form and verify it appears in the pipeline", () => {
    test.fixme();
  });

  test("create a lead via quick capture and verify stage defaults to unqualified", () => {
    test.fixme();
  });

  test("update a lead's details and verify changes persist on reload", () => {
    test.fixme();
  });

  test("delete a lead and verify it is removed from the pipeline", () => {
    test.fixme();
  });

  test("filter the lead list by stage and verify correct results", () => {
    test.fixme();
  });

  test("pipeline board displays leads grouped by stage (unqualified, nurture, warm, hot)", () => {
    test.fixme();
  });

  test("Zod validation errors surface in the UI when submitting invalid form data", () => {
    test.fixme();
  });
});
