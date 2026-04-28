"use client";

import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { type RouterOutputs, useTRPC } from "~/trpc/react";
import { ConversationHistory } from "./conversation-history";
import { LeadDetails } from "./lead-details";
import { LeadEditForm } from "./lead-edit-form";
import { ProfileHeader } from "./profile-header";
import { QualificationGaps } from "./qualification-gaps";
import { ScoreBreakdown } from "./score-breakdown";

export type Lead = RouterOutputs["leads"]["getById"];

export function LeadProfileView({ id }: { id: string }) {
  const trpc = useTRPC();
  const {
    data: lead,
    isLoading,
    isError,
  } = useQuery(trpc.leads.getById.queryOptions({ id }));

  const [isEditing, setIsEditing] = useState(false);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const exitEditing = () => {
    setIsEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  if (isLoading) {
    return (
      <div
        className="flex flex-1 items-center justify-center p-8 text-muted-foreground text-sm"
        data-testid="lead-profile-loading"
      >
        Loading lead…
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div
        className="flex flex-1 items-center justify-center p-8 text-muted-foreground text-sm"
        data-testid="lead-profile-error"
      >
        Something went wrong loading this lead. Please refresh.
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8"
      data-testid="lead-profile-view"
    >
      <ProfileHeader
        lead={lead}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        editButtonRef={editButtonRef}
      />

      {isEditing ? (
        <>
          <h2 className="sr-only">Edit Lead</h2>
          <LeadEditForm
            lead={lead}
            onCancel={exitEditing}
            onSuccess={exitEditing}
          />
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            <h2 className="sr-only">Score & Qualification</h2>
            <ScoreBreakdown lead={lead} />
            <h2 className="sr-only">Lead Information</h2>
            <LeadDetails lead={lead} />
          </div>
          <div className="flex flex-col gap-6">
            <h2 className="sr-only">Gaps & History</h2>
            <QualificationGaps lead={lead} />
            <ConversationHistory leadId={lead.id} />
          </div>
        </div>
      )}
    </div>
  );
}
