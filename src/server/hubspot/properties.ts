/**
 * Bidirectional map between app field names and HubSpot contact property names.
 * Standard HubSpot properties (firstname, lastname, email, phone) use built-in names.
 * Custom properties match the names created in the HubSpot account.
 */
export const PROPERTY_MAP = {
  firstName: "firstname",
  lastName: "lastname",
  email: "email",
  phone: "phone",
  hasLand: "has_land",
  landRegistered: "land_registered",
  landAddress: "land_address",
  landSizeSqm: "land_size_sqm",
  propertyType: "property_type",
  budget: "budget",
  seenBroker: "seen_broker",
  constructionTimeline: "construction_timeline",
  resolveFinanceOptedIn: "resolve_finance_opted_in",
} as const satisfies Record<string, string>;

export type AppField = keyof typeof PROPERTY_MAP;
export type HubSpotProperty = (typeof PROPERTY_MAP)[AppField];

// Reverse map for reading HubSpot responses back to app fields
const REVERSE_MAP = Object.fromEntries(
  Object.entries(PROPERTY_MAP).map(([k, v]) => [v, k]),
) as Record<HubSpotProperty, AppField>;

/** Convert app field names to HubSpot property names. */
export function toHubSpotProperties(
  data: Partial<Record<AppField, string | boolean | null>>,
): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    const hsKey = PROPERTY_MAP[key as AppField];
    if (hsKey && value != null) {
      properties[hsKey] = String(value);
    }
  }
  return properties;
}

/** Convert HubSpot properties back to app field names. */
export function fromHubSpotProperties(
  properties: Record<string, string | null>,
): Partial<Record<AppField, string>> {
  const result: Partial<Record<AppField, string>> = {};
  for (const [key, value] of Object.entries(properties)) {
    const appKey = REVERSE_MAP[key as HubSpotProperty];
    if (appKey && value != null) {
      result[appKey] = value;
    }
  }
  return result;
}

/** All HubSpot property names to request when fetching contacts. */
export const ALL_PROPERTIES = Object.values(PROPERTY_MAP);
