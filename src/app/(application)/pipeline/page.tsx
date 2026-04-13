import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "~/trpc/server";
import { PipelineBoard } from "./_components/pipeline-board";
import { parseFiltersFromSearchParams } from "./_lib/filters";

export const metadata: Metadata = {
  title: "Pipeline | Rekurve",
};

interface PipelinePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PipelinePage({
  searchParams,
}: PipelinePageProps) {
  const params = await searchParams;
  const filters = parseFiltersFromSearchParams(params);
  prefetch(trpc.leads.getByStage.queryOptions(filters));

  return (
    <HydrateClient>
      <PipelineBoard />
    </HydrateClient>
  );
}
