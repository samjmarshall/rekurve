"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { useToastManager } from "~/components/ui/toast";
import { QuickCaptureForm } from "./form";

export function QuickCaptureButton() {
  const [open, setOpen] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toastManager = useToastManager();

  const handleSuccess = (lead: {
    id: string;
    firstName: string;
    lastName: string;
  }) => {
    setOpen(false);
    toastManager.add({
      title: "Lead created",
      description: `${lead.firstName} ${lead.lastName} added to pipeline`,
      timeout: 6000,
      actionProps: {
        children: "View Lead",
        onClick: () => router.push(`/leads/${lead.id}`),
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Quick add lead"
        data-testid="quick-capture-fab"
        className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:right-6 md:bottom-6"
      >
        <Plus className="size-6" />
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          initialFocus={firstNameRef}
          data-testid="quick-capture-dialog"
          className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto p-6"
        >
          <div className="flex flex-col gap-1">
            <DialogTitle>Quick capture</DialogTitle>
            <DialogDescription>
              Capture just enough to follow up later. AI will fill the gaps.
            </DialogDescription>
          </div>
          <QuickCaptureForm
            onSuccess={handleSuccess}
            autoFocusRef={firstNameRef}
          />
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
