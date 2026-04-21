import { NextResponse } from "next/server";

import { env } from "~/env";
import { db } from "~/server/db";
import { runSchedulerTick } from "~/server/nurture/scheduler";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSchedulerTick(db);
  return NextResponse.json(result);
}
