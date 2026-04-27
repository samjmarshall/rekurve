import { TRPCError } from "@trpc/server";
import type { leads, messageQueue } from "~/server/db/schema";

type MessageRow = typeof messageQueue.$inferSelect;
type Lead = typeof leads.$inferSelect;

/**
 * Fast-fail email preconditions so that failures leave the queue row at its
 * current status rather than approved.
 *
 * Checks run *before* `dispatchEmail` and *before* the status update, so any
 * throw here keeps the row in its prior (pending / snoozed) state.
 */
export function checkEmailPreconditions(lead: Pick<Lead, "email">): void {
  if (!lead.email) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This lead has no email address. Add an email before sending.",
    });
  }
}

/**
 * Dispatch an email for a message-queue row.
 *
 * **Must be called BEFORE the status update** so that any failure (network,
 * auth, API error) leaves the row in its current non-terminal state and the
 * user can retry.
 *
 * On success the caller is responsible for flipping the row to
 * approved / edited_and_approved and setting `sentAt`.
 */
export async function dispatchEmail(opts: {
  message: Pick<MessageRow, "id" | "subject" | "body" | "channel">;
  lead: Pick<Lead, "id" | "email">;
}): Promise<void> {
  checkEmailPreconditions(opts.lead);

  // TODO(ENG-130): call MS Graph /me/sendMail and BCC HubSpot portal address.
  // The actual implementation will:
  //   1. Retrieve/refresh the user's MS Graph access token.
  //   2. POST /me/sendMail with subject, body, and BCC.
  //   3. On 2xx return; on 4xx/5xx throw so the row stays pending.
  // For now this is a no-op placeholder — non-email channels skip dispatch
  // entirely.
}
