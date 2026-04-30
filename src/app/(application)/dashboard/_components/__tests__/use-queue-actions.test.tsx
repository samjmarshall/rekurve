import { beforeEach, describe, expect, rs, test } from "@rstest/core";

// Base row fixtures
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

const emailRow = { ...smsRow, channel: "email" as const };

// Per-test mocks — reset in beforeEach
let mockMutate: ReturnType<typeof rs.fn>;
let mockIsFeatureEnabled: ReturnType<typeof rs.fn>;
let mockCanUseNativeShare: ReturnType<typeof rs.fn>;
let mockShareNative: ReturnType<typeof rs.fn>;
let mockOpenDrawer: ReturnType<typeof rs.fn>;
let mockCloseDrawer: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockMutate = rs.fn();
  mockIsFeatureEnabled = rs.fn();
  mockCanUseNativeShare = rs.fn();
  mockShareNative = rs.fn();
  mockOpenDrawer = rs.fn();
  mockCloseDrawer = rs.fn();

  rs.doMock("posthog-js", () => ({
    default: { isFeatureEnabled: mockIsFeatureEnabled },
  }));

  rs.doMock("../use-sms-share", () => ({
    canUseNativeShare: mockCanUseNativeShare,
    shareNative: mockShareNative,
    useSmsShare: rs.fn().mockReturnValue({
      isDrawerOpen: false,
      openDrawer: mockOpenDrawer,
      closeDrawer: mockCloseDrawer,
      pendingBody: "",
      pendingMessageId: "",
    }),
  }));

  rs.doMock("@tanstack/react-query", () => ({
    useMutation: rs.fn().mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
      isError: false,
      isSuccess: false,
      isIdle: true,
      data: undefined,
      status: "idle",
      reset: rs.fn(),
      mutateAsync: rs.fn(),
    }),
    useQueryClient: rs.fn().mockReturnValue({
      cancelQueries: rs.fn().mockResolvedValue(undefined),
      getQueryData: rs.fn().mockReturnValue([]),
      setQueryData: rs.fn(),
      invalidateQueries: rs.fn().mockResolvedValue(undefined),
    }),
  }));

  rs.doMock("~/trpc/react", () => ({
    useTRPC: rs.fn().mockReturnValue({
      messages: {
        approve: {
          mutationOptions: rs.fn().mockImplementation((opts: unknown) => opts),
        },
        editAndApprove: {
          mutationOptions: rs.fn().mockImplementation((opts: unknown) => opts),
        },
        dismiss: {
          mutationOptions: rs.fn().mockImplementation((opts: unknown) => opts),
        },
        snooze: {
          mutationOptions: rs.fn().mockImplementation((opts: unknown) => opts),
        },
        listPending: {
          queryKey: rs.fn().mockReturnValue(["messages", "listPending"]),
        },
      },
    }),
  }));

  rs.doMock("~/components/ui/toast", () => ({
    useToastManager: rs.fn().mockReturnValue({ add: rs.fn() }),
  }));

  rs.doMock("react", () => ({
    useRef: rs
      .fn()
      .mockImplementation((initial: unknown) => ({ current: initial })),
  }));
});

// Flush microtasks (for .then chains off shareNative)
function flushMicrotasks() {
  return new Promise((r) => setTimeout(r, 0));
}

// ---------------------------------------------------------------------------
// useApproveAction — handleApprove
// ---------------------------------------------------------------------------

describe("useApproveAction — handleApprove", () => {
  test("flag OFF + SMS + native share: calls shareNative, on resolve mutates with skipDispatch", async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockCanUseNativeShare.mockReturnValue(true);
    mockShareNative.mockResolvedValue(undefined);

    const { useApproveAction } = await import("../use-queue-actions");
    const hook = useApproveAction();

    hook.handleApprove(smsRow);

    expect(mockShareNative).toHaveBeenCalledWith(smsRow.body, smsRow.id);
    expect(mockMutate).not.toHaveBeenCalled();

    await flushMicrotasks();

    expect(mockMutate).toHaveBeenCalledWith({
      id: smsRow.id,
      skipDispatch: true,
    });
  });

  test("flag OFF + SMS + native share cancel: shareNative rejects, mutate not called", async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockCanUseNativeShare.mockReturnValue(true);
    mockShareNative.mockRejectedValue(
      new DOMException("Share cancelled", "AbortError"),
    );

    const { useApproveAction } = await import("../use-queue-actions");
    const hook = useApproveAction();

    hook.handleApprove(smsRow);

    await flushMicrotasks();

    expect(mockShareNative).toHaveBeenCalledOnce();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  test("flag OFF + SMS + no native share: calls openDrawer with body and id", async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockCanUseNativeShare.mockReturnValue(false);

    const { useApproveAction } = await import("../use-queue-actions");
    const hook = useApproveAction();

    hook.handleApprove(smsRow);

    expect(mockOpenDrawer).toHaveBeenCalledWith(smsRow.body, smsRow.id);
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockShareNative).not.toHaveBeenCalled();
  });

  test("flag ON + SMS: calls mutate directly without skipDispatch", async () => {
    mockIsFeatureEnabled.mockReturnValue(true);

    const { useApproveAction } = await import("../use-queue-actions");
    const hook = useApproveAction();

    hook.handleApprove(smsRow);

    expect(mockMutate).toHaveBeenCalledWith({ id: smsRow.id });
    expect(mockShareNative).not.toHaveBeenCalled();
    expect(mockOpenDrawer).not.toHaveBeenCalled();
  });

  test("email channel: always calls mutate regardless of flag state", async () => {
    mockIsFeatureEnabled.mockReturnValue(false); // flag OFF — should still use mutate for email

    const { useApproveAction } = await import("../use-queue-actions");
    const hook = useApproveAction();

    hook.handleApprove(emailRow);

    expect(mockMutate).toHaveBeenCalledWith({ id: emailRow.id });
    expect(mockShareNative).not.toHaveBeenCalled();
    expect(mockOpenDrawer).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useEditAndApproveAction — editAndShareApprove + onApproveDrawer
// ---------------------------------------------------------------------------

describe("useEditAndApproveAction — editAndShareApprove", () => {
  test("flag OFF + native share: calls shareNative, on resolve editAndApprove.mutate with skipDispatch", async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockCanUseNativeShare.mockReturnValue(true);
    mockShareNative.mockResolvedValue(undefined);

    const { useEditAndApproveAction } = await import("../use-queue-actions");
    const hook = useEditAndApproveAction();

    hook.editAndShareApprove(smsRow.id, "Edited body");

    expect(mockShareNative).toHaveBeenCalledWith("Edited body", smsRow.id);

    await flushMicrotasks();

    expect(mockMutate).toHaveBeenCalledWith({
      id: smsRow.id,
      body: "Edited body",
      skipDispatch: true,
    });
  });

  test("flag OFF + no native share: calls openDrawer, stores pending edit for onApproveDrawer", async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockCanUseNativeShare.mockReturnValue(false);

    const { useEditAndApproveAction } = await import("../use-queue-actions");
    const hook = useEditAndApproveAction();

    hook.editAndShareApprove(smsRow.id, "Edited body");

    expect(mockOpenDrawer).toHaveBeenCalledWith("Edited body", smsRow.id);
    expect(mockMutate).not.toHaveBeenCalled();

    // Drawer onApprove triggers editAndApprove.mutate with body=editedBody, skipDispatch: true
    hook.smsShareState.onApproveDrawer();

    expect(mockMutate).toHaveBeenCalledWith({
      id: smsRow.id,
      body: "Edited body",
      skipDispatch: true,
    });
    expect(mockCloseDrawer).toHaveBeenCalled();
  });

  test("flag ON: calls editAndApprove.mutate directly without skipDispatch", async () => {
    mockIsFeatureEnabled.mockReturnValue(true);

    const { useEditAndApproveAction } = await import("../use-queue-actions");
    const hook = useEditAndApproveAction();

    hook.editAndShareApprove(smsRow.id, "Edited body");

    expect(mockMutate).toHaveBeenCalledWith({
      id: smsRow.id,
      body: "Edited body",
    });
    expect(mockShareNative).not.toHaveBeenCalled();
    expect(mockOpenDrawer).not.toHaveBeenCalled();
  });
});
