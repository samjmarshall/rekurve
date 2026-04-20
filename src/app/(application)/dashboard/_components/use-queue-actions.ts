"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastManager } from "~/components/ui/toast";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

type ListPending = RouterOutputs["messages"]["listPending"];
type ListPendingRow = ListPending[number];

interface OptimisticContext {
  row: ListPendingRow | undefined;
}

// Mirror listPending's ORDER BY priority DESC, createdAt ASC so rolled-back
// rows slot back into the correct position without waiting for invalidate.
function comparePriority(a: ListPendingRow, b: ListPendingRow): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/**
 * Remove a row optimistically from the cached listPending query and restore
 * just that row on error. Sibling rows removed concurrently by other in-flight
 * mutations are preserved.
 */
function useOptimisticRemove() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.messages.listPending.queryKey();

  return {
    async snapshot(id: string): Promise<OptimisticContext> {
      await queryClient.cancelQueries({ queryKey });
      const current = queryClient.getQueryData<ListPending>(queryKey);
      const row = current?.find((r) => r.id === id);
      queryClient.setQueryData<ListPending>(queryKey, (old) =>
        old ? old.filter((r) => r.id !== id) : old,
      );
      return { row };
    },
    restore(context: OptimisticContext | undefined) {
      const row = context?.row;
      if (!row) return;
      queryClient.setQueryData<ListPending>(queryKey, (old) => {
        if (!old) return [row];
        if (old.some((r) => r.id === row.id)) return old;
        return [...old, row].sort(comparePriority);
      });
    },
    invalidate() {
      return queryClient.invalidateQueries({ queryKey });
    },
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}

export function useApproveAction() {
  const trpc = useTRPC();
  const toast = useToastManager();
  const optimistic = useOptimisticRemove();

  return useMutation(
    trpc.messages.approve.mutationOptions({
      onMutate: ({ id }) => optimistic.snapshot(id),
      onSuccess: () => {
        // Revert to "Sent via …" when dispatch lands (#129/#130)
        toast.add({ title: "Approved — will send shortly" });
      },
      onError: (err, _vars, context) => {
        optimistic.restore(context as OptimisticContext | undefined);
        toast.add({
          type: "error",
          title: "Approve failed",
          description: errorMessage(err),
        });
      },
      onSettled: () => {
        void optimistic.invalidate();
      },
    }),
  );
}

export function useDismissAction() {
  const trpc = useTRPC();
  const toast = useToastManager();
  const optimistic = useOptimisticRemove();

  return useMutation(
    trpc.messages.dismiss.mutationOptions({
      onMutate: ({ id }) => optimistic.snapshot(id),
      onSuccess: () => {
        toast.add({ title: "Draft dismissed" });
      },
      onError: (err, _vars, context) => {
        optimistic.restore(context as OptimisticContext | undefined);
        toast.add({
          type: "error",
          title: "Dismiss failed",
          description: errorMessage(err),
        });
      },
      onSettled: () => {
        void optimistic.invalidate();
      },
    }),
  );
}

export function useEditAndApproveAction() {
  const trpc = useTRPC();
  const toast = useToastManager();
  const optimistic = useOptimisticRemove();

  return useMutation(
    trpc.messages.editAndApprove.mutationOptions({
      onMutate: ({ id }) => optimistic.snapshot(id),
      onSuccess: () => {
        // Revert to "Sent via …" when dispatch lands (#129/#130)
        toast.add({
          title: "Approved — will send shortly",
          description: "Your edits were saved.",
        });
      },
      onError: (err, _vars, context) => {
        optimistic.restore(context as OptimisticContext | undefined);
        toast.add({
          type: "error",
          title: "Edit failed",
          description: errorMessage(err),
        });
      },
      onSettled: () => {
        void optimistic.invalidate();
      },
    }),
  );
}

export function useSnoozeAction() {
  const trpc = useTRPC();
  const toast = useToastManager();
  const optimistic = useOptimisticRemove();

  return useMutation(
    trpc.messages.snooze.mutationOptions({
      onMutate: ({ id }) => optimistic.snapshot(id),
      onSuccess: (data) => {
        const when = data.snoozedUntil
          ? new Date(data.snoozedUntil).toLocaleString()
          : "later";
        toast.add({ title: `Snoozed until ${when}` });
      },
      onError: (err, _vars, context) => {
        optimistic.restore(context as OptimisticContext | undefined);
        toast.add({
          type: "error",
          title: "Snooze failed",
          description: errorMessage(err),
        });
      },
      onSettled: () => {
        void optimistic.invalidate();
      },
    }),
  );
}
