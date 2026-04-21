import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "~/env";
import { db } from "~/server/db";
import { nurtureSequences } from "~/server/db/schema";

export async function POST(request: Request) {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({}, { status: 404 });
  }

  const body = (await request.json()) as unknown;
  const result = z.object({ sequenceId: z.string().uuid() }).safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid sequenceId" }, { status: 400 });
  }

  const { sequenceId } = result.data;
  const backdated = new Date(Date.now() - 60_000);

  await db
    .update(nurtureSequences)
    .set({ nextStepAt: backdated, updatedAt: new Date() })
    .where(eq(nurtureSequences.id, sequenceId));

  return NextResponse.json({
    advanced: true,
    nextStepAt: backdated.toISOString(),
  });
}
