import type { db } from "~/server/db";

type Db = typeof db;

export async function resolveLeadOwnerUserId(db: Db): Promise<string> {
  // MIGRATION SEAM: pre-ownership-column. When `leads.ownerId` lands (ownership
  // epic), webhook callers pass the lead's owner instead of calling this.
  const consultant = await db.query.user.findFirst({
    columns: { id: true },
    orderBy: (u, { asc }) => asc(u.createdAt),
  });
  if (!consultant) {
    throw new Error("[leads] resolveLeadOwnerUserId: no consultant user found");
  }
  return consultant.id;
}
