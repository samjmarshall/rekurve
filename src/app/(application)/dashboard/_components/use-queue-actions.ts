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

// Sentinel that matches the server-side PRECONDITION_FAILED message for a
// disconnected Microsoft account. Used to show an actionable "Connect" toast.
const MS_NOT_CONNECTED_MSG = "Connect your Microsoft account to send emails.";

type ToastAdd = ReturnType<typeof useToastManager>["add"];
type ToastOptions = Parameters<ToastAdd>[0];

function buildErrorToast(err: unknown, defaultTitle: string): ToastOptions {
  const msg = errorMessage(err);
  const isNotConnected = msg === MS_NOT_CONNECTED_MSG;
  return {
    type: "error",
    title: isNotConnected ? "Microsoft account not connected" : defaultTitle,
    description: isNotConnected
      ? "Connect your account to send emails from Outlook."
      : msg,
    timeout: 20_000,
    ...(isNotConnected && {
      actionProps: {
        children: "Connect",
        onClick() {
          window.location.href = "/api/auth/ms-graph/start";
        },
      },
    }),
  };
}

export function useApproveAction() {
  const trpc = useTRPC();
  const toast = useToastManager();
  const optimistic = useOptimisticRemove();

  return useMutation(
    trpc.messages.approve.mutationOptions({
      onMutate: ({ id }) => optimistic.snapshot(id),
      onSuccess: (data) => {
        if (data.channel === "email") {
          toast.add({ title: "Sent via email" });
        } else {
          toast.add({
            title: "Sent to your phone",
            description: "Forward it to the lead from Messages.",
          });
        }
      },
      onError: (err, _vars, context) => {
        optimistic.restore(context as OptimisticContext | undefined);
        toast.add(buildErrorToast(err, "Approve failed"));
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
          timeout: 20_000,
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
        if (data.channel === "email") {
          toast.add({
            title: "Sent via email",
            description: "Your edits were saved.",
          });
        } else {
          toast.add({
            title: "Sent to your phone",
            description: "Forward it to the lead from Messages.",
          });
        }
      },
      onError: (err, _vars, context) => {
        optimistic.restore(context as OptimisticContext | undefined);
        toast.add(buildErrorToast(err, "Edit failed"));
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
          timeout: 20_000,
        });
      },
      onSettled: () => {
        void optimistic.invalidate();
      },
    }),
  );
}
