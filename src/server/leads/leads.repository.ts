import "server-only";

import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import type { LeadFilter, PipelineFilters } from "~/domain/leads/schemas";
import type { db as defaultDb } from "~/server/db";
import type { OutboxEventDescriptor } from "~/server/inngest/events";
import type { CommitWithOutbox } from "~/server/outbox/commit";
import type { LeadWrite } from "./leads.decide";
import type { LeadInsert, LeadRow } from "./leads.schema";
import { leads } from "./leads.schema";

type Db = typeof defaultDb;
type BatchItem = Parameters<CommitWithOutbox>[0][number];

/** Per-variant result of the write door: row-returning writes hand back the
 * fresh row from `.returning()`; fire-and-forget writes return void. */
type LeadCommitResult<W extends LeadWrite> = W extends {
  kind: "insert" | "upsert";
}
  ? LeadRow
  : W extends { kind: "update" }
    ? LeadRow | undefined
    : W extends { kind: "delete" }
      ? Pick<LeadRow, "id"> | undefined
      : undefined;

/** Positional result tuple of the plural write door: one entry per write, in
 * write order (batch results align with statements; outbox inserts trail). */
type LeadCommitResults<Ws extends readonly LeadWrite[]> = {
  [K in keyof Ws]: LeadCommitResult<Ws[K]>;
};

// The one shared pipeline-filter builder (used by list + listByStage). The
// FHOG business rule is stated here once: fhogEligible ⇒ propertyType =
// 'first_home_buyer'.
function pipelineFilterConditions(filters: NonNullable<PipelineFilters>) {
  const conditions: SQL[] = [];
  if (filters.constructionTimeline)
    conditions.push(
      eq(leads.constructionTimeline, filters.constructionTimeline),
    );
  if (filters.fhogEligible)
    conditions.push(eq(leads.propertyType, "first_home_buyer"));
  if (filters.preferredEstate)
    conditions.push(
      sql`${filters.preferredEstate} = ANY(${leads.preferredEstates})`,
    );
  return conditions;
}

// The only leads file that builds Drizzle statements (adr020): plain-data
// reads plus the single atomic write door, `commit(writes, events)`, which
// lands canonical rows and outbox rows in one db.batch via commitWithOutbox.
// Statements target the domain-owned `leads` table, with one annotated
// exception (`firstUserCreated` — see its MIGRATION SEAM note).
export function makeLeadsRepository({
  db,
  commitWithOutbox,
}: {
  db: Db;
  commitWithOutbox: CommitWithOutbox;
}) {
  function findById(id: string) {
    return db.query.leads.findFirst({ where: eq(leads.id, id) });
  }

  function findByEmail(email: string) {
    return db.query.leads.findFirst({
      where: eq(leads.email, email),
      columns: { id: true, leadStage: true },
    });
  }

  function findByHubspotContactId(hubspotContactId: string) {
    return db.query.leads.findFirst({
      where: eq(leads.hubspotContactId, hubspotContactId),
      columns: { id: true, leadStage: true },
    });
  }

  /** Contact details for an outbound send — email is all the port exposes. */
  function getContact(id: string) {
    return db.query.leads.findFirst({
      where: eq(leads.id, id),
      columns: { email: true },
    });
  }

  async function list(filter: LeadFilter) {
    const { page, limit, sortBy, sortOrder, stage, ...pipeline } = filter;
    const offset = (page - 1) * limit;

    const conditions = pipelineFilterConditions(pipeline);
    if (stage) conditions.push(eq(leads.leadStage, stage));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const orderFn = sortOrder === "asc" ? asc : desc;

    const [rows, countResult] = await Promise.all([
      db.query.leads.findMany({
        where,
        orderBy: orderFn(leads[sortBy]),
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(leads).where(where),
    ]);

    return { rows, total: Number(countResult[0]?.count ?? 0) };
  }

  function listByStage(filters: PipelineFilters) {
    const conditions = pipelineFilterConditions(filters ?? {});
    return db.query.leads.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: desc(leads.leadScore),
    });
  }

  function firstUserCreated() {
    // MIGRATION SEAM (#289, service.resolveOwnerUserId): pre-ownership-column
    // read of the auth-owned `user` table — the one statement in this file
    // that isn't a lead statement. When `leads.ownerId` lands, callers pass
    // the lead's owner and this read is deleted.
    return db.query.user.findFirst({
      columns: { id: true },
      orderBy: (u, { asc: ascFn }) => ascFn(u.createdAt),
    });
  }

  // Imperative CRUD — still terminates in the write door (adr020: commit is
  // the only write door); no outbox event today, keep it that way.
  async function deleteById(id: string) {
    const [deleted] = await commit([{ kind: "delete", id }], []);
    return deleted;
  }

  /** One write descriptor → one Drizzle statement. insert/upsert/update carry
   * `.returning()` (adr006 — mutations return the row), delete returns only
   * `{ id }`; stamp is guarded on `hubspotContactId IS NULL`, so a
   * concurrently-stamped id is never overwritten (the lead-hubspot-sync
   * worker's idempotency fence — src/server/hubspot/hubspot.worker.ts). */
  function toStatement(write: LeadWrite): BatchItem {
    switch (write.kind) {
      case "insert":
        return db.insert(leads).values(write.record).returning();
      case "upsert":
        return db
          .insert(leads)
          .values(write.record)
          .onConflictDoUpdate({
            target: leads.hubspotContactId,
            set: write.record as Partial<LeadInsert>,
          })
          .returning();
      case "update":
        return db
          .update(leads)
          .set(write.set)
          .where(eq(leads.id, write.id))
          .returning();
      case "stamp":
        return db
          .update(leads)
          .set({ hubspotContactId: write.hubspotContactId })
          .where(and(eq(leads.id, write.id), isNull(leads.hubspotContactId)));
      case "delete":
        return db
          .delete(leads)
          .where(eq(leads.id, write.id))
          .returning({ id: leads.id });
    }
  }

  /** The plural atomic write door (adr020's recorded signature): ALL mapped
   * statements plus the outbox inserts land in ONE db.batch. Results map
   * positionally onto `writes` — commitWithOutbox returns batch results
   * aligned with its statements (outbox rows trail), so index i of the batch
   * is write i, and only returning-carrying writes surface rows (a
   * returning-less stamp never pretends to carry rows). */
  async function commit<const Ws extends readonly LeadWrite[]>(
    writes: Ws,
    events: readonly OutboxEventDescriptor[],
  ): Promise<LeadCommitResults<Ws>> {
    const results = await commitWithOutbox(writes.map(toStatement), events);
    return writes.map((write, i) => {
      switch (write.kind) {
        case "insert":
        case "upsert":
        case "update":
          return (results[i] as LeadRow[])[0];
        case "delete":
          return (results[i] as Pick<LeadRow, "id">[])[0];
        default:
          return undefined;
      }
    }) as LeadCommitResults<Ws>;
  }

  return {
    findById,
    findByEmail,
    findByHubspotContactId,
    getContact,
    list,
    listByStage,
    firstUserCreated,
    deleteById,
    commit,
  };
}

export type LeadsRepository = ReturnType<typeof makeLeadsRepository>;
