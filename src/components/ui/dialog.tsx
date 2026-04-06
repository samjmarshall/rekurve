"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "~/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogBackdrop({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
        "data-open:fade-in-0 data-open:animate-in",
        "data-closed:fade-out-0 data-closed:animate-out",
        "duration-150",
        className,
      )}
      {...props}
    />
  );
}

function DialogPopup({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Popup
      data-slot="dialog-popup"
      className={cn(
        // Base: z-index, background, text color
        "fixed z-50 bg-background text-foreground shadow-lg outline-none",
        // Mobile: bottom sheet — full width, pinned to bottom, rounded top corners
        "inset-x-0 bottom-0 rounded-t-2xl border-t",
        "pb-[env(safe-area-inset-bottom)]",
        // Desktop: centered modal
        "md:inset-auto md:top-1/2 md:left-1/2 md:w-full md:max-w-lg",
        "md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border",
        // Animations
        "data-closed:animate-out data-open:animate-in",
        "data-open:fade-in-0 data-closed:fade-out-0",
        "data-open:slide-in-from-bottom-full data-closed:slide-out-to-bottom-full",
        "md:data-open:slide-in-from-bottom-4 md:data-closed:slide-out-to-bottom-4",
        "md:data-open:zoom-in-95 md:data-closed:zoom-out-95",
        "duration-200",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute top-3 right-3 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Close"
      >
        <XIcon className="size-5" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Popup>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-semibold text-lg leading-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
