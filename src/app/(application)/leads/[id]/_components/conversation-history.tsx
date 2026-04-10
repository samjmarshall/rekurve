"use client";

import { MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/Card";

export function ConversationHistory() {
  return (
    <Card data-testid="lead-profile-conversation-history">
      <CardHeader>
        <CardTitle className="text-xl">Conversation history</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <MessageCircle
            className="size-8 text-muted-foreground/40"
            aria-hidden="true"
          />
          <p className="max-w-xs text-muted-foreground text-sm">
            No messages yet — conversation history will appear here when Epic 3
            is complete.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
