"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";
import { useTRPC } from "~/trpc/react";
import { ConversationItem } from "./conversation-item";

interface ConversationHistoryProps {
  leadId: string;
}

export function ConversationHistory({ leadId }: ConversationHistoryProps) {
  const trpc = useTRPC();
  const { data, isLoading, isError } = useQuery(
    trpc.conversations.list.queryOptions({ leadId }),
  );

  return (
    <Card data-testid="lead-profile-conversation-history">
      <CardHeader>
        <CardTitle className="text-xl">Conversation history</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div
            data-testid="lead-profile-conversation-history-loading"
            className="h-8 animate-pulse rounded-md bg-muted"
          />
        )}

        {isError && (
          <p
            data-testid="lead-profile-conversation-history-error"
            className="text-muted-foreground text-sm"
          >
            Couldn&apos;t load messages. Refresh to try again.
          </p>
        )}

        {!isLoading && !isError && data?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <MessageCircle
              className="size-8 text-muted-foreground/40"
              aria-hidden="true"
            />
            <p
              className="max-w-xs text-muted-foreground text-sm"
              data-testid="lead-profile-conversation-empty"
            >
              No messages yet — drafts will appear in the action queue.
            </p>
          </div>
        )}

        {!isLoading && !isError && data && data.length > 0 && (
          <ul className="flex max-h-[28rem] flex-col gap-4 overflow-y-auto">
            {data.map((item) => (
              <ConversationItem
                key={item.id}
                id={item.id}
                channel={item.channel}
                direction={item.direction}
                subject={item.subject}
                body={item.body}
                originalBody={item.originalBody}
                createdAt={item.createdAt}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
