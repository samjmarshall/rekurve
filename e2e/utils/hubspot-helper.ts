import { Client } from "@hubspot/api-client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter.js";
import { type NeonQueryFunction, neon } from "@neondatabase/serverless";

import "dotenv/config";

// Lazy — only initialized when a function is called
let _hubspot: Client | undefined;
function hubspot() {
  _hubspot ??= new Client({
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
    numberOfApiCallRetries: 3,
  });
  return _hubspot;
}

let _sql: NeonQueryFunction<false, false> | undefined;
function sql() {
  _sql ??= neon(process.env.DATABASE_URL!);
  return _sql;
}

const ALL_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "has_land",
  "land_registered",
  "land_address",
  "land_size_sqm",
  "property_type",
  "budget",
  "seen_broker",
  "construction_timeline",
  "resolve_finance_opted_in",
  "preferred_contact_time",
  "land_width",
  "land_depth",
  "lead_score",
  "lead_stage",
  "notes",
  "lead_source",
];

export interface TestContact {
  id: string;
  properties: Record<string, string | null>;
}

/** Search for a contact by email. Returns null if not found. */
export async function findContactByEmail(
  email: string,
): Promise<TestContact | null> {
  const response = await hubspot().crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          {
            propertyName: "email",
            operator: FilterOperatorEnum.Eq,
            value: email,
          },
        ],
      },
    ],
    properties: ALL_PROPERTIES,
    limit: 1,
    after: "0",
    sorts: [],
  });
  if (response.results.length === 0) return null;
  const c = response.results[0]!;
  return {
    id: c.id,
    properties: c.properties as Record<string, string | null>,
  };
}

/** Create a contact in HubSpot for test seeding. */
export async function createTestContact(
  properties: Record<string, string>,
): Promise<TestContact> {
  const response = await hubspot().crm.contacts.basicApi.create({
    properties,
    associations: [],
  });
  return {
    id: response.id,
    properties: response.properties as Record<string, string | null>,
  };
}

/** Update a contact's property in HubSpot. */
export async function updateTestContact(
  hubspotId: string,
  properties: Record<string, string>,
): Promise<void> {
  await hubspot().crm.contacts.basicApi.update(hubspotId, { properties });
}

/** Archive (soft-delete) a contact in HubSpot. */
export async function archiveTestContact(hubspotId: string): Promise<void> {
  await hubspot().crm.contacts.basicApi.archive(hubspotId);
}

/**
 * Delete HubSpot contacts created by E2E tests. Catches two patterns:
 *   - Full-form / inbound-sync tests: email containing `test.rekurve.dev`
 *   - Quick-capture tests: firstname `Quick` + lastname containing `Capture`
 *     (quick capture has no email field, so the email filter can't find them)
 *
 * `filterGroups` are OR'd, filters within a group are AND'd.
 */
export async function deleteTestContacts(): Promise<void> {
  const response = await hubspot().crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          {
            propertyName: "email",
            operator: FilterOperatorEnum.ContainsToken,
            value: "test.rekurve.dev",
          },
        ],
      },
      {
        filters: [
          {
            propertyName: "firstname",
            operator: FilterOperatorEnum.Eq,
            value: "Quick",
          },
          {
            propertyName: "lastname",
            operator: FilterOperatorEnum.ContainsToken,
            value: "Capture",
          },
        ],
      },
    ],
    properties: ["email"],
    limit: 100,
    after: "0",
    sorts: [],
  });

  for (const contact of response.results) {
    try {
      await hubspot().crm.contacts.basicApi.archive(contact.id);
    } catch {
      // Already deleted — ignore
    }
  }
}

/**
 * Poll the local DB until a lead matching the email has the expected value,
 * or until the timeout expires. For verifying inbound webhook processing.
 */
export async function waitForLeadField(
  email: string,
  field: string,
  expected: string,
  timeoutMs = 30_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await sql()`
      SELECT * FROM "leads" WHERE email = ${email} LIMIT 1
    `;
    if (rows.length > 0 && String(rows[0]![field]) === expected) {
      return;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(
    `Timed out waiting for leads.${field} = "${expected}" (email: ${email})`,
  );
}

/**
 * Poll the local DB until a lead matching the email no longer exists.
 * For verifying inbound webhook deletion.
 */
export async function waitForLeadDeletion(
  email: string,
  timeoutMs = 30_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await sql()`
      SELECT id FROM "leads" WHERE email = ${email} LIMIT 1
    `;
    if (rows.length === 0) return;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(`Timed out waiting for lead deletion (email: ${email})`);
}

/** Read the hubspot_contact_id for a lead from the local DB. */
export async function getLeadHubSpotId(email: string): Promise<string | null> {
  const rows = await sql()`
    SELECT hubspot_contact_id FROM "leads" WHERE email = ${email} LIMIT 1
  `;
  return rows.length > 0
    ? (rows[0]!.hubspot_contact_id as string | null)
    : null;
}
