import { z } from "zod";

// Enum schemas — mirror values from src/server/db/schema/enums.ts
export const propertyTypeSchema = z.enum([
  "single_storey",
  "double_storey",
  "investment",
  "upsize",
  "downsize",
  "first_home_buyer",
]);

export const constructionTimelineSchema = z.enum([
  "ready_now",
  "3_6_months",
  "12_months_plus",
]);

export const leadStageSchema = z.enum([
  "unqualified",
  "nurture",
  "warm",
  "hot",
]);

export const leadSourceSchema = z.enum([
  "walk_in",
  "referral",
  "social",
  "web",
  "other",
]);

export const preferredContactTimeSchema = z.enum([
  "weekdays",
  "weekends",
  "anytime",
]);

// Full form create schema — only firstName/lastName required
export const leadCreateSchema = z.object({
  // Contact — required
  firstName: z
    .string({ error: "First name is required" })
    .min(1, "First name is required")
    .max(100),
  lastName: z
    .string({ error: "Last name is required" })
    .min(1, "Last name is required")
    .max(100),
  // Contact — optional
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(20).nullish(),
  preferredContactTime: preferredContactTimeSchema.nullish(),
  // Land
  hasLand: z.boolean().nullish(),
  landRegistered: z.boolean().nullish(),
  landAddress: z.string().max(500).nullish(),
  landSizeSqm: z.string().nullish(),
  landWidth: z.string().nullish(),
  landDepth: z.string().nullish(),
  // Qualification
  propertyType: propertyTypeSchema.nullish(),
  budget: z.string().max(100).nullish(),
  seenBroker: z.boolean().nullish(),
  constructionTimeline: constructionTimelineSchema.nullish(),
  // Preferences
  preferredEstates: z.array(z.string()).nullish(),
  preferredSuburbs: z.array(z.string()).nullish(),
  // Source
  leadSource: leadSourceSchema.nullish(),
  referrerName: z.string().max(200).nullish(),
  notes: z.string().max(5000).nullish(),
  // Resolve Finance
  resolveFinanceOptedIn: z.boolean().nullish(),
});

// Quick capture — name + phone required
export const leadQuickCaptureSchema = z.object({
  firstName: z
    .string({ error: "First name is required" })
    .min(1, "First name is required")
    .max(100),
  lastName: z
    .string({ error: "Last name is required" })
    .min(1, "Last name is required")
    .max(100),
  phone: z
    .string({ error: "Phone number is required" })
    .min(1, "Phone number is required")
    .max(20),
  notes: z.string().max(5000).nullish(),
  leadSource: leadSourceSchema.nullish(),
});

// Partial update — all fields optional except id
export const leadUpdateSchema = leadCreateSchema.partial().extend({
  id: z.string().uuid(),
  leadScore: z.number().int().min(0).max(100).nullish(),
  leadStage: leadStageSchema.optional(),
});

// Filter/pagination for leads.list
export const leadFilterSchema = z.object({
  stage: leadStageSchema.nullish(),
  constructionTimeline: constructionTimelineSchema.nullish(),
  preferredEstate: z.string().nullish(),
  fhogEligible: z.boolean().nullish(),
  // Pagination
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  // Sorting
  sortBy: z
    .enum(["createdAt", "updatedAt", "leadScore", "lastName"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Type exports for form components
export type LeadCreate = z.infer<typeof leadCreateSchema>;
export type LeadQuickCapture = z.infer<typeof leadQuickCaptureSchema>;
export type LeadUpdate = z.infer<typeof leadUpdateSchema>;
export type LeadFilter = z.infer<typeof leadFilterSchema>;
