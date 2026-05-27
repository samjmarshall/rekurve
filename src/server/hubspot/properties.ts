import type { leads } from "~/server/db/schema/leads";

const PROPERTY_MAP = {
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
  preferredContactTime: "preferred_contact_time",
  landWidth: "land_width",
  landDepth: "land_depth",
  leadScore: "lead_score",
  leadStage: "lead_stage",
  notes: "notes",
  leadSource: "lead_source",
} as const satisfies Record<string, string>;

export type AppField = keyof typeof PROPERTY_MAP;
export type HubSpotProperty = (typeof PROPERTY_MAP)[AppField];

// Reverse map for reading HubSpot responses back to app fields
const REVERSE_MAP = Object.fromEntries(
  Object.entries(PROPERTY_MAP).map(([k, v]) => [v, k]),
) as Record<HubSpotProperty, AppField>;

const BOOLEAN_FIELDS: ReadonlySet<string> = new Set<AppField>([
  "hasLand",
  "landRegistered",
  "seenBroker",
  "resolveFinanceOptedIn",
]);

const INTEGER_FIELDS: ReadonlySet<string> = new Set<AppField>(["leadScore"]);

/** Coerce a HubSpot string value to the app's expected type for a given field. */
function coerceFromHubSpot(
  field: AppField,
  value: string,
): string | boolean | number {
  if (BOOLEAN_FIELDS.has(field)) return value === "true";
  if (INTEGER_FIELDS.has(field)) return parseInt(value, 10);
  return value;
}

/** All HubSpot property names to request when fetching contacts. */
export const ALL_PROPERTIES = Object.values(PROPERTY_MAP);

/** Raw HubSpot wire format: property names as strings, values as strings. */
export type HubSpotContactProperties = Record<string, string>;

/** Convert app-keyed lead data to HubSpot wire format, stringifying all values. */
export function toContactProperties(
  input: Partial<Record<AppField, unknown>>,
): HubSpotContactProperties {
  const properties: HubSpotContactProperties = {};
  for (const [key, value] of Object.entries(input)) {
    const hsKey = PROPERTY_MAP[key as AppField];
    if (hsKey && value != null) {
      properties[hsKey] = String(value);
    }
  }
  return properties;
}

/** Convert HubSpot wire properties to app-keyed lead fields with type coercion. */
export function fromContactProperties(
  hubspotProps: Record<string, unknown>,
): Partial<typeof leads.$inferSelect> {
  const result: Record<string, string | boolean | number> = {};
  for (const [key, value] of Object.entries(hubspotProps)) {
    const appKey = REVERSE_MAP[key as HubSpotProperty];
    if (appKey && value != null) {
      result[appKey] = coerceFromHubSpot(appKey, String(value));
    }
  }
  return result as Partial<typeof leads.$inferSelect>;
}
