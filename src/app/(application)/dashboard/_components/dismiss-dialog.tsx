"use client";

import { Button } from "~/components/ui/Button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import type { DraftRowData } from "./draft-row";
import { useDismissAction } from "./use-queue-actions";

interface DismissDialogProps {
  row: DraftRowData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DismissDialog({ row, open, onOpenChange }: DismissDialogProps) {
  const dismiss = useDismissAction();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          data-testid={`dismiss-dialog-${row.id}`}
          className="flex flex-col gap-4 p-6"
        >
          <div className="flex flex-col gap-1">
            <DialogTitle>
              Dismiss draft for {row.lead.firstName} {row.lead.lastName}?
            </DialogTitle>
            <DialogDescription>
              It won&apos;t be sent. You can always draft a fresh message later.
            </DialogDescription>
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="md" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              size="md"
              data-testid={`dismiss-confirm-${row.id}`}
              disabled={dismiss.isPending}
              onClick={() =>
                dismiss.mutate(
                  { id: row.id },
                  { onSuccess: () => onOpenChange(false) },
                )
              }
            >
              {dismiss.isPending ? "Dismissing…" : "Dismiss"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
