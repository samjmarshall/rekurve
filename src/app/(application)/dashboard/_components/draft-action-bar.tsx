"use client";

import { Check, Clock, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/Button";
import { DismissDialog } from "./dismiss-dialog";
import type { DraftRowData } from "./draft-row";
import { EditDialog } from "./edit-dialog";
import { SnoozeDialog } from "./snooze-dialog";
import {
  useApproveAction,
  useDismissAction,
  useEditAndApproveAction,
  useSnoozeAction,
} from "./use-queue-actions";

export function DraftActionBar({ row }: { row: DraftRowData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);

  const approve = useApproveAction();
  const dismiss = useDismissAction();
  const editAndApprove = useEditAndApproveAction();
  const snooze = useSnoozeAction();

  const isPending =
    approve.isPending ||
    dismiss.isPending ||
    editAndApprove.isPending ||
    snooze.isPending;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:justify-end">
        <Button
          data-testid={`queue-approve-${row.id}`}
          variant="primary"
          size="md"
          disabled={isPending}
          onClick={() => approve.mutate({ id: row.id })}
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
        mutate={editAndApprove.mutate}
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
    </>
  );
}
