import type { Faker } from "@faker-js/faker";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "~/server/db/schema";
import type { leads } from "~/server/db/schema/leads";
import { messageQueue } from "~/server/db/schema/message-queue";

type DB = NeonHttpDatabase<typeof schema>;
type Lead = typeof leads.$inferSelect;

const SMS_DRAFTS = [
  "Hi {name}, just wanted to check in about {estate}. Are you still interested?",
  "Great news! A lot matching your criteria just became available. Want to take a look?",
  "Hi {name}, following up on our last chat. Have you had a chance to review the options?",
  "Just a quick reminder that the lot we discussed in {estate} is still available.",
  "Hi {name}, I have a few new lots that might suit you. When's a good time to chat?",
];

function renderDraft(tpl: string, lead: Lead): string {
  return tpl
    .replace("{name}", lead.firstName)
    .replace("{estate}", lead.preferredEstates?.[0] ?? "the area");
}

function pick<T>(arr: T[], faker: Faker): T {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })]!;
}

export async function seed(db: DB, faker: Faker, allLeads: Lead[]) {
  const shuffled = faker.helpers.shuffle([...allLeads]);
  const now = Date.now();

  const values: Array<{
    leadId: string;
    channel: "sms";
    body: string;
    originalBody?: string;
    priority: number;
    status: "pending" | "approved" | "edited_and_approved" | "snoozed";
    snoozedUntil?: Date | null;
    approvedAt?: Date | null;
    sentAt?: Date | null;
  }> = [];

  // 10 pending
  for (let i = 0; i < 10; i++) {
    const lead = shuffled[i % shuffled.length]!;
    const body = renderDraft(pick(SMS_DRAFTS, faker), lead);
    values.push({
      leadId: lead.id,
      channel: "sms",
      body,
      priority: faker.number.int({ min: 0, max: 3 }),
      status: "pending",
    });
  }

  // 6 snoozed: 3 past, 3 future
  for (let i = 0; i < 6; i++) {
    const lead = shuffled[(10 + i) % shuffled.length]!;
    const body = renderDraft(pick(SMS_DRAFTS, faker), lead);
    const isPast = i < 3;
    const snoozedUntil = isPast
      ? new Date(now - faker.number.int({ min: 1, max: 48 }) * 3_600_000)
      : new Date(now + faker.number.int({ min: 1, max: 48 }) * 3_600_000);
    values.push({
      leadId: lead.id,
      channel: "sms",
      body,
      priority: faker.number.int({ min: 0, max: 3 }),
      status: "snoozed",
      snoozedUntil,
    });
  }

  // 5 approved (3 plain, 2 with edited body)
  for (let i = 0; i < 5; i++) {
    const lead = shuffled[(16 + i) % shuffled.length]!;
    const original = renderDraft(pick(SMS_DRAFTS, faker), lead);
    const isEdited = i >= 3;
    const body = isEdited ? `${original} — edited by Sam` : original;
    const approvedAt = new Date(
      now - faker.number.int({ min: 1, max: 12 }) * 3_600_000,
    );
    values.push({
      leadId: lead.id,
      channel: "sms",
      body,
      originalBody: isEdited ? original : undefined,
      priority: faker.number.int({ min: 0, max: 3 }),
      status: isEdited ? "edited_and_approved" : "approved",
      approvedAt,
    });
  }

  // 4 approved + sentAt (effectively dispatched)
  for (let i = 0; i < 4; i++) {
    const lead = shuffled[(21 + i) % shuffled.length]!;
    const body = renderDraft(pick(SMS_DRAFTS, faker), lead);
    const sentAt = new Date(
      now - faker.number.int({ min: 1, max: 24 }) * 3_600_000,
    );
    values.push({
      leadId: lead.id,
      channel: "sms",
      body,
      priority: faker.number.int({ min: 0, max: 3 }),
      status: "approved",
      approvedAt: new Date(sentAt.getTime() - 600_000),
      sentAt,
    });
  }

  return db.insert(messageQueue).values(values).returning();
}
