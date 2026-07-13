import { describe, expect, test } from "@rstest/core";

import {
  CORRELATION_HEADER_NAME,
  extractCorrelationId,
  formatCorrelationHeader,
} from "../correlation";

const MESSAGE_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("CORRELATION_HEADER_NAME", () => {
  test("is the custom X-prefixed header Graph allows on send", () => {
    // Graph only accepts custom internetMessageHeaders that start with `x-`;
    // internetMessageId is read-only on send. See plan Design Decision #1.
    expect(CORRELATION_HEADER_NAME).toBe("X-Rekurve-Correlation-Id");
    expect(CORRELATION_HEADER_NAME.toLowerCase().startsWith("x-")).toBe(true);
  });
});

describe("formatCorrelationHeader", () => {
  test("returns an internetMessageHeaders entry carrying the message id", () => {
    expect(formatCorrelationHeader(MESSAGE_ID)).toEqual({
      name: CORRELATION_HEADER_NAME,
      value: MESSAGE_ID,
    });
  });
});

describe("extractCorrelationId", () => {
  test("returns null for absent input", () => {
    expect(extractCorrelationId(null)).toBeNull();
    expect(extractCorrelationId(undefined)).toBeNull();
    expect(extractCorrelationId("")).toBeNull();
  });

  test("returns null when the header is absent from a header blob", () => {
    const mime = ["From: a@b.com", "Subject: hi", "To: c@d.com"].join("\n");
    expect(extractCorrelationId(mime)).toBeNull();
  });

  test("returns null for opaque non-header text", () => {
    expect(extractCorrelationId("not headers at all")).toBeNull();
  });

  // Carrier is unverified until deploy (build-agnostic decision). We don't yet
  // know which shape HubSpot's header-bearing property uses, so the parser
  // tolerates every plausible one — a deploy-time pivot stays in this one file.

  test("extracts from a raw MIME header blob", () => {
    const mime = [
      "Received: from mail.example.com",
      `X-Rekurve-Correlation-Id: ${MESSAGE_ID}`,
      "Subject: Test",
    ].join("\n");
    expect(extractCorrelationId(mime)).toBe(MESSAGE_ID);
  });

  test("matches the MIME header name case-insensitively and trims whitespace", () => {
    const mime = `x-rekurve-correlation-id:   ${MESSAGE_ID}   `;
    expect(extractCorrelationId(mime)).toBe(MESSAGE_ID);
  });

  test("handles CRLF line endings", () => {
    const mime = `From: a@b.com\r\nX-Rekurve-Correlation-Id: ${MESSAGE_ID}\r\nTo: c@d.com`;
    expect(extractCorrelationId(mime)).toBe(MESSAGE_ID);
  });

  test("extracts from a flat JSON header map", () => {
    const json = JSON.stringify({
      Subject: "Test",
      "X-Rekurve-Correlation-Id": MESSAGE_ID,
    });
    expect(extractCorrelationId(json)).toBe(MESSAGE_ID);
  });

  test("extracts from a JSON { name, value } header-pair array", () => {
    const json = JSON.stringify([
      { name: "Subject", value: "Test" },
      { name: "X-Rekurve-Correlation-Id", value: MESSAGE_ID },
    ]);
    expect(extractCorrelationId(json)).toBe(MESSAGE_ID);
  });

  test("extracts from a nested JSON structure", () => {
    const json = JSON.stringify({
      headers: { custom: { "X-Rekurve-Correlation-Id": MESSAGE_ID } },
    });
    expect(extractCorrelationId(json)).toBe(MESSAGE_ID);
  });

  test("returns null for a JSON header map without our header", () => {
    const json = JSON.stringify({ Subject: "Test", From: "a@b.com" });
    expect(extractCorrelationId(json)).toBeNull();
  });

  test("round-trips with formatCorrelationHeader via a MIME blob", () => {
    const header = formatCorrelationHeader(MESSAGE_ID);
    const mime = `${header.name}: ${header.value}`;
    expect(extractCorrelationId(mime)).toBe(MESSAGE_ID);
  });
});
