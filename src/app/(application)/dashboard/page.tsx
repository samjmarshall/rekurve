import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getSession } from "~/lib/session";
import { db } from "~/server/db";
import { msGraphTokens } from "~/server/db/schema";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { QuickCaptureButton } from "../_components/quick-capture/button";
import { MsGraphConnectBanner } from "./_components/ms-graph-connect-banner";
import { QueueList } from "./_components/queue-list";

export const metadata: Metadata = {
  title: "Action Queue | Rekurve",
};

export default async function DashboardPage() {
  prefetch(trpc.messages.listPending.queryOptions());

  const session = await getSession();
  const connected = session?.user
    ? !!(await db.query.msGraphTokens.findFirst({
        where: eq(msGraphTokens.userId, session.user.id),
      }))
    : true;

  return (
    <HydrateClient>
      <MsGraphConnectBanner connected={connected} />
      <QueueList />
      <QuickCaptureButton />
    </HydrateClient>
  );
}
