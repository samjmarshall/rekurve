import "server-only";

// Domain errors (adr020): the service throws transport-agnostic errors; each
// adapter maps them — the tRPC router to TRPCError NOT_FOUND, the HubSpot
// webhook swallows under its always-200 posture (adr004).
export class LeadNotFoundError extends Error {
  constructor(readonly leadId: string) {
    super(`Lead ${leadId} not found`);
    this.name = "LeadNotFoundError";
  }
}
