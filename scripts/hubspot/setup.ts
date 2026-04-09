import "dotenv/config";

import {
  PropertyCreateFieldTypeEnum,
  PropertyCreateTypeEnum,
} from "@hubspot/api-client/lib/codegen/crm/properties/models/PropertyCreate";
import { hubspot } from "./client";

interface PropertyDefinition {
  name: string;
  label: string;
  type: PropertyCreateTypeEnum;
  fieldType: PropertyCreateFieldTypeEnum;
  description?: string;
  options?: Array<{ label: string; value: string; displayOrder: number }>;
}

const GROUP_NAME = "rekurve";

const BOOLEAN_OPTIONS = [
  { label: "Yes", value: "true", displayOrder: 0 },
  { label: "No", value: "false", displayOrder: 1 },
];

const CUSTOM_PROPERTIES: PropertyDefinition[] = [
  {
    name: "preferred_contact_time",
    label: "Preferred Contact Time",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Select,
    options: [
      { label: "Weekdays", value: "weekdays", displayOrder: 0 },
      { label: "Weekends", value: "weekends", displayOrder: 1 },
      { label: "Anytime", value: "anytime", displayOrder: 2 },
    ],
  },
  {
    name: "has_land",
    label: "Has Land",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Booleancheckbox,
    options: BOOLEAN_OPTIONS,
  },
  {
    name: "land_registered",
    label: "Land Registered",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Booleancheckbox,
    options: BOOLEAN_OPTIONS,
  },
  {
    name: "land_address",
    label: "Land Address",
    type: PropertyCreateTypeEnum.String,
    fieldType: PropertyCreateFieldTypeEnum.Text,
  },
  {
    name: "land_size_sqm",
    label: "Land Size (sqm)",
    type: PropertyCreateTypeEnum.Number,
    fieldType: PropertyCreateFieldTypeEnum.Number,
  },
  {
    name: "land_width",
    label: "Land Width (m)",
    type: PropertyCreateTypeEnum.String,
    fieldType: PropertyCreateFieldTypeEnum.Text,
  },
  {
    name: "land_depth",
    label: "Land Depth (m)",
    type: PropertyCreateTypeEnum.String,
    fieldType: PropertyCreateFieldTypeEnum.Text,
  },
  {
    name: "property_type",
    label: "Property Type",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Select,
    options: [
      { label: "Single Storey", value: "single_storey", displayOrder: 0 },
      { label: "Double Storey", value: "double_storey", displayOrder: 1 },
      { label: "Investment", value: "investment", displayOrder: 2 },
      { label: "Upsize", value: "upsize", displayOrder: 3 },
      { label: "Downsize", value: "downsize", displayOrder: 4 },
      {
        label: "First Home Buyer",
        value: "first_home_buyer",
        displayOrder: 5,
      },
    ],
  },
  {
    name: "budget",
    label: "Budget",
    type: PropertyCreateTypeEnum.String,
    fieldType: PropertyCreateFieldTypeEnum.Text,
  },
  {
    name: "seen_broker",
    label: "Seen Broker",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Booleancheckbox,
    options: BOOLEAN_OPTIONS,
  },
  {
    name: "construction_timeline",
    label: "Construction Timeline",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Select,
    options: [
      { label: "Ready Now", value: "ready_now", displayOrder: 0 },
      { label: "3-6 Months", value: "3_6_months", displayOrder: 1 },
      { label: "12+ Months", value: "12_months_plus", displayOrder: 2 },
    ],
  },
  {
    name: "resolve_finance_opted_in",
    label: "Resolve Finance Opted In",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Booleancheckbox,
    options: BOOLEAN_OPTIONS,
  },
  {
    name: "lead_score",
    label: "Rekurve Lead Score",
    type: PropertyCreateTypeEnum.Number,
    fieldType: PropertyCreateFieldTypeEnum.Number,
  },
  {
    name: "lead_stage",
    label: "Rekurve Lead Stage",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Select,
    options: [
      { label: "Unqualified", value: "unqualified", displayOrder: 0 },
      { label: "Nurture", value: "nurture", displayOrder: 1 },
      { label: "Warm", value: "warm", displayOrder: 2 },
      { label: "Hot", value: "hot", displayOrder: 3 },
    ],
  },
  {
    name: "notes",
    label: "Rekurve Notes",
    type: PropertyCreateTypeEnum.String,
    fieldType: PropertyCreateFieldTypeEnum.Textarea,
  },
  {
    name: "lead_source",
    label: "Rekurve Lead Source",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Select,
    options: [
      { label: "Walk-in", value: "walk_in", displayOrder: 0 },
      { label: "Referral", value: "referral", displayOrder: 1 },
      { label: "Social", value: "social", displayOrder: 2 },
      { label: "Web", value: "web", displayOrder: 3 },
      { label: "Other", value: "other", displayOrder: 4 },
    ],
  },
];

async function ensurePropertyGroup(): Promise<void> {
  try {
    await hubspot.crm.properties.groupsApi.create("contacts", {
      name: GROUP_NAME,
      label: "Rekurve",
    });
    console.log(`[HubSpot Setup] Created property group: ${GROUP_NAME}`);
  } catch (err: unknown) {
    if (isConflict(err)) {
      console.log(
        `[HubSpot Setup] Property group already exists: ${GROUP_NAME}`,
      );
      return;
    }
    throw err;
  }
}

async function ensureProperty(def: PropertyDefinition): Promise<void> {
  try {
    await hubspot.crm.properties.coreApi.create("contacts", {
      name: def.name,
      label: def.label,
      type: def.type,
      fieldType: def.fieldType,
      groupName: GROUP_NAME,
      ...(def.description && { description: def.description }),
      ...(def.options && {
        options: def.options.map((o) => ({ ...o, hidden: false })),
      }),
    });
    console.log(`[HubSpot Setup] Created property: ${def.name}`);
  } catch (err: unknown) {
    if (isConflict(err)) {
      console.log(`[HubSpot Setup] Property already exists: ${def.name}`);
      return;
    }
    throw err;
  }
}

function isConflict(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: number }).code === 409
  );
}

/** Provision the Rekurve property group and all custom properties. Idempotent. */
export async function ensureAllProperties(): Promise<void> {
  await ensurePropertyGroup();
  for (const def of CUSTOM_PROPERTIES) {
    await ensureProperty(def);
  }
  console.log("[HubSpot Setup] All properties ensured.");
}

// Allow running as a standalone script: yarn tsx scripts/hubspot/setup.ts
if (typeof process !== "undefined" && process.argv[1]?.endsWith("setup.ts")) {
  ensureAllProperties()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[HubSpot Setup] Failed:", err);
      process.exit(1);
    });
}
