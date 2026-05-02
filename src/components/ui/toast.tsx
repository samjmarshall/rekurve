"use client";

import { Toast } from "@base-ui/react/toast";
import { cn } from "~/lib/utils";

export const toastManager = Toast.createToastManager();

function ToastViewport() {
  const { toasts } = Toast.useToastManager();
  return (
    <Toast.Portal>
      <Toast.Viewport
        className={cn(
          "fixed z-[60] flex flex-col gap-2 outline-none",
          // Mobile: full width, above bottom nav
          "inset-x-4 bottom-20",
          // Desktop: bottom-right, fixed width
          "md:inset-auto md:right-6 md:bottom-6 md:left-auto md:w-96",
        )}
      >
        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            toast={t}
            data-testid="app-toast"
            className={cn(
              "group relative flex w-full items-start gap-3 rounded-lg border bg-background p-4 shadow-lg",
              "data-open:fade-in-0 data-open:slide-in-from-bottom-4 data-open:animate-in",
              "data-closed:fade-out-0 data-closed:animate-out",
              "data-[type=error]:border-destructive/30",
              "duration-200",
            )}
          >
            <div className="flex flex-1 flex-col gap-1">
              <Toast.Title className="font-medium text-sm leading-tight" />
              <Toast.Description className="text-muted-foreground text-sm" />
              <Toast.Action className="mt-2 inline-flex h-8 w-fit items-center rounded-md border bg-background px-3 font-medium text-sm transition-colors hover:bg-accent" />
            </div>
            <Toast.Close
              className="-m-1 p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss"
            >
              ×
            </Toast.Close>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager}>
      {children}
      <ToastViewport />
    </Toast.Provider>
  );
}

export const useToastManager = Toast.useToastManager;
