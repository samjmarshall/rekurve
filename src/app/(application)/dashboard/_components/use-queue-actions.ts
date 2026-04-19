"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastManager } from "~/components/ui/toast";
import { type RouterOutputs, useTRPC } from "~/trpc/react";

type ListPending = RouterOutputs["messages"]["listPending"];

interface OptimisticContext {
  previous: ListPending | undefined;
}

/**
 * Remove a row optimistically from the cached listPending query and restore it
 * on error. Shared across every queue action.
 */
function useOptimisticRemove() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.messages.listPending.queryKey();

  return {
    async snapshot(id: string): Promise<OptimisticContext> {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ListPending>(queryKey);
      queryClient.setQueryData<ListPending>(queryKey, (old) =>
        old ? old.filter((r) => r.id !== id) : old,
      );
      return { previous };
    },
    restore(context: OptimisticContext | undefined) {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
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
      onSuccess: (data) => {
        toast.add({
          title: `Sent via ${data.channel === "sms" ? "SMS" : "email"}`,
        });
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
      onSuccess: (data) => {
        toast.add({
          title: `Sent via ${data.channel === "sms" ? "SMS" : "email"}`,
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
