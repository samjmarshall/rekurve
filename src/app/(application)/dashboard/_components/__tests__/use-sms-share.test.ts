import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockSmsShared: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockSmsShared = rs.fn();

  rs.doMock("~/lib/posthog", () => ({
    analytics: {
      queue: {
        smsShared: mockSmsShared,
      },
    },
  }));
});

describe("canUseNativeShare", () => {
  test("returns true when navigator.canShare is available and reports true", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        canShare: rs.fn().mockReturnValue(true),
        share: rs.fn(),
      },
      writable: true,
      configurable: true,
    });

    const { canUseNativeShare } = await import("../use-sms-share");
    expect(canUseNativeShare("Hello lead")).toBe(true);
  });

  test("returns false when navigator.canShare is not available", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      writable: true,
      configurable: true,
    });

    const { canUseNativeShare } = await import("../use-sms-share");
    expect(canUseNativeShare("Hello lead")).toBe(false);
  });

  test("returns false when navigator is undefined", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { canUseNativeShare } = await import("../use-sms-share");
    expect(canUseNativeShare("Hello lead")).toBe(false);
  });
});

describe("shareNative", () => {
  const body = "Hi Jane, following up on your visit.";
  const messageId = "550e8400-e29b-41d4-a716-446655440000";

  test("resolves and captures sms_draft_shared with native_share method on success", async () => {
    const mockShare = rs.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", {
      value: { share: mockShare },
      writable: true,
      configurable: true,
    });

    const { shareNative } = await import("../use-sms-share");
    await shareNative(body, messageId);

    expect(mockShare).toHaveBeenCalledWith({ text: body });
    expect(mockSmsShared).toHaveBeenCalledWith({
      method: "native_share",
      message_id: messageId,
    });
  });

  test("rejects on navigator.share cancel and does not capture analytics", async () => {
    const cancelError = new DOMException("Share cancelled", "AbortError");
    const mockShare = rs.fn().mockRejectedValue(cancelError);
    Object.defineProperty(globalThis, "navigator", {
      value: { share: mockShare },
      writable: true,
      configurable: true,
    });

    const { shareNative } = await import("../use-sms-share");
    await expect(shareNative(body, messageId)).rejects.toThrow(
      "Share cancelled",
    );
    expect(mockSmsShared).not.toHaveBeenCalled();
  });
});

describe("canUseSmsLink", () => {
  test("returns true for macOS user agent", async () => {
    const { canUseSmsLink } = await import("../use-sms-share");
    const macUA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    expect(canUseSmsLink(macUA)).toBe(true);
  });

  test("returns true for iOS user agent", async () => {
    const { canUseSmsLink } = await import("../use-sms-share");
    const iosUA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
    expect(canUseSmsLink(iosUA)).toBe(true);
  });

  test("returns true for Android user agent", async () => {
    const { canUseSmsLink } = await import("../use-sms-share");
    const androidUA =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
    expect(canUseSmsLink(androidUA)).toBe(true);
  });

  test("returns false for Windows Chrome user agent", async () => {
    const { canUseSmsLink } = await import("../use-sms-share");
    const windowsUA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    expect(canUseSmsLink(windowsUA)).toBe(false);
  });

  test("returns false for Linux Chrome user agent", async () => {
    const { canUseSmsLink } = await import("../use-sms-share");
    const linuxUA =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
    expect(canUseSmsLink(linuxUA)).toBe(false);
  });
});
