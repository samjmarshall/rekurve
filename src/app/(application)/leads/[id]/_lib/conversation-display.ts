export function directionLabel(
  direction: "inbound" | "outbound",
): "Sent" | "Received" {
  return direction === "outbound" ? "Sent" : "Received";
}

export function channelIcon(
  channel: "sms" | "email" | "imessage",
): "MessageSquare" | "Mail" {
  return channel === "email" ? "Mail" : "MessageSquare";
}

export function wasEdited({
  originalBody,
  body,
}: {
  originalBody: string | null;
  body: string;
}): boolean {
  return originalBody !== null && originalBody !== body;
}
