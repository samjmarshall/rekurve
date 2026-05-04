"use client";

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

export function canUseSmsLink(userAgent: string): boolean {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isMac =
    /Macintosh/i.test(userAgent) && !/iPhone|iPad|iPod/i.test(userAgent);
  return isMobile || isMac;
}
