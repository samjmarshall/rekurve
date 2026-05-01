import type { Faker } from "@faker-js/faker";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "~/server/db/schema";
import { conversations } from "~/server/db/schema/conversations";
import type { leads } from "~/server/db/schema/leads";

type DB = NeonHttpDatabase<typeof schema>;
type Lead = typeof leads.$inferSelect;

const SMS_OUTBOUND = [
  "Hi {name}, just following up on your interest in {estate}. Would you like to schedule a visit?",
  "Good news! A new lot just became available in {estate} that matches your preferences.",
  "Hi {name}, we have some exciting lots in {estate} that fit your budget. When are you free to chat?",
  "Following up on our last conversation — any questions about the lots in {estate}?",
];

const SMS_INBOUND = [
  "Yes, I'd love to hear more about that lot.",
  "Can we schedule a call this week?",
  "What's the price on that one?",
  "I'm still thinking it over, will get back to you soon.",
  "That sounds great, please send me more details.",
];

const EMAIL_OUTBOUND = [
  "Just wanted to touch base regarding your interest in new home builds in the area.",
  "I have some great options available that align with your requirements.",
  "Following up on our recent conversation about the lots in {estate}.",
];

function pick<T>(arr: T[], faker: Faker): T {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })]!;
}

function renderTemplate(tpl: string, lead: Lead): string {
  return tpl
    .replace("{name}", lead.firstName)
    .replace("{estate}", lead.preferredEstates?.[0] ?? "the area");
}

export async function seed(db: DB, faker: Faker, allLeads: Lead[]) {
  const values: Array<{
    leadId: string;
    channel: "sms" | "email";
    direction: "inbound" | "outbound";
    body: string;
    createdAt: Date;
  }> = [];

  for (const lead of allLeads) {
    const count = faker.number.int({ min: 1, max: 3 });
    const channel: "sms" | "email" = faker.datatype.boolean() ? "sms" : "email";
    const baseTime = lead.createdAt.getTime();

    for (let i = 0; i < count; i++) {
      const direction: "inbound" | "outbound" =
        i % 2 === 0 ? "outbound" : "inbound";
      let body: string;
      if (channel === "sms") {
        body = renderTemplate(
          pick(direction === "outbound" ? SMS_OUTBOUND : SMS_INBOUND, faker),
          lead,
        );
      } else {
        body = renderTemplate(pick(EMAIL_OUTBOUND, faker), lead);
      }
      values.push({
        leadId: lead.id,
        channel,
        direction,
        body,
        createdAt: new Date(baseTime + i * 3_600_000),
      });
    }
  }

  return db.insert(conversations).values(values).returning();
}
