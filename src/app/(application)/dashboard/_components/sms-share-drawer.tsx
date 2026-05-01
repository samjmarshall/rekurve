"use client";

import { Check, ClipboardCopy, Mail, MessageCircle } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/Button";
import { buttonVariants } from "~/components/ui/button-variants";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { useToastManager } from "~/components/ui/toast";
import { analytics } from "~/lib/posthog";
import { cn } from "~/lib/utils";
import { canUseSmsLink } from "./use-sms-share";

interface SmsShareDrawerProps {
  open: boolean;
  body: string;
  messageId: string;
  leadName?: string;
  onApprove: () => void;
  onCancel: () => void;
}

export function SmsShareDrawer({
  open,
  body,
  messageId,
  leadName,
  onApprove,
  onCancel,
}: SmsShareDrawerProps) {
  const toast = useToastManager();
  const [copied, setCopied] = useState(false);
  const [hideOnDesktop] = useState(
    () =>
      typeof navigator !== "undefined" && !canUseSmsLink(navigator.userAgent),
  );
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      setHasOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const smsLink = `sms:?body=${encodeURIComponent(body)}`;
  const mailtoLink = `mailto:?body=${encodeURIComponent(body)}`;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(body)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          analytics.queue.smsShared({
            method: "clipboard",
            message_id: messageId,
          });
          onApprove();
          setCopied(false);
        }, 1200);
      })
      .catch(() => {
        toast.add({
          type: "error",
          title: "Copy failed",
          description: "Could not copy to clipboard. Try another option.",
        });
      });
  };

  const handleMessages = () => {
    analytics.queue.smsShared({ method: "sms_link", message_id: messageId });
    onApprove();
  };

  const handleEmail = () => {
    analytics.queue.smsShared({ method: "mailto_link", message_id: messageId });
    onApprove();
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel();
      }}
    >
      <DrawerContent
        data-testid="sms-share-drawer"
        className="md:right-auto md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2"
      >
        <DrawerHeader>
          <DrawerTitle data-testid="sms-share-title">
            {leadName ? `Send message to ${leadName}` : "Send message to lead"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="relative px-4 pb-2">
          <div
            ref={bodyRef}
            className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm"
          >
            {body}
          </div>
          {hasOverflow ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-4 bottom-2 h-6 rounded-b-md bg-gradient-to-t from-muted/40 to-transparent"
            />
          ) : null}
        </div>

        <DrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            variant="primary"
            size="md"
            data-testid="sms-share-copy"
            autoFocus
            disabled={copied}
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="mr-2 size-4" />
            ) : (
              <ClipboardCopy className="mr-2 size-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <DrawerClose asChild>
            <a
              href={smsLink}
              data-testid="sms-share-messages"
              onClick={handleMessages}
              className={cn(
                buttonVariants({ variant: "outline", size: "md" }),
                hideOnDesktop && "md:hidden",
              )}
            >
              <MessageCircle className="mr-2 size-4" />
              Open in Messages
            </a>
          </DrawerClose>
          <DrawerClose asChild>
            <a
              href={mailtoLink}
              data-testid="sms-share-email"
              onClick={handleEmail}
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              <Mail className="mr-2 size-4" />
              Open in email
            </a>
          </DrawerClose>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="md"
              data-testid="sms-share-cancel"
              className="min-h-11"
            >
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
