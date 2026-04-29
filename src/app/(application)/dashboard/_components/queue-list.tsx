"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { useTRPC } from "~/trpc/react";
import { DraftRow } from "./draft-row";

function DraftRowSkeleton() {
  return (
    <li>
      <div className="rounded-lg border bg-card p-4 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-1 items-center gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-8 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:flex md:justify-end">
          <div className="h-9 animate-pulse rounded bg-muted md:w-24" />
          <div className="h-9 animate-pulse rounded bg-muted md:w-24" />
          <div className="h-9 animate-pulse rounded bg-muted md:w-24" />
          <div className="h-9 animate-pulse rounded bg-muted md:w-24" />
        </div>
      </div>
    </li>
  );
}

export function QueueList() {
  const trpc = useTRPC();
  const { data, isLoading, isError, refetch } = useQuery(
    trpc.messages.listPending.queryOptions(),
  );
  const rows = data ?? [];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 data-testid="queue-heading" className="font-semibold text-xl">
          Action Queue
        </h1>
        <span
          data-testid="queue-count"
          aria-live="polite"
          aria-atomic="true"
          className="rounded-full bg-foreground/10 px-2.5 py-0.5 font-medium text-foreground text-xs"
        >
          {rows.length}
        </span>
      </header>

      {isLoading ? (
        <ul
          data-testid="queue-loading"
          className="mx-auto w-full max-w-2xl space-y-3 p-4 pb-24 md:pb-4"
        >
          <DraftRowSkeleton />
          <DraftRowSkeleton />
          <DraftRowSkeleton />
        </ul>
      ) : isError ? (
        <div data-testid="queue-error" className="mx-auto w-full max-w-2xl p-4">
          <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="font-medium text-sm">Couldn&apos;t load drafts</p>
              <p className="mt-1 text-muted-foreground text-sm">
                Something went wrong fetching your action queue.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              data-testid="queue-retry"
              onClick={() => void refetch()}
            >
              Try again
            </Button>
          </div>
        </div>
      ) : rows.length === 0 ? (
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
          aria-label="Pending drafts"
          className="mx-auto w-full max-w-2xl space-y-3 p-4 pb-24 md:pb-4"
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
