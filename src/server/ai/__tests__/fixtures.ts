import type { LeadRow } from "../schema";

/**
 * Shared base lead fixture. Override any fields per test — leave defaults
 * otherwise. `leadStage` defaults to "unqualified" to match the DB default.
 */
export function makeLead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    hubspotContactId: null,
    firstName: "Jane",
    lastName: "Doe",
    email: null,
    phone: null,
    preferredContactTime: null,
    hasLand: null,
    landRegistered: null,
    landAddress: null,
    landSizeSqm: null,
    landWidth: null,
    landDepth: null,
    propertyType: null,
    budget: null,
    seenBroker: null,
    constructionTimeline: null,
    leadScore: 0,
    leadStage: "unqualified",
    scoreMetadata: null,
    preferredEstates: null,
    preferredSuburbs: null,
    leadSource: null,
    referrerName: null,
    notes: null,
    resolveFinanceOptedIn: false,
    createdAt: new Date("2026-04-01T00:00:00Z"),
    updatedAt: new Date("2026-04-01T00:00:00Z"),
    lastContactedAt: null,
    ...overrides,
  };
}
