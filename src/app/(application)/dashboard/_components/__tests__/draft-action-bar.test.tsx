import { beforeEach, describe, expect, rs, test } from "@rstest/core";
import type React from "react";

type RElement = {
  type: unknown;
  props: Record<string, unknown>;
};

function findByTestId(element: unknown, testId: string): RElement | null {
  if (!element || typeof element !== "object" || !("props" in element))
    return null;
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

// Find the first element that has ALL of the specified prop names
function findByPropNames(
  element: unknown,
  ...propNames: string[]
): RElement | null {
  if (!element || typeof element !== "object" || !("props" in element))
    return null;
  const el = element as RElement;
  if (propNames.every((p) => p in el.props)) return el;
  const children = el.props?.children;
  if (!children) return null;
  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    const found = findByPropNames(child, ...propNames);
    if (found) return found;
  }
  return null;
}

const smsRow = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  body: "Hi Jane, following up on your visit.",
  channel: "sms" as const,
  leadId: "lead-1",
  subject: null,
  aiReasoning: null,
  priority: 5,
  status: "pending" as const,
  snoozedUntil: null,
  originalBody: null,
  approvedAt: null,
  sentAt: null,
  createdAt: new Date("2026-04-10T00:00:00Z"),
  lead: {
    id: "lead-1",
    firstName: "Jane",
    lastName: "Doe",
    leadScore: 50,
    leadStage: "warm" as const,
  },
};

// Per-test mock handles — reset in beforeEach
let mockHandleApprove: ReturnType<typeof rs.fn>;
let mockApproveMutate: ReturnType<typeof rs.fn>;
let mockEditAndShareApprove: ReturnType<typeof rs.fn>;
let mockEditMutate: ReturnType<typeof rs.fn>;

// State call order in DraftActionBar:
//   0 = editOpen, 1 = snoozeOpen, 2 = dismissOpen, 3 = isDrawerOpen, 4 = pendingShare
const DRAWER_OPEN_IDX = 3;
const PENDING_SHARE_IDX = 4;

type PendingShare = {
  body: string;
  messageId: string;
  leadName: string;
  source: "approve" | "edit";
};

/**
 * Build a useState mock that injects specific values at named state positions
 * and returns the setters so callers can assert on them.
 */
function makeStateMock(overrides: Record<number, unknown>) {
  let count = 0;
  const setters: ReturnType<typeof rs.fn>[] = [];
  const mock = rs.fn().mockImplementation((initial: unknown) => {
    const idx = count++;
    const setter = rs.fn();
    setters.push(setter);
    const value = idx in overrides ? overrides[idx] : initial;
    return [value, setter];
  });
  return { mock, setters: () => setters };
}

beforeEach(() => {
  rs.resetModules();

  mockHandleApprove = rs.fn();
  mockApproveMutate = rs.fn();
  mockEditAndShareApprove = rs.fn();
  mockEditMutate = rs.fn();

  rs.doMock("../use-sms-share", () => ({
    canUseSmsLink: rs.fn().mockReturnValue(false),
  }));

  rs.doMock("~/components/ui/toast", () => ({
    useToastManager: () => ({ add: rs.fn() }),
  }));

  rs.doMock("~/lib/posthog", () => ({
    analytics: { queue: { smsShared: rs.fn() } },
  }));
});

// ---------------------------------------------------------------------------
// Approve flow
// ---------------------------------------------------------------------------

describe("DraftActionBar — approve SMS share drawer", () => {
  test("SmsShareDrawer receives open=true with correct body, messageId, and leadName when approve source is pending", async () => {
    const pendingShare: PendingShare = {
      body: smsRow.body,
      messageId: smsRow.id,
      leadName: smsRow.lead.firstName,
      source: "approve",
    };
    const { mock: useStateMock } = makeStateMock({
      [DRAWER_OPEN_IDX]: true,
      [PENDING_SHARE_IDX]: pendingShare,
    });

    rs.doMock("react", () => ({
      useState: useStateMock,
      useLayoutEffect: rs.fn(),
      useRef: rs.fn().mockImplementation((v: unknown) => ({ current: v })),
      useEffect: rs.fn(),
    }));

    rs.doMock("../use-queue-actions", () => ({
      useApproveAction: () => ({
        handleApprove: mockHandleApprove,
        mutate: mockApproveMutate,
        isPending: false,
        error: null,
      }),
      useEditAndApproveAction: () => ({
        editAndShareApprove: mockEditAndShareApprove,
        mutate: mockEditMutate,
        isPending: false,
        error: null,
      }),
      useDismissAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
      useSnoozeAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
    }));

    const { DraftActionBar } = await import("../draft-action-bar");
    const rendered = DraftActionBar({ row: smsRow }) as React.ReactElement;

    const drawer = findByPropNames(
      rendered,
      "open",
      "body",
      "messageId",
      "onApprove",
      "onCancel",
    );
    expect(drawer).not.toBeNull();
    expect(drawer!.props.open).toBe(true);
    expect(drawer!.props.body).toBe(smsRow.body);
    expect(drawer!.props.messageId).toBe(smsRow.id);
    expect(drawer!.props.leadName).toBe(smsRow.lead.firstName);
  });

  test("isPending is true (Approve button disabled) when isDrawerOpen is true", async () => {
    const { mock: useStateMock } = makeStateMock({ [DRAWER_OPEN_IDX]: true });

    rs.doMock("react", () => ({
      useState: useStateMock,
      useLayoutEffect: rs.fn(),
      useRef: rs.fn().mockImplementation((v: unknown) => ({ current: v })),
      useEffect: rs.fn(),
    }));

    rs.doMock("../use-queue-actions", () => ({
      useApproveAction: () => ({
        handleApprove: mockHandleApprove,
        mutate: mockApproveMutate,
        isPending: false,
        error: null,
      }),
      useEditAndApproveAction: () => ({
        editAndShareApprove: mockEditAndShareApprove,
        mutate: mockEditMutate,
        isPending: false,
        error: null,
      }),
      useDismissAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
      useSnoozeAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
    }));

    const { DraftActionBar } = await import("../draft-action-bar");
    const rendered = DraftActionBar({ row: smsRow }) as React.ReactElement;

    const approveBtn = findByTestId(rendered, `queue-approve-${smsRow.id}`);
    expect(approveBtn).not.toBeNull();
    expect(approveBtn!.props.disabled).toBe(true);
  });

  test("drawer onApprove calls approve.mutate with skipDispatch when source is 'approve'", async () => {
    const pendingShare: PendingShare = {
      body: smsRow.body,
      messageId: smsRow.id,
      leadName: smsRow.lead.firstName,
      source: "approve",
    };
    const { mock: useStateMock } = makeStateMock({
      [DRAWER_OPEN_IDX]: true,
      [PENDING_SHARE_IDX]: pendingShare,
    });

    rs.doMock("react", () => ({
      useState: useStateMock,
      useLayoutEffect: rs.fn(),
      useRef: rs.fn().mockImplementation((v: unknown) => ({ current: v })),
      useEffect: rs.fn(),
    }));

    rs.doMock("../use-queue-actions", () => ({
      useApproveAction: () => ({
        handleApprove: mockHandleApprove,
        mutate: mockApproveMutate,
        isPending: false,
        error: null,
      }),
      useEditAndApproveAction: () => ({
        editAndShareApprove: mockEditAndShareApprove,
        mutate: mockEditMutate,
        isPending: false,
        error: null,
      }),
      useDismissAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
      useSnoozeAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
    }));

    const { DraftActionBar } = await import("../draft-action-bar");
    const rendered = DraftActionBar({ row: smsRow }) as React.ReactElement;

    const drawer = findByPropNames(
      rendered,
      "open",
      "body",
      "messageId",
      "onApprove",
      "onCancel",
    );
    expect(drawer).not.toBeNull();

    (drawer!.props.onApprove as () => void)();

    expect(mockApproveMutate).toHaveBeenCalledWith({
      id: smsRow.id,
      skipDispatch: true,
    });
    expect(mockEditMutate).not.toHaveBeenCalled();
  });

  test("drawer onCancel does not call any mutate", async () => {
    const pendingShare: PendingShare = {
      body: smsRow.body,
      messageId: smsRow.id,
      leadName: smsRow.lead.firstName,
      source: "approve",
    };
    const { mock: useStateMock } = makeStateMock({
      [DRAWER_OPEN_IDX]: true,
      [PENDING_SHARE_IDX]: pendingShare,
    });

    rs.doMock("react", () => ({
      useState: useStateMock,
      useLayoutEffect: rs.fn(),
      useRef: rs.fn().mockImplementation((v: unknown) => ({ current: v })),
      useEffect: rs.fn(),
    }));

    rs.doMock("../use-queue-actions", () => ({
      useApproveAction: () => ({
        handleApprove: mockHandleApprove,
        mutate: mockApproveMutate,
        isPending: false,
        error: null,
      }),
      useEditAndApproveAction: () => ({
        editAndShareApprove: mockEditAndShareApprove,
        mutate: mockEditMutate,
        isPending: false,
        error: null,
      }),
      useDismissAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
      useSnoozeAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
    }));

    const { DraftActionBar } = await import("../draft-action-bar");
    const rendered = DraftActionBar({ row: smsRow }) as React.ReactElement;

    const drawer = findByPropNames(
      rendered,
      "open",
      "body",
      "messageId",
      "onApprove",
      "onCancel",
    );
    expect(drawer).not.toBeNull();

    (drawer!.props.onCancel as () => void)();

    expect(mockApproveMutate).not.toHaveBeenCalled();
    expect(mockEditMutate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Edit-and-approve flow
// ---------------------------------------------------------------------------

describe("DraftActionBar — edit-and-approve SMS share drawer", () => {
  test("SmsShareDrawer receives edited body when source is 'edit'", async () => {
    const pendingShare: PendingShare = {
      body: "Edited body",
      messageId: smsRow.id,
      leadName: smsRow.lead.firstName,
      source: "edit",
    };
    const { mock: useStateMock } = makeStateMock({
      [DRAWER_OPEN_IDX]: true,
      [PENDING_SHARE_IDX]: pendingShare,
    });

    rs.doMock("react", () => ({
      useState: useStateMock,
      useLayoutEffect: rs.fn(),
      useRef: rs.fn().mockImplementation((v: unknown) => ({ current: v })),
      useEffect: rs.fn(),
    }));

    rs.doMock("../use-queue-actions", () => ({
      useApproveAction: () => ({
        handleApprove: mockHandleApprove,
        mutate: mockApproveMutate,
        isPending: false,
        error: null,
      }),
      useEditAndApproveAction: () => ({
        editAndShareApprove: mockEditAndShareApprove,
        mutate: mockEditMutate,
        isPending: false,
        error: null,
      }),
      useDismissAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
      useSnoozeAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
    }));

    const { DraftActionBar } = await import("../draft-action-bar");
    const rendered = DraftActionBar({ row: smsRow }) as React.ReactElement;

    const drawer = findByPropNames(
      rendered,
      "open",
      "body",
      "messageId",
      "onApprove",
      "onCancel",
    );
    expect(drawer).not.toBeNull();
    expect(drawer!.props.open).toBe(true);
    expect(drawer!.props.body).toBe("Edited body");
    expect(drawer!.props.messageId).toBe(smsRow.id);
    expect(drawer!.props.leadName).toBe(smsRow.lead.firstName);
  });

  test("drawer onApprove calls editAndApprove.mutate with edited body and skipDispatch when source is 'edit'", async () => {
    const pendingShare: PendingShare = {
      body: "Edited body",
      messageId: smsRow.id,
      leadName: smsRow.lead.firstName,
      source: "edit",
    };
    const { mock: useStateMock } = makeStateMock({
      [DRAWER_OPEN_IDX]: true,
      [PENDING_SHARE_IDX]: pendingShare,
    });

    rs.doMock("react", () => ({
      useState: useStateMock,
      useLayoutEffect: rs.fn(),
      useRef: rs.fn().mockImplementation((v: unknown) => ({ current: v })),
      useEffect: rs.fn(),
    }));

    rs.doMock("../use-queue-actions", () => ({
      useApproveAction: () => ({
        handleApprove: mockHandleApprove,
        mutate: mockApproveMutate,
        isPending: false,
        error: null,
      }),
      useEditAndApproveAction: () => ({
        editAndShareApprove: mockEditAndShareApprove,
        mutate: mockEditMutate,
        isPending: false,
        error: null,
      }),
      useDismissAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
      useSnoozeAction: () => ({
        mutate: rs.fn(),
        isPending: false,
        error: null,
      }),
    }));

    const { DraftActionBar } = await import("../draft-action-bar");
    const rendered = DraftActionBar({ row: smsRow }) as React.ReactElement;

    const drawer = findByPropNames(
      rendered,
      "open",
      "body",
      "messageId",
      "onApprove",
      "onCancel",
    );
    expect(drawer).not.toBeNull();

    (drawer!.props.onApprove as () => void)();

    expect(mockEditMutate).toHaveBeenCalledWith({
      id: smsRow.id,
      body: "Edited body",
      skipDispatch: true,
    });
    expect(mockApproveMutate).not.toHaveBeenCalled();
  });
});
