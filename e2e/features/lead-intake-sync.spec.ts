import { expect, test } from "@playwright/test";
import { LeadFormSection } from "../pages/sections/lead-form.section";
import { LeadProfileSection } from "../pages/sections/lead-profile.section";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
  uniquePhone,
} from "../utils/auth-helper";
import {
  archiveTestContact,
  cleanupTestLeadsByPhone,
  getLeadIdByEmail,
  waitForLeadHubSpotId,
} from "../utils/hubspot-helper";
import { getSessionCookie } from "../utils/session-cookie";

// Tests in this file require HubSpot (outbox worker needs it) and an Inngest
// connection for the Realtime badge test. Run serially to limit HubSpot API
// contention.
test.describe.configure({ mode: "serial", timeout: 60_000 });

test.describe("Lead Intake — DB-first + Realtime sync", () => {
  test.skip(
    !process.env.HUBSPOT_ACCESS_TOKEN,
    "Requires HUBSPOT_ACCESS_TOKEN for the worker to stamp hubspotContactId",
  );

  let session: TestSession;
  const phones: string[] = [];
  const seededHubSpotIds: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await cleanupTestLeadsByPhone(phones);
    for (const id of seededHubSpotIds) {
      try {
        await archiveTestContact(id);
      } catch {
        // Already archived — ignore
      }
    }
    await deleteTestSession(session.userId);
  });

  test("capture returns scored row immediately; HubSpot badge transitions from Syncing to linked", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;
    const testPhone = uniquePhone();
    phones.push(testPhone);

    // Step 1: Fill and submit the lead form
    await page.goto("/leads/new");
    const form = new LeadFormSection(page);

    await form.fillStep1({
      firstName: "Intake",
      lastName: `Sync ${uniqueId}`,
      phone: testPhone,
      email: testEmail,
    });
    await form.selectSegmented("Preferred contact time", "Anytime");
    await form.clickNext();

    await form.selectSegmented("Has land", "Yes");
    await form.landAddressInput.waitFor({ state: "visible" });
    await form.selectSegmented("Land registered", "Yes");
    await form.landSqmInput.fill("450");
    await form.clickNext();

    await form.selectSegmented("Property type", "First Home Buyer");
    await form.budgetInput.fill("$650,000");
    await form.selectSegmented("Seen broker", "Yes");
    await form.selectSegmented("Construction timeline", "Ready Now");
    await form.clickNext();

    await form.clickSubmit();
    await form.expectSuccess(`Intake Sync ${uniqueId}`);

    // Step 2: Navigate to the lead profile (get id from DB)
    const leadId = await getLeadIdByEmail(testEmail);
    expect(leadId).not.toBeNull();
    await page.goto(`/leads/${leadId}`);

    const profile = new LeadProfileSection(page);
    await profile.waitForLoaded();

    // Score badge is present immediately (DB-first — scored synchronously)
    await expect(profile.scoreBadge).toBeVisible();
    const scoreText = await profile.scoreBadge.textContent();
    expect(Number(scoreText?.trim())).toBeGreaterThan(0);

    // HubSpot link starts as "Syncing…" (hubspotContactId is null at capture)
    await expect(
      page.getByTestId("lead-profile-hubspot-syncing"),
    ).toBeVisible();

    // Step 3: Wait for the worker to stamp hubspotContactId (async outbox worker)
    const hubspotId = await waitForLeadHubSpotId(testEmail);
    seededHubSpotIds.push(hubspotId);

    // Step 4: The Realtime bridge should trigger a refetch — wait for the link
    await expect(page.getByTestId("lead-profile-hubspot-link")).toBeVisible({
      timeout: 8_000,
    });
    await expect(
      page.getByTestId("lead-profile-hubspot-syncing"),
    ).not.toBeVisible();
  });
});
