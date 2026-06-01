"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "inngest/react";
import { useEffect } from "react";
import { useTRPC } from "~/trpc/react";
import { fetchLeadSubscriptionToken } from "./token";

export function LeadRealtimeBridge() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { messages } = useRealtime({ token: fetchLeadSubscriptionToken });

  useEffect(() => {
    const msg = messages.last;
    if (!msg) return;
    const data = msg.data as { leadId?: string } | null;
    if (!data?.leadId) return;
    void qc.invalidateQueries(
      trpc.leads.getById.queryFilter({ id: data.leadId }),
    );
    void qc.invalidateQueries(trpc.leads.getByStage.queryFilter());
  }, [messages.last, qc, trpc.leads]);

  return null;
}
