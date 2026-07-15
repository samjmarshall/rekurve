import "server-only";

import type {
  LeadCreate,
  LeadFilter,
  LeadUpdate,
  PipelineFilters,
} from "~/domain/leads/schemas";
import {
  decideCaptureFromHubspot,
  decideCaptureLead,
  decideUpdateLead,
} from "./leads.decide";
import { LeadNotFoundError } from "./leads.errors";
import type { LeadsRepository } from "./leads.repository";
import type { LeadRow } from "./leads.schema";

type LeadCtx = { userId: string };

// The decide fns are pure: the service injects the two nondeterministic deps
// (id generation here, the clock as `now` at each call site).
const decideCtx = (ctx: LeadCtx) => ({
  ...ctx,
  newId: () => crypto.randomUUID(),
});

// Domain service (adr020): write flows are load → guard → decide → commit →
// return the post-scoring row (adr006 — mutations return the fresh row).
// Throws domain errors (leads.errors.ts) — never transport errors; adapters
// map them.
export function makeLeadsService({ repo }: { repo: LeadsRepository }) {
  async function captureLead(
    input: LeadCreate,
    ctx: LeadCtx,
  ): Promise<LeadRow> {
    const existing = input.email
      ? await repo.findByEmail(input.email)
      : undefined;
    const { write, events } = decideCaptureLead(
      input,
      existing,
      decideCtx(ctx),
      new Date(),
    );
    const [row] = await repo.commit([write], events);
    return row!;
  }

  async function captureLeadFromHubspot(
    hubspotContactId: string,
    properties: Partial<LeadRow>,
    ctx: LeadCtx,
  ): Promise<LeadRow> {
    const existing = await repo.findByHubspotContactId(hubspotContactId);
    const { write, events } = decideCaptureFromHubspot(
      hubspotContactId,
      properties,
      existing,
      decideCtx(ctx),
      new Date(),
    );
    const [row] = await repo.commit([write], events);
    return row;
  }

  async function updateLead(
    id: string,
    patch: Omit<LeadUpdate, "id">,
    ctx: LeadCtx,
  ): Promise<LeadRow> {
    const existing = await repo.findById(id);
    if (!existing) {
      throw new LeadNotFoundError(id);
    }
    const { write, events } = decideUpdateLead(
      existing,
      patch,
      ctx,
      new Date(),
    );
    const [updated] = await repo.commit([write], events);
    if (!updated) {
      // ORDERING NOTE (accepted deviation from pre-split intake.ts): in the
      // concurrent-delete race the guarded UPDATE matches 0 rows but the
      // outbox rows still committed, and commitWithOutbox fast-path-sends
      // them BEFORE this guard throws — at HEAD the throw preceded the send
      // and the hourly sweep delivered the same rows later. Safe under
      // at-least-once delivery + idempotent fanout; timing-only difference.
      throw new LeadNotFoundError(id);
    }
    return updated;
  }

  // Pass-through/orchestrating reads (adr020 collapse rule): the designated
  // home for future role-scoping — do not "optimize away" the service hop.
  function getById(id: string) {
    return repo.findById(id);
  }

  /** Shapes the repository's plain {rows, total} into the pagination envelope. */
  async function list(filter: LeadFilter) {
    const { rows, total } = await repo.list(filter);
    return {
      items: rows,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  /** Buckets the score-ordered rows into the Pipeline Board's stage lanes. */
  async function getByStage(filters: PipelineFilters) {
    const rows = await repo.listByStage(filters);
    return {
      unqualified: rows.filter((l) => l.leadStage === "unqualified"),
      nurture: rows.filter((l) => l.leadStage === "nurture"),
      warm: rows.filter((l) => l.leadStage === "warm"),
      hot: rows.filter((l) => l.leadStage === "hot"),
    };
  }

  function deleteLead(id: string) {
    return repo.deleteById(id);
  }

  async function resolveOwnerUserId(): Promise<string> {
    // MIGRATION SEAM: pre-ownership-column. When `leads.ownerId` lands (ownership
    // epic), webhook callers pass the lead's owner instead of calling this.
    const consultant = await repo.firstUserCreated();
    if (!consultant) {
      throw new Error(
        "[leads] resolveLeadOwnerUserId: no consultant user found",
      );
    }
    return consultant.id;
  }

  // Cross-domain ports — other domains consume leads through these, never the
  // repository (adr020: repository is not exported from the module).

  /** hubspot worker port: guarded stamp of the synced contact id (no outbox event). */
  async function stampHubspotContactId(
    leadId: string,
    hubspotContactId: string,
  ): Promise<void> {
    await repo.commit([{ kind: "stamp", id: leadId, hubspotContactId }], []);
  }

  /** messaging dispatch port: contact details for an outbound send. */
  function getLeadContact(leadId: string) {
    return repo.getContact(leadId);
  }

  return {
    captureLead,
    captureLeadFromHubspot,
    updateLead,
    getById,
    list,
    getByStage,
    deleteLead,
    resolveOwnerUserId,
    stampHubspotContactId,
    getLeadContact,
  };
}

export type LeadsService = ReturnType<typeof makeLeadsService>;
