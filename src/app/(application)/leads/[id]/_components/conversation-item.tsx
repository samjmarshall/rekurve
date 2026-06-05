"use client";

import { ChevronDown, ChevronUp, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/Badge";
import { formatLastContact } from "~/lib/format-relative-time";
import {
  channelIcon,
  directionLabel,
  wasEdited,
} from "../_lib/conversation-display";

const ICON_MAP = {
  MessageSquare,
  Mail,
} as const;

interface ConversationItemProps {
  id: string;
  channel: "sms" | "email" | "imessage";
  direction: "inbound" | "outbound";
  subject: string | null;
  body: string;
  originalBody: string | null;
  createdAt: Date | string;
}

export function ConversationItem({
  id,
  channel,
  direction,
  subject,
  body,
  originalBody,
  createdAt,
}: ConversationItemProps) {
  const [expanded, setExpanded] = useState(false);

  const isOutbound = direction === "outbound";
  const edited = wasEdited({ originalBody, body });
  const iconKey = channelIcon(channel);
  const Icon = ICON_MAP[iconKey];
  const disclosureId = `lead-profile-conversation-original-${id}`;

  return (
    <li
      className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
      data-testid={`lead-profile-conversation-item-${id}`}
    >
      <div
        className={`flex max-w-[85%] flex-col gap-1 ${isOutbound ? "items-end" : "items-start"}`}
      >
        {/* Header: icon + direction + timestamp */}
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Icon className="size-3.5" aria-hidden="true" />
          <span>{directionLabel(direction)}</span>
          <span aria-hidden="true">·</span>
          <time
            dateTime={
              typeof createdAt === "string"
                ? createdAt
                : createdAt.toISOString()
            }
          >
            {formatLastContact(createdAt)}
          </time>
        </div>

        {/* Bubble */}
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            isOutbound ? "bg-primary/5" : "bg-muted"
          }`}
        >
          {/* Email subject */}
          {channel === "email" && subject != null && (
            <p className="mb-1 truncate font-semibold text-xs">{subject}</p>
          )}

          {/* Body */}
          <p className="whitespace-pre-wrap break-words">{body}</p>

          {/* Edited disclosure */}
          {edited && (
            <div className="mt-2">
              <Badge
                variant="outline"
                className="cursor-pointer p-0"
                data-testid={`lead-profile-conversation-edited-pill-${id}`}
              >
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={disclosureId}
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs"
                >
                  Edited
                  {expanded ? (
                    <ChevronUp className="size-3" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-3" aria-hidden="true" />
                  )}
                </button>
              </Badge>

              {expanded && (
                <div
                  id={disclosureId}
                  data-testid={`lead-profile-conversation-original-${id}`}
                  className="mt-2 rounded-md bg-muted px-3 py-2"
                >
                  <p className="mb-1 font-medium text-muted-foreground text-xs">
                    Original draft
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {originalBody}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
