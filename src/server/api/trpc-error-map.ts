import "server-only";

import { TRPCError } from "@trpc/server";

import { LeadNotFoundError } from "~/server/leads/leads.errors";
import {
  EmailPreconditionError,
  MessageNotActionableError,
  MessageNotFoundError,
} from "~/server/messaging/messaging.errors";

// Domain-error → TRPCError mapping, shared by every domain's tRPC adapter
// (adr020: services throw transport-agnostic errors; adapters own their tRPC
// representation). Codes and messages are byte-identical to the pre-split
// routers' TRPCErrors — the NotActionable/Precondition messages are
// user-facing and carried verbatim. Unrecognised errors rethrow untouched.
export function toTRPCError(err: unknown): never {
  if (err instanceof MessageNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
  }
  if (err instanceof MessageNotActionableError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
  }
  if (err instanceof LeadNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  }
  if (err instanceof EmailPreconditionError) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: err.message });
  }
  throw err;
}
