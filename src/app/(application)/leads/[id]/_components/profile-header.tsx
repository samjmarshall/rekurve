"use client";

import { ArrowLeft, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Badge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { buttonVariants } from "~/components/ui/button-variants";
import { cn } from "~/lib/utils";
import { formatLastContacted, stageLabel, stageTone } from "../_lib/display";
import type { Lead } from "./lead-profile-view";

interface ProfileHeaderProps {
  lead: Lead;
  isEditing: boolean;
  onEdit: (() => void) | undefined;
}

export function ProfileHeader({ lead, isEditing, onEdit }: ProfileHeaderProps) {
  const fullName = `${lead.firstName} ${lead.lastName}`.trim();

  return (
    <header
      className="flex flex-col gap-4 border-b pb-4"
      data-testid="lead-profile-header"
    >
      <div className="flex items-center gap-3">
        <Link
          href="/pipeline"
          aria-label="Back to pipeline"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "size-9 p-0",
          })}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1
          className="flex-1 font-semibold text-lg"
          data-testid="lead-profile-name"
        >
          {fullName}
        </h1>
        {!isEditing && (
          <Button
            variant="outline"
            size="md"
            onClick={onEdit}
            disabled={!onEdit}
            data-testid="lead-profile-edit-btn"
          >
            Edit
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-2 text-sm hover:text-primary"
              data-testid="lead-profile-phone"
            >
              <Phone className="size-4" aria-hidden="true" />
              <span>{lead.phone}</span>
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-2 text-sm hover:text-primary"
              data-testid="lead-profile-email"
            >
              <Mail className="size-4" aria-hidden="true" />
              <span>{lead.email}</span>
            </a>
          )}
          <p className="text-muted-foreground text-xs">
            Last contacted:{" "}
            <span data-testid="lead-profile-last-contacted">
              {formatLastContacted(lead.lastContactedAt)}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-20 flex-col items-center justify-center rounded-full border-2 text-center",
              "border-primary/30 bg-primary/5",
            )}
            data-testid="lead-profile-score-badge"
            aria-label={`Lead score ${lead.leadScore ?? 0} out of 100`}
          >
            <span className="font-bold text-2xl text-primary tabular-nums">
              {lead.leadScore ?? 0}
            </span>
            <span className="text-muted-foreground text-xs">/ 100</span>
          </div>
          <Badge
            variant={stageTone(lead.leadStage)}
            className="px-3 py-1 text-sm"
            data-testid="lead-profile-stage"
          >
            {stageLabel(lead.leadStage)}
          </Badge>
        </div>
      </div>
    </header>
  );
}
