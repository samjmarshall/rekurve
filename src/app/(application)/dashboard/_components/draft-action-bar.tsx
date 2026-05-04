"use client";

import { Check, Clock, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { DismissDialog } from "./dismiss-dialog";
import type { DraftRowData } from "./draft-row";
import { EditDialog } from "./edit-dialog";
import { SmsShareDrawer } from "./sms-share-drawer";
import { SnoozeDialog } from "./snooze-dialog";
import {
  useApproveAction,
  useDismissAction,
  useEditAndApproveAction,
  useSnoozeAction,
} from "./use-queue-actions";

type PendingShare = {
  body: string;
  messageId: string;
  leadName: string;
  source: "approve" | "edit";
};

export function DraftActionBar({ row }: { row: DraftRowData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pendingShare, setPendingShare] = useState<PendingShare | null>(null);

  const approve = useApproveAction({
    onRequestSmsShare: (body, messageId, leadName) => {
      setPendingShare({ body, messageId, leadName, source: "approve" });
      setIsDrawerOpen(true);
    },
  });
  const dismiss = useDismissAction();
  const editAndApprove = useEditAndApproveAction({
    onRequestSmsShare: (body, messageId, leadName) => {
      setPendingShare({ body, messageId, leadName, source: "edit" });
      setIsDrawerOpen(true);
    },
  });
  const snooze = useSnoozeAction();

  const isPending =
    approve.isPending ||
    dismiss.isPending ||
    editAndApprove.isPending ||
    snooze.isPending ||
    isDrawerOpen;

  // For SMS rows with flag OFF, route through the share flow.
  // The cast is safe: behaviorally identical to mutate for the EditDialog consumer.
  const editDialogMutate =
    row.channel === "sms"
      ? (((vars: { id: string; body: string }) => {
          setEditOpen(false);
          editAndApprove.editAndShareApprove(
            vars.id,
            vars.body,
            row.lead.firstName,
          );
        }) as unknown as typeof editAndApprove.mutate)
      : editAndApprove.mutate;

  const handleDrawerApprove = () => {
    if (pendingShare) {
      if (pendingShare.source === "approve") {
        approve.mutate({ id: pendingShare.messageId, skipDispatch: true });
      } else {
        editAndApprove.mutate({
          id: pendingShare.messageId,
          body: pendingShare.body,
          skipDispatch: true,
        });
      }
    }
    setIsDrawerOpen(false);
    setPendingShare(null);
  };

  const handleDrawerCancel = () => {
    setIsDrawerOpen(false);
    setPendingShare(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:justify-end">
        <Button
          data-testid={`queue-approve-${row.id}`}
          variant="primary"
          size="md"
          disabled={isPending}
          onClick={() => approve.handleApprove(row)}
        >
          <Check className="mr-1.5 size-4" />
          Approve
        </Button>
        <Button
          data-testid={`queue-edit-${row.id}`}
          variant="outline"
          size="md"
          disabled={isPending}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="mr-1.5 size-4" />
          Edit
        </Button>
        <Button
          data-testid={`queue-snooze-${row.id}`}
          variant="outline"
          size="md"
          disabled={isPending}
          onClick={() => setSnoozeOpen(true)}
        >
          <Clock className="mr-1.5 size-4" />
          Snooze
        </Button>
        <Button
          data-testid={`queue-dismiss-${row.id}`}
          variant="ghost-destructive"
          size="md"
          disabled={isPending}
          onClick={() => setDismissOpen(true)}
        >
          <Trash2 className="mr-1.5 size-4" />
          Dismiss
        </Button>
      </div>

      <EditDialog
        row={row}
        open={editOpen}
        onOpenChange={setEditOpen}
        mutate={editDialogMutate}
        isPending={editAndApprove.isPending}
        error={editAndApprove.error}
      />
      <SnoozeDialog
        row={row}
        open={snoozeOpen}
        onOpenChange={setSnoozeOpen}
        mutate={snooze.mutate}
        isPending={snooze.isPending}
      />
      <DismissDialog
        row={row}
        open={dismissOpen}
        onOpenChange={setDismissOpen}
        mutate={dismiss.mutate}
        isPending={dismiss.isPending}
      />
      <SmsShareDrawer
        open={isDrawerOpen}
        body={pendingShare?.body ?? ""}
        messageId={pendingShare?.messageId ?? ""}
        leadName={pendingShare?.leadName}
        onApprove={handleDrawerApprove}
        onCancel={handleDrawerCancel}
      />
    </>
  );
}
