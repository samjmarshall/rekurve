import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { QuickCaptureButton } from "../_components/quick-capture/button";
import { QueueList } from "./_components/queue-list";

export const metadata: Metadata = {
  title: "Action Queue | Rekurve",
};

export default function DashboardPage() {
  prefetch(trpc.messages.listPending.queryOptions());

  return (
    <HydrateClient>
      <QueueList />
      <QuickCaptureButton />
    </HydrateClient>
  );
}
