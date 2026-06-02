import { expect, test } from "@playwright/test";
import { LeadFormSection } from "../pages/sections/lead-form.section";
import {
  createTestSession,
  deleteTestSession,
  type TestSession,
  uniquePhone,
} from "../utils/auth-helper";
import {
  archiveTestContact,
  cleanupTestLeadsByPhone,
  createTestContact,
  findContactByEmail,
  getLeadHubSpotId,
  getTestContactById,
  waitForContactProperty,
  waitForLeadHubSpotId,
} from "../utils/hubspot-helper";
import { getSessionCookie } from "../utils/session-cookie";

// Tests in this file mutate the shared HubSpot account and DB. Run them
// sequentially within a single worker to limit HubSpot API contention.
// Cleanup is phone-scoped (per afterAll) rather than a blanket sweep so it
// does not race with concurrent tests on other spec files that also use the
// `Pipeline`/`E2E`/`Quick`/etc. first-name markers — globalTeardown handles
// any residue at run end.
//
// Timeout is doubled because each test does 2-3 HubSpot API roundtrips and
// the local dev server is heavily contended by parallel workers in dev.
test.describe.configure({ mode: "serial", timeout: 60_000 });

test.describe("HubSpot Outbound Sync — E2E", () => {
  test.skip(!process.env.HUBSPOT_ACCESS_TOKEN, "Requires HUBSPOT_ACCESS_TOKEN");

  let session: TestSession;
  const phones: string[] = [];
  const seededContactIds: string[] = [];

  test.beforeAll(async () => {
    session = await createTestSession();
  });

  test.afterAll(async () => {
    await cleanupTestLeadsByPhone(phones);
    for (const id of seededContactIds) {
      try {
        await archiveTestContact(id);
      } catch {
        // Already archived — ignore
      }
    }
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
    phones.push(testPhone);

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

    // Lead sync is now async (DB-first outbox worker) — wait for the stamp
    await waitForLeadHubSpotId(testEmail);

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
    test.setTimeout(75_000); // Seed webhook + outbound dedup patch latency

    await context.addCookies([getSessionCookie(session.signedToken, baseURL!)]);

    const uniqueId = Date.now().toString(36);
    const testEmail = `e2e-${uniqueId}@test.rekurve.dev`;
    const seedPhone = uniquePhone();
    const formPhone = uniquePhone();
    phones.push(seedPhone, formPhone);

    // Seed: create a contact in HubSpot first
    const seeded = await createTestContact({
      firstname: "Existing",
      lastname: "Contact",
      email: testEmail,
      phone: seedPhone,
    });
    seededContactIds.push(seeded.id);

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

    // The dedup update lands on the OUTBOUND path. Do NOT gate on
    // waitForLeadHubSpotId(email): in prod, seeding the contact above fires a
    // real `contact.creation` webhook that ingests a lead with
    // hubspotContactId pre-stamped (hubspotSync:false), satisfying that id gate
    // before the outbound "Updated" patch runs — so the assertion would race
    // ahead and read the contact while it is still "Existing". Gate on the
    // genuine end-state instead: poll the seeded contact until the patch lands.
    await waitForContactProperty(seeded.id, "firstname", "Updated");

    // Verify: the existing contact was UPDATED in place. Read by id — getById
    // is read-after-write consistent, whereas findContactByEmail's Search API
    // lags ~30s re-indexing the changed firstname and returns the stale
    // "Existing" value (the seed's original name).
    const contact = await getTestContactById(seeded.id);
    expect(contact.properties.firstname).toBe("Updated");
    expect(contact.properties.lastname).toBe(`Dedup ${uniqueId}`);

    // Verify: the app linked the lead to the EXISTING contact (dedup) instead
    // of creating a duplicate — the local lead carries the seeded id.
    const hubspotId = await getLeadHubSpotId(testEmail);
    expect(hubspotId).toBe(seeded.id);
  });
});

// Inbound HubSpot → local sync (contact.propertyChange / contact.deletion) is
// intentionally NOT honoured: the local DB is canonical and those webhook arms
// were dropped in #288 (ADR-013). The drop is covered deterministically by the
// webhook unit tests (src/app/api/hubspot/webhook/__tests__/route.test.ts:
// "contact.propertyChange/deletion returns 200 with no DB writes"). The E2E
// tests that asserted the old inbound-edit/-delete behaviour were removed here.
