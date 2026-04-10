import { TRPCError } from "@trpc/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getQueryClient, HydrateClient, trpc } from "~/trpc/server";
import { LeadProfileView } from "./_components/lead-profile-view";

export const metadata: Metadata = {
  title: "Lead | Rekurve",
};

export default async function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = getQueryClient();

  try {
    await queryClient.fetchQuery(trpc.leads.getById.queryOptions({ id }));
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  return (
    <HydrateClient>
      <LeadProfileView id={id} />
    </HydrateClient>
  );
}
