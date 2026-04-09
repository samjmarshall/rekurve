import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter";
import { hubspot } from "./client";
import {
  ALL_PROPERTIES,
  type AppField,
  fromHubSpotProperties,
  toHubSpotProperties,
} from "./properties";

export type ContactData = Partial<Record<AppField, string | boolean | null>>;

export interface HubSpotContact {
  id: string;
  properties: Partial<Record<AppField, string>>;
  createdAt: string;
  updatedAt: string;
}

function mapContact(response: {
  id: string;
  properties: Record<string, string | null>;
  createdAt: Date;
  updatedAt: Date;
}): HubSpotContact {
  return {
    id: response.id,
    properties: fromHubSpotProperties(response.properties),
    createdAt: response.createdAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  };
}

/** Create a contact in HubSpot. Returns the mapped contact. */
export async function createContact(
  data: ContactData,
): Promise<HubSpotContact> {
  const response = await hubspot.crm.contacts.basicApi.create({
    properties: toHubSpotProperties(data),
    associations: [],
  });
  return mapContact(response);
}

/** Fetch a contact by HubSpot ID. */
export async function getContact(hubspotId: string): Promise<HubSpotContact> {
  const response = await hubspot.crm.contacts.basicApi.getById(
    hubspotId,
    ALL_PROPERTIES,
  );
  return mapContact(response);
}

/** Update a contact's properties. */
export async function updateContact(
  hubspotId: string,
  data: ContactData,
): Promise<HubSpotContact> {
  const response = await hubspot.crm.contacts.basicApi.update(hubspotId, {
    properties: toHubSpotProperties(data),
  });
  return mapContact(response);
}

/** Search contacts by email, name, or other query string. */
export async function searchContacts(query: string): Promise<HubSpotContact[]> {
  const response = await hubspot.crm.contacts.searchApi.doSearch({
    query,
    properties: ALL_PROPERTIES,
    limit: 20,
    after: "0",
    sorts: ["-createdate"],
    filterGroups: [],
  });
  return response.results.map(mapContact);
}

/** Search for an existing HubSpot contact by email or phone (for dedup on create). */
export async function findExistingContact(
  email?: string | null,
  phone?: string | null,
): Promise<HubSpotContact | null> {
  if (email) {
    const match = await findByFilter("email", email);
    if (match) return match;
  }
  if (phone) {
    const match = await findByFilter("phone", phone);
    if (match) return match;
  }
  return null;
}

async function findByFilter(
  propertyName: string,
  value: string,
): Promise<HubSpotContact | null> {
  const response = await hubspot.crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [{ propertyName, operator: FilterOperatorEnum.Eq, value }],
      },
    ],
    properties: ALL_PROPERTIES,
    limit: 1,
    after: "0",
    sorts: [],
  });
  return response.results.length > 0 ? mapContact(response.results[0]!) : null;
}
