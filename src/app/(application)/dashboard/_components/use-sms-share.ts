"use client";

import { useState } from "react";
import { analytics } from "~/lib/posthog";

export function canUseNativeShare(body: string): boolean {
  return (
    typeof navigator !== "undefined" && !!navigator.canShare?.({ text: body })
  );
}

export async function shareNative(
  body: string,
  messageId: string,
): Promise<void> {
  await navigator.share({ text: body });
  analytics.queue.smsShared({ method: "native_share", message_id: messageId });
}

export function useSmsShare() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pendingBody, setPendingBody] = useState("");
  const [pendingMessageId, setPendingMessageId] = useState("");

  const openDrawer = (body: string, messageId: string) => {
    setPendingBody(body);
    setPendingMessageId(messageId);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

  return {
    canUseNativeShare,
    shareNative,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    pendingBody,
    pendingMessageId,
  };
}
