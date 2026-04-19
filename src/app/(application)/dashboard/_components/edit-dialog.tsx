"use client";

import { useEffect, useState } from "react";
import { Button } from "~/components/ui/Button";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { MAX_BODY, validateEditBody } from "../_lib/edit-validation";
import type { DraftRowData } from "./draft-row";
import type { useEditAndApproveAction } from "./use-queue-actions";

type EditMutation = ReturnType<typeof useEditAndApproveAction>;

interface EditDialogProps {
  row: DraftRowData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mutate: EditMutation["mutate"];
  isPending: EditMutation["isPending"];
  error: EditMutation["error"];
}

export function EditDialog({
  row,
  open,
  onOpenChange,
  mutate,
  isPending,
  error,
}: EditDialogProps) {
  const [body, setBody] = useState(row.body);

  // Reset body when the dialog opens for a different draft or is re-opened.
  useEffect(() => {
    if (open) setBody(row.body);
  }, [open, row.body]);

  const { tooLong, valid } = validateEditBody(body);
  const disabled = !valid || isPending;

  const zodError = (
    error?.data as
      | { zodError?: { fieldErrors?: Record<string, string[]> } }
      | undefined
  )?.zodError?.fieldErrors?.body?.[0];

  const counterId = `edit-counter-${row.id}`;
  const errorId = `edit-error-${row.id}`;
  const describedBy = [counterId, zodError ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          data-testid={`edit-dialog-${row.id}`}
          className="flex flex-col gap-4 p-6"
        >
          <div className="flex flex-col gap-1">
            <DialogTitle>
              Edit message for {row.lead.firstName} {row.lead.lastName}
            </DialogTitle>
          </div>

          <Textarea
            id="edit-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            data-testid={`edit-body-${row.id}`}
            rows={6}
            aria-label="Message body"
            aria-invalid={tooLong || !!zodError ? true : undefined}
            aria-describedby={describedBy || undefined}
          />
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span
              id={counterId}
              data-testid={`edit-counter-${row.id}`}
              className={tooLong ? "text-destructive" : undefined}
            >
              {body.length} / {MAX_BODY}
            </span>
            {zodError ? (
              <span id={errorId} role="alert" className="text-destructive">
                {zodError}
              </span>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="md" />}>
              Cancel
            </DialogClose>
            <Button
              variant="primary"
              size="md"
              data-testid={`edit-save-${row.id}`}
              disabled={disabled}
              onClick={() =>
                mutate(
                  { id: row.id, body: body.trim() },
                  { onSuccess: () => onOpenChange(false) },
                )
              }
            >
              {isPending ? "Saving…" : "Save & Approve"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
