/**
 * Seed data for manual validation of ENG-166 (SMS share-sheet pivot).
 *
 * Usage:
 *   yarn tsx scripts/seed-preview-166.ts              # seed
 *   yarn tsx scripts/seed-preview-166.ts --cleanup <lead-id>  # teardown
 *
 * DATABASE_URL must point at the target Neon branch.
 * Pull preview env: vercel env pull --environment=preview
 * Or pass inline: DATABASE_URL=$(vc env pull --stdout) yarn tsx ...
 *
 * Seeded scenarios (all under one lead "Jane Smith"):
 *   1. SMS — short body   → approve via share sheet / drawer (basic path)
 *   2. SMS — long body    → overflow fade gradient visible in drawer
 *   3. SMS — pending edit → Edit & Approve flow (dialog → drawer → approve)
 *   4. Email — pending    → verify email approve path is untouched
 */

import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

const cleanupArg = process.argv.indexOf("--cleanup");
if (cleanupArg !== -1) {
  const leadId = process.argv[cleanupArg + 1];
  if (!leadId) {
    console.error("--cleanup requires a lead id");
    process.exit(1);
  }
  // message_queue and conversations cascade on lead delete
  await sql`DELETE FROM "leads" WHERE id = ${leadId}::uuid`;
  console.log(`Cleaned up lead ${leadId} (cascaded messages + conversations).`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

const SHORT_BODY =
  "Hi Jane! Just checking in — have you had a chance to review the Harmony floor plan we discussed? Happy to answer any questions or book a time to walk through it together. Let me know what works best for you!";

const LONG_BODY = `Hi Jane,

I wanted to follow up on our conversation about the Meridian 32 display home last week. Based on what you shared about your block in Ripley, I think the Meridian would work really well with a few modifications to the alfresco.

Here's a quick summary of what we talked about:
- Double-storey, 4 bed / 2 bath / 2 car
- Rear alfresco extended to 4 m depth
- Powder room relocated to ground floor
- Optional butler's pantry behind kitchen

Your block is 14 m wide so the standard facade sits comfortably within the setback. The extended alfresco shouldn't need a planning variance given your council's 6 m rear setback rule.

I can have a preliminary quote ready by Thursday. Would that timing work for you?`;

const leadId = randomUUID();
const smsShortId = randomUUID();
const smsLongId = randomUUID();
const smsPendingEditId = randomUUID();
const emailId = randomUUID();

// Lead
await sql`
  INSERT INTO "leads" (id, first_name, last_name, lead_score, lead_stage)
  VALUES (${leadId}, 'Jane', 'Smith', 72, 'warm')
`;

// SMS — short body (scenario 1)
await sql`
  INSERT INTO "message_queue" (id, lead_id, channel, body, ai_reasoning, priority, status)
  VALUES (
    ${smsShortId},
    ${leadId},
    'sms',
    ${SHORT_BODY},
    'High engagement: opened last two emails, visited floor plan page twice this week.',
    80,
    'pending'
  )
`;

// SMS — long body (scenario 2)
await sql`
  INSERT INTO "message_queue" (id, lead_id, channel, body, ai_reasoning, priority, status)
  VALUES (
    ${smsLongId},
    ${leadId},
    'sms',
    ${LONG_BODY},
    'Lead has not responded in 5 days; detailed follow-up may re-engage.',
    60,
    'pending'
  )
`;

// SMS — pending edit (scenario 3: use Edit & Approve from the dashboard)
await sql`
  INSERT INTO "message_queue" (id, lead_id, channel, body, ai_reasoning, priority, status)
  VALUES (
    ${smsPendingEditId},
    ${leadId},
    'sms',
    'Hi Jane, just a quick note — our Ripley display village is open this Saturday 10am–4pm. Worth a visit if you''re free!',
    'Event-based nudge: display village open day this weekend.',
    70,
    'pending'
  )
`;

// Email (scenario 4)
await sql`
  INSERT INTO "message_queue" (id, lead_id, channel, subject, body, ai_reasoning, priority, status)
  VALUES (
    ${emailId},
    ${leadId},
    'email',
    'Your Meridian 32 quote is ready',
    'Hi Jane,\n\nGreat news — I''ve put together a preliminary quote for the Meridian 32 with the alfresco extension we discussed. I''ve attached it here for your review.\n\nHappy to jump on a call this week to walk through the numbers. Just reply and we''ll find a time.\n\nBest,\nSam',
    'Quote ready — high-intent trigger.',
    90,
    'pending'
  )
`;

console.log(`
✓ Seeded ENG-166 preview data
  Lead:            Jane Smith  (${leadId})
  SMS short:       ${smsShortId}  — basic approve path
  SMS long:        ${smsLongId}  — overflow fade test
  SMS edit:        ${smsPendingEditId}  — Edit & Approve flow
  Email:           ${emailId}  — email path (should be untouched)

To clean up:
  yarn tsx scripts/seed-preview-166.ts --cleanup ${leadId}
`);
