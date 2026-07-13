// Correlation carrier for deterministic Graph → BCC → HubSpot reconciliation
// (#261). We stamp messageQueue.id onto the outgoing email as a custom internet
// header and read it back off the resulting HubSpot 0-49 engagement to key the
// dispatch worker's `waitForEvent(match: "data.correlationId")`.
//
// SWAP POINT: the carrier mechanism is unverified until deploy-time validation
// (see scripts/spike-correlation-roundtrip.ts). Microsoft Graph makes
// `internetMessageId` read-only on send, so we use a custom `x-`-prefixed
// header — the only header type settable via `internetMessageHeaders`. Whether
// HubSpot surfaces that header back, and in which property/shape, is the open
// question. If the round-trip fails, the pivot (subject token, body sentinel,
// or tightened attribute match) lives entirely in this file plus the injection
// site (ms-graph/emails.ts) and the property request (hubspot/emails.ts). The
// async worker, outbox events, and event contract are carrier-invariant.

export const CORRELATION_HEADER_NAME = "X-Rekurve-Correlation-Id";

/**
 * Build the `internetMessageHeaders` entry that carries the correlation id on a
 * Graph `/me/sendMail`. `messageId` is `messageQueue.id`, which equals the
 * `correlationId` matched downstream.
 */
export function formatCorrelationHeader(messageId: string): {
  name: string;
  value: string;
} {
  return { name: CORRELATION_HEADER_NAME, value: messageId };
}

/**
 * Extract the correlation id from a HubSpot engagement's header-bearing
 * property (e.g. `hs_email_headers`). Pure, no I/O. Returns null when the
 * header is absent or malformed — i.e. the engagement is not one of ours.
 *
 * The property's exact shape is unverified until deploy, so we tolerate every
 * plausible one: a JSON header map, a JSON `{ name, value }` array, a nested
 * JSON structure, or a raw MIME header blob.
 */
export function extractCorrelationId(
  rawHeaders: string | null | undefined,
): string | null {
  if (!rawHeaders) return null;
  return extractFromJson(rawHeaders) ?? extractFromMime(rawHeaders);
}

function extractFromJson(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return searchJson(parsed);
}

function searchJson(node: unknown): string | null {
  if (node === null || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = searchJson(item);
      if (found) return found;
    }
    return null;
  }

  const obj = node as Record<string, unknown>;

  // Shape: { name: "X-Rekurve-Correlation-Id", value: "<id>" }
  if (
    typeof obj.name === "string" &&
    headerMatches(obj.name) &&
    typeof obj.value === "string" &&
    obj.value.trim()
  ) {
    return obj.value.trim();
  }

  // Shape: { "X-Rekurve-Correlation-Id": "<id>" }
  for (const [key, value] of Object.entries(obj)) {
    if (headerMatches(key) && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  // Recurse into nested structures.
  for (const value of Object.values(obj)) {
    const found = searchJson(value);
    if (found) return found;
  }
  return null;
}

function extractFromMime(raw: string): string | null {
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*x-rekurve-correlation-id\s*:\s*(.+?)\s*$/i);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function headerMatches(key: string): boolean {
  return key.toLowerCase() === CORRELATION_HEADER_NAME.toLowerCase();
}
