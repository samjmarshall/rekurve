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
import {
  MIN_BUFFER_MS,
  nextMonday9am,
  ONE_DAY_MS,
  toLocalInputValue,
  validateSnoozeTime,
} from "../_lib/snooze";
import type { DraftRowData } from "./draft-row";
import { useSnoozeAction } from "./use-queue-actions";

interface SnoozeDialogProps {
  row: DraftRowData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function defaultValue(): string {
  return toLocalInputValue(new Date(Date.now() + ONE_DAY_MS));
}

export function SnoozeDialog({ row, open, onOpenChange }: SnoozeDialogProps) {
  const [value, setValue] = useState<string>(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const snooze = useSnoozeAction();

  useEffect(() => {
    if (open) {
      setValue(defaultValue());
      setError(null);
    }
  }, [open]);

  const minValue = toLocalInputValue(new Date(Date.now() + MIN_BUFFER_MS));

  const setQuickChip = (offsetMs: number) => {
    setValue(toLocalInputValue(new Date(Date.now() + offsetMs)));
  };

  const handleSave = () => {
    const result = validateSnoozeTime(value);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    snooze.mutate(
      { id: row.id, snoozedUntil: result.date },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          data-testid={`snooze-dialog-${row.id}`}
          className="flex flex-col gap-4 p-6"
        >
          <DialogTitle>Snooze draft</DialogTitle>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickChip(ONE_DAY_MS)}
              data-testid={`snooze-chip-1d-${row.id}`}
            >
              +1 day
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickChip(ONE_DAY_MS * 3)}
              data-testid={`snooze-chip-3d-${row.id}`}
            >
              +3 days
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue(toLocalInputValue(nextMonday9am()))}
              data-testid={`snooze-chip-monday-${row.id}`}
            >
              Next Monday
            </Button>
          </div>

          <input
            type="datetime-local"
            value={value}
            min={minValue}
            onChange={(e) => setValue(e.target.value)}
            data-testid={`snooze-input-${row.id}`}
            aria-label="Snooze until"
            aria-invalid={!!error || undefined}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/80 md:text-sm"
          />
          {error ? (
            <p role="alert" className="text-destructive text-xs">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="md" />}>
              Cancel
            </DialogClose>
            <Button
              variant="primary"
              size="md"
              data-testid={`snooze-save-${row.id}`}
              disabled={snooze.isPending}
              onClick={handleSave}
            >
              {snooze.isPending ? "Snoozing…" : "Snooze"}
            </Button>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
