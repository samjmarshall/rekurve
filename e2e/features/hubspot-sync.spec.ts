import { expect, test } from "@playwright/test";
import { LeadFormSection } from "../pages/sections/lead-form.section";
import {
  createTestSession,
  deleteTestLeads,
  deleteTestSession,
  type TestSession,
  uniquePhone,
} from "../utils/auth-helper";
import {
  archiveTestContact,
  createTestContact,
  deleteTestContacts,
  findContactByEmail,
  getLeadHubSpotId,
  updateTestContact,
  waitForLeadDeletion,
  waitForLeadField,
} from "../utils/hubspot-helper";
import { getSessionCookie } from "../utils/session-cookie";

// Tests in this file mutate the shared HubSpot account and DB. Run them
// sequentially within a single worker so beforeAll/afterAll cleanup runs
// once per describe — preventing workers from wiping each other's data.
//
// Timeout is doubled because each test does 2-3 HubSpot API roundtrips and
// the local dev server is heavily contended by parallel workers in dev.
test.describe.configure({ mode: "serial", timeout: 60_000 });

test.describe("HubSpot Outbound Sync — E2E", () => {
  test.skip(
    !process.env.HUBSPOT_ACCESS_TOKEN || !process.env.DATABASE_URL,
    "Requires HUBSPOT_ACCESS_TOKEN and DATABASE_URL — skipped in CI",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
    // Clean up any leftover test contacts from previous runs
    await deleteTestContacts();
    await deleteTestLeads();
  });

  test.afterAll(async () => {
    await deleteTestContacts();
    await deleteTestLeads();
    await deleteTestSession(session.userId);
  });

  test("creating a lead produces a HubSpot contact with matching properties", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;
    const testPhone = uniquePhone();

    await page.goto("/leads/new");
    const form = new LeadFormSection(page);

    // Step 1: Contact
    await form.fillStep1({
      firstName: "HubSpot",
      lastName: `Sync ${uniqueId}`,
      phone: testPhone,
      email: testEmail,
    });
    await form.selectSegmented("Preferred contact time", "Anytime");
    await form.clickNext();

    // Step 2: Land
    await form.selectSegmented("Has land", "Yes");
    await form.landAddressInput.waitFor({ state: "visible" });
    await form.selectSegmented("Land registered", "Yes");
    await form.landAddressInput.fill("42 Test Ave");
    await form.landSqmInput.fill("500");
    await form.landWidthInput.fill("20");
    await form.landDepthInput.fill("25");
    await form.clickNext();

    // Step 3: Build
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.budgetInput.fill("$700,000");
    await form.selectSegmented("Seen broker", "Yes");
    await form.selectSegmented("Construction timeline", "Ready Now");
    await form.clickNext();

    // Step 4: Additional
    await form.notesTextarea.fill("E2E HubSpot sync test");
    await form.clickSubmit();
    await form.expectSuccess(`HubSpot Sync ${uniqueId}`);

    // Verify: contact exists in HubSpot with correct properties
    const contact = await findContactByEmail(testEmail);
    expect(contact).not.toBeNull();
    expect(contact!.properties.firstname).toBe("HubSpot");
    expect(contact!.properties.lastname).toBe(`Sync ${uniqueId}`);
    expect(contact!.properties.email).toBe(testEmail);
    expect(contact!.properties.phone).toBe(testPhone);
    expect(contact!.properties.has_land).toBe("true");
    expect(contact!.properties.land_address).toBe("42 Test Ave");
    expect(contact!.properties.land_size_sqm).toBe("500");
    expect(contact!.properties.land_width).toBe("20");
    expect(contact!.properties.land_depth).toBe("25");
    expect(contact!.properties.property_type).toBe("first_home_buyer");
    expect(contact!.properties.budget).toBe("$700,000");
    expect(contact!.properties.construction_timeline).toBe("ready_now");
    expect(contact!.properties.notes).toBe("E2E HubSpot sync test");
    expect(contact!.properties.preferred_contact_time).toBe("anytime");

    // Verify: local lead has hubspotContactId
    const hubspotId = await getLeadHubSpotId(testEmail);
    expect(hubspotId).toBe(contact!.id);
  });

  test("creating a lead with an existing HubSpot email updates instead of duplicating", async ({
    context,
    page,
    baseURL,
  }) => {
    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;
    const seedPhone = uniquePhone();
    const formPhone = uniquePhone();

    // Seed: create a contact in HubSpot first
    const seeded = await createTestContact({
      firstname: "Existing",
      lastname: "Contact",
      email: testEmail,
      phone: seedPhone,
    });

    // Create a lead in the app with the same email
    await page.goto("/leads/new");
    const form = new LeadFormSection(page);

    await form.fillStep1({
      firstName: "Updated",
      lastName: `Dedup ${uniqueId}`,
      phone: formPhone,
      email: testEmail,
    });
    await form.clickNext();

    // Step 2: minimal land info
    await form.selectSegmented("Has land", "No");
    await form.clickNext();

    // Step 3: minimal build info
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.clickNext();

    // Step 4: submit
    await form.clickSubmit();
    await form.expectSuccess(`Updated Dedup ${uniqueId}`);

    // Verify: the seeded contact was UPDATED, not a new one created
    const contact = await findContactByEmail(testEmail);
    expect(contact).not.toBeNull();
    expect(contact!.id).toBe(seeded.id); // Same contact ID — not a duplicate
    expect(contact!.properties.firstname).toBe("Updated");
    expect(contact!.properties.lastname).toBe(`Dedup ${uniqueId}`);

    // Verify: local lead references the same HubSpot contact
    const hubspotId = await getLeadHubSpotId(testEmail);
    expect(hubspotId).toBe(seeded.id);
  });
});

test.describe("HubSpot Inbound Sync — E2E", () => {
  test.skip(
    !process.env.HUBSPOT_ACCESS_TOKEN ||
      !process.env.DATABASE_URL ||
      !process.env.HUBSPOT_WEBHOOK_ACTIVE,
    "Requires HUBSPOT_ACCESS_TOKEN, DATABASE_URL, and HUBSPOT_WEBHOOK_ACTIVE — only against production (webhook target is production-only)",
  );

  let session: TestSession;

  test.beforeAll(async () => {
    session = await createTestSession();
    await deleteTestContacts();
    await deleteTestLeads();
  });

  test.afterAll(async () => {
    await deleteTestContacts();
    await deleteTestLeads();
    await deleteTestSession(session.userId);
  });

  test("editing a contact's phone in HubSpot updates the local lead", async ({
    context,
    page,
    baseURL,
  }) => {
    test.setTimeout(60_000); // Webhook latency

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;

    // Step 1: Create a lead via the app (establishes the HubSpot link)
    await page.goto("/leads/new");
    const form = new LeadFormSection(page);
    await form.fillStep1({
      firstName: "Inbound",
      lastName: `Phone ${uniqueId}`,
      phone: uniquePhone(),
      email: testEmail,
    });
    await form.clickNext();
    await form.selectSegmented("Has land", "No");
    await form.clickNext();
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.clickNext();
    await form.clickSubmit();
    await form.expectSuccess(`Inbound Phone ${uniqueId}`);

    // Step 2: Get the hubspotContactId from the local DB
    const hubspotId = await getLeadHubSpotId(testEmail);
    expect(hubspotId).not.toBeNull();

    // Step 3: Update the contact's phone in HubSpot directly
    await updateTestContact(hubspotId!, { phone: "0499999999" });

    // Step 4: Wait for the webhook to update the local lead
    await waitForLeadField(testEmail, "phone", "0499999999");
  });

  test("deleting a contact in HubSpot removes the local lead", async ({
    context,
    page,
    baseURL,
  }) => {
    test.setTimeout(60_000); // Webhook latency

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;

    // Step 1: Create a lead via the app
    await page.goto("/leads/new");
    const form = new LeadFormSection(page);
    await form.fillStep1({
      firstName: "Inbound",
      lastName: `Delete ${uniqueId}`,
      phone: uniquePhone(),
      email: testEmail,
    });
    await form.clickNext();
    await form.selectSegmented("Has land", "No");
    await form.clickNext();
    await form.selectSegmented("Property type", "First Home Buyer");
    await form.clickNext();
    await form.clickSubmit();
    await form.expectSuccess(`Inbound Delete ${uniqueId}`);

    // Step 2: Get the hubspotContactId
    const hubspotId = await getLeadHubSpotId(testEmail);
    expect(hubspotId).not.toBeNull();

    // Step 3: Archive the contact in HubSpot
    await archiveTestContact(hubspotId!);

    // Step 4: Wait for the webhook to delete the local lead
    await waitForLeadDeletion(testEmail);
  });
});
