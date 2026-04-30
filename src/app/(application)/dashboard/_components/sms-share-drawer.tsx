"use client";

import { ClipboardCopy, Mail, MessageCircle } from "lucide-react";
import { Button } from "~/components/ui/Button";
import { buttonVariants } from "~/components/ui/button-variants";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { analytics } from "~/lib/posthog";

interface SmsShareDrawerProps {
  open: boolean;
  body: string;
  messageId: string;
  onApprove: () => void;
  onCancel: () => void;
}

export function SmsShareDrawer({
  open,
  body,
  messageId,
  onApprove,
  onCancel,
}: SmsShareDrawerProps) {
  const smsLink = `sms:?body=${encodeURIComponent(body)}`;
  const mailtoLink = `mailto:?body=${encodeURIComponent(body)}`;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(body)
      .then(() => {
        analytics.queue.smsShared({
          method: "clipboard",
          message_id: messageId,
        });
        onApprove();
      })
      .catch(() => {
        // Clipboard write failed — drawer stays open so the user can choose another method.
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
      <DrawerContent data-testid="sms-share-drawer">
        <DrawerHeader>
          <DrawerTitle>Forward draft to lead</DrawerTitle>
          <DrawerDescription>
            Choose how to send this message.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2">
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
            {body}
          </pre>
        </div>

        <DrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            variant="primary"
            size="md"
            data-testid="sms-share-copy"
            onClick={handleCopy}
          >
            <ClipboardCopy className="mr-2 size-4" />
            Copy to clipboard
          </Button>
          <DrawerClose asChild>
            <a
              href={smsLink}
              data-testid="sms-share-messages"
              onClick={handleMessages}
              className={buttonVariants({ variant: "outline", size: "md" })}
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
