import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import type React from "react";

// Minimal recursive helper to find a React element by data-testid in the JSX tree.
// Avoids DOM rendering so it works in the node test environment.
type RElement = {
  type: unknown;
  props: Record<string, unknown>;
};

function findByTestId(element: unknown, testId: string): RElement | null {
  if (!element || typeof element !== "object" || !("props" in element)) {
    return null;
  }
  const el = element as RElement;
  if (el.props?.["data-testid"] === testId) return el;
  const children = el.props?.children;
  if (!children) return null;
  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    const found = findByTestId(child, testId);
    if (found) return found;
  }
  return null;
}

let mockSmsShared: ReturnType<typeof rs.fn>;
let mockClipboardWrite: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockSmsShared = rs.fn();
  mockClipboardWrite = rs.fn().mockResolvedValue(undefined);

  rs.doMock("~/lib/posthog", () => ({
    analytics: {
      queue: {
        smsShared: mockSmsShared,
      },
    },
  }));

  Object.defineProperty(globalThis, "navigator", {
    value: { clipboard: { writeText: mockClipboardWrite } },
    writable: true,
    configurable: true,
  });
});

const defaultProps = {
  open: true,
  body: "Hi Jane, following up on your visit to the Skyline display home.",
  messageId: "550e8400-e29b-41d4-a716-446655440000",
};

describe("SmsShareDrawer", () => {
  test("Copy button calls clipboard, captures clipboard analytics, and calls onApprove", async () => {
    const { SmsShareDrawer } = await import("../sms-share-drawer");
    const onApprove = rs.fn();
    const onCancel = rs.fn();

    const rendered = SmsShareDrawer({
      ...defaultProps,
      onApprove,
      onCancel,
    }) as React.ReactElement;

    const copyBtn = findByTestId(rendered, "sms-share-copy");
    expect(copyBtn).not.toBeNull();

    (copyBtn!.props.onClick as () => void)();

    expect(mockClipboardWrite).toHaveBeenCalledWith(defaultProps.body);

    // clipboard.writeText is async — flush the .then() before asserting onApprove
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSmsShared).toHaveBeenCalledWith({
      method: "clipboard",
      message_id: defaultProps.messageId,
    });
    expect(onApprove).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("Copy button: clipboard failure leaves onApprove uncalled", async () => {
    mockClipboardWrite.mockRejectedValue(
      new DOMException("Not allowed", "NotAllowedError"),
    );

    const { SmsShareDrawer } = await import("../sms-share-drawer");
    const onApprove = rs.fn();

    const rendered = SmsShareDrawer({
      ...defaultProps,
      onApprove,
      onCancel: rs.fn(),
    }) as React.ReactElement;

    const copyBtn = findByTestId(rendered, "sms-share-copy");
    (copyBtn!.props.onClick as () => void)();

    await new Promise((r) => setTimeout(r, 0));

    expect(mockClipboardWrite).toHaveBeenCalledWith(defaultProps.body);
    expect(mockSmsShared).not.toHaveBeenCalled();
    expect(onApprove).not.toHaveBeenCalled();
  });

  test("Messages link captures sms_link analytics and calls onApprove", async () => {
    const { SmsShareDrawer } = await import("../sms-share-drawer");
    const onApprove = rs.fn();
    const onCancel = rs.fn();

    const rendered = SmsShareDrawer({
      ...defaultProps,
      onApprove,
      onCancel,
    }) as React.ReactElement;

    const messagesLink = findByTestId(rendered, "sms-share-messages");
    expect(messagesLink).not.toBeNull();
    expect(messagesLink!.props.href).toMatch(/^sms:/);

    (messagesLink!.props.onClick as () => void)();

    expect(mockSmsShared).toHaveBeenCalledWith({
      method: "sms_link",
      message_id: defaultProps.messageId,
    });
    expect(onApprove).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("Email link captures mailto_link analytics and calls onApprove", async () => {
    const { SmsShareDrawer } = await import("../sms-share-drawer");
    const onApprove = rs.fn();
    const onCancel = rs.fn();

    const rendered = SmsShareDrawer({
      ...defaultProps,
      onApprove,
      onCancel,
    }) as React.ReactElement;

    const emailLink = findByTestId(rendered, "sms-share-email");
    expect(emailLink).not.toBeNull();
    expect(emailLink!.props.href).toMatch(/^mailto:/);

    (emailLink!.props.onClick as () => void)();

    expect(mockSmsShared).toHaveBeenCalledWith({
      method: "mailto_link",
      message_id: defaultProps.messageId,
    });
    expect(onApprove).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("Dismissing the drawer (onOpenChange false) calls onCancel and not onApprove", async () => {
    const { SmsShareDrawer } = await import("../sms-share-drawer");
    const onApprove = rs.fn();
    const onCancel = rs.fn();

    const rendered = SmsShareDrawer({
      ...defaultProps,
      onApprove,
      onCancel,
    }) as React.ReactElement;

    // The Drawer root element exposes onOpenChange
    const drawerProps = rendered.props as {
      onOpenChange?: (open: boolean) => void;
    };
    expect(drawerProps.onOpenChange).toBeDefined();

    drawerProps.onOpenChange!(false);

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onApprove).not.toHaveBeenCalled();
    expect(mockSmsShared).not.toHaveBeenCalled();
  });

  test("onOpenChange true does not call onCancel", async () => {
    const { SmsShareDrawer } = await import("../sms-share-drawer");
    const onCancel = rs.fn();

    const rendered = SmsShareDrawer({
      ...defaultProps,
      onApprove: rs.fn(),
      onCancel,
    }) as React.ReactElement;

    const drawerProps = rendered.props as {
      onOpenChange?: (open: boolean) => void;
    };
    drawerProps.onOpenChange!(true);

    expect(onCancel).not.toHaveBeenCalled();
  });
});
