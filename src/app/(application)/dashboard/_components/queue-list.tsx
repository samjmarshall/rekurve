"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { DraftRow } from "./draft-row";

export function QueueList() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.messages.listPending.queryOptions());
  const rows = data ?? [];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-semibold text-lg">Action Queue</h1>
        <span
          data-testid="queue-count"
          className="rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs"
        >
          {rows.length}
        </span>
      </header>

      {rows.length === 0 ? (
        <div
          data-testid="queue-empty"
          className="flex flex-1 items-center justify-center p-4"
        >
          <div className="text-center">
            <Inbox
              size={48}
              className="mx-auto mb-4 text-muted-foreground/50"
            />
            <h2 className="font-semibold text-lg">You&apos;re all caught up</h2>
            <p className="mt-1 max-w-sm text-muted-foreground text-sm">
              We&apos;ll let you know when new follow-ups are ready to review.
            </p>
          </div>
        </div>
      ) : (
        <ul
          data-testid="queue-list"
          className="mx-auto w-full max-w-2xl space-y-3 p-4"
        >
          {rows.map((row) => (
            <li key={row.id}>
              <DraftRow row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
