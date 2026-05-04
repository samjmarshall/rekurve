# Lift SMS Share Drawer State into `DraftActionBar` Implementation Plan

## Context

ADR-012 (added in `refactor/architecture-review`) codified the rule that React Context Providers and extracted custom state-holding hooks are reserved for genuinely global state; page- and modal-local state must inline `useState` in the owning component. The architecture audit of `src/` on 2026-05-04 found the codebase otherwise conformant — except for the SMS share drawer flow in the dashboard queue, where modal-local state is owned by a custom hook (`useSmsShare`) and re-exposed through two mutation hooks (`useApproveAction`, `useEditAndApproveAction`) as a `smsShareState` blob. This plan lifts that state into `DraftActionBar` and removes the violating shapes.

## Current State

The SMS share drawer state is owned by `useSmsShare()` and surfaced through the queue-action hooks:

- `src/app/(application)/dashboard/_components/use-sms-share.ts:27` — `useSmsShare()` exports four `useState` calls (`isDrawerOpen`, `pendingBody`, `pendingMessageId`, `pendingLeadName`) plus `openDrawer`/`closeDrawer` handlers. Same file also exports the pure helpers `canUseNativeShare:6`, `shareNative:12`, and `canUseSmsLink:20`.
- `src/app/(application)/dashboard/_components/use-queue-actions.ts:101` — `useApproveAction()` calls `useSmsShare()`, owns `pendingMessageId` for the drawer-approve callback, and returns a `smsShareState` blob (`use-queue-actions.ts:163-170`).
- `src/app/(application)/dashboard/_components/use-queue-actions.ts:201` — `useEditAndApproveAction()` calls `useSmsShare()` plus a `useRef<{ id, body } | null>` (`use-queue-actions.ts:213`) for the pending edit, and returns its own `smsShareState` blob (`use-queue-actions.ts:278-285`).
- `src/app/(application)/dashboard/_components/use-queue-actions.ts:92` — `SmsShareState` type defines the 6-field blob.
- `src/app/(application)/dashboard/_components/draft-action-bar.tsx:33-34` — `isPending` reads `approve.smsShareState.isDrawerOpen` and `editAndApprove.smsShareState.isDrawerOpen`.
- `src/app/(application)/dashboard/_components/draft-action-bar.tsx:51-53` — picks whichever blob has its drawer open.
- `src/app/(application)/dashboard/_components/draft-action-bar.tsx:122-129` — `SmsShareDrawer` consumer already unpacks the blob into explicit named props (correct end-shape for the drawer; the violation is upstream).

`SmsShareDrawer` itself is conformant: receives explicit named props (`open`, `body`, `messageId`, `leadName?`, `onApprove`, `onCancel`) at `sms-share-drawer.tsx:20-27`. Other queue-action hooks (`useDismissAction`, `useSnoozeAction`, `useOptimisticRemove`) and the broader `useMutation` wrappers are framework-primitive carve-outs and not in scope.

Test coverage for the violation:

- `src/app/(application)/dashboard/_components/__tests__/use-queue-actions.test.tsx:55-63` mocks `useSmsShare` and asserts that `useApproveAction.handleApprove`/`useEditAndApproveAction.editAndShareApprove` call `openDrawer(body, id, leadName)` when native share is unavailable, and asserts `hook.smsShareState.onApproveDrawer()` triggers `mutate` with `skipDispatch: true` (line 256).
- `src/app/(application)/dashboard/_components/__tests__/use-sms-share.test.ts:133-161` exercises the `useSmsShare` hook directly (`leadName` lifecycle).
- `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx` is unaffected — it renders `SmsShareDrawer` with explicit props and is the contract we want to preserve.

## Desired End State

- `useSmsShare()` no longer exists. The pure helpers (`canUseNativeShare`, `shareNative`, `canUseSmsLink`) remain — same file or renamed to `share-helpers.ts`, decided during implementation by what reads cleanest.
- `useApproveAction()` and `useEditAndApproveAction()` no longer own drawer state and no longer return a `smsShareState` key. They expose a callback hook for the case where the SMS share drawer needs to open: `handleApprove` / `editAndShareApprove` accept (or the hooks accept via options) a single `onRequestSmsShare(body, messageId, leadName) => void` callback. The drawer-approve callback path moves entirely to the component.
- `DraftActionBar` owns drawer state via three inline `useState` calls (`isDrawerOpen`, `pendingShare`, where `pendingShare` is `{ body, messageId, leadName, source: "approve" | "edit" }` — or three separate `useState` calls if that reads cleaner) plus the existing `editOpen`/`snoozeOpen`/`dismissOpen` `useState` calls. The pending-edit `useRef` from `useEditAndApproveAction` becomes part of `pendingShare` since the source is now tracked in the component.
- `SmsShareState` type is deleted. `SmsShareDrawer`'s prop interface is unchanged.
- Behaviour is identical — SMS row + flag OFF + native share works, + no native share opens the drawer, drawer-approve calls the right mutation with `skipDispatch: true`, drawer-cancel closes without mutation, edit-and-share preserves the edited body through the drawer-approve path.
- `make check`, `make test`, `make build` pass. `make test_e2e` is not required since the existing E2E coverage already exercises the queue approve flow end-to-end and we are not changing user-visible behaviour.

## Out of Scope

- Refactoring the React Query mutation cores (`useApproveAction`'s `useMutation` and its optimistic-update / toast-error wiring). These are the legitimate framework-primitive carve-outs ADR-012 explicitly allows.
- Refactoring `useDismissAction`, `useSnoozeAction`, `useOptimisticRemove`. None violate ADR-012.
- Touching `SmsShareDrawer` or its tests at `sms-share-drawer.test.tsx`. The drawer's prop contract is the conformant shape we're moving toward, not away from.
- Adding new behaviours (e.g. closing the drawer when navigating away, undo, batching). Pure structural refactor.
- E2E suite changes. `make test_e2e` is not in scope.

## Approach

Write a characterization test pass first against the existing public contract — `DraftActionBar`'s observable behaviour for SMS-row approve and edit-and-approve — so we have a regression net before changing anything. Then, in a single phase, lift drawer state into `DraftActionBar` and update the two mutation hooks to accept an `onRequestSmsShare` callback. Update `use-queue-actions.test.tsx` to reflect the new contract (no `useSmsShare` mock, callback assertions instead of blob assertions). Delete `useSmsShare` and the `useSmsShare`-only test in `use-sms-share.test.ts`; keep the pure-helper tests (`canUseNativeShare`, `shareNative`, `canUseSmsLink`) in place. Run all three Make verifications.

## Phase 1: Lift SMS share drawer state into `DraftActionBar`

### Changes

- `src/app/(application)/dashboard/_components/__tests__/draft-action-bar.test.tsx` — **new file**, characterization tests written *before* any production change. Cover: SMS-row approve + flag OFF + no native share opens the drawer with the correct body/messageId/leadName; drawer's `onApprove` calls `approve.mutate({ id, skipDispatch: true })`; drawer's `onCancel` closes the drawer without mutating; edit-flow's drawer-approve calls `editAndApprove.mutate({ id, body, skipDispatch: true })` with the *edited* body; `isPending` is true while the drawer is open. Mock `useApproveAction`/`useEditAndApproveAction`/`useDismissAction`/`useSnoozeAction` at the module boundary, render `DraftActionBar`, and drive the drawer through user-event clicks. These tests must pass against the *current* code before any other change in this phase, then continue to pass after the refactor.

- `src/app/(application)/dashboard/_components/use-queue-actions.ts` — remove the `useSmsShare()` call from both `useApproveAction` (line 105-112) and `useEditAndApproveAction` (line 205-212). Remove the `pendingEditRef` (line 213). Remove the `SmsShareState` type (line 92-99) and the `smsShareState` keys from both return statements (lines 163-170, 278-285). Add an options parameter — `useApproveAction({ onRequestSmsShare }: { onRequestSmsShare: (body: string, messageId: string, leadName: string) => void })` and `useEditAndApproveAction({ onRequestSmsShare }: ...)` — and call `onRequestSmsShare(...)` in place of the existing `openDrawer(...)` calls (lines 144, 254). Remove `onApproveDrawer`/`onCancelDrawer` from these hooks entirely; the drawer-approve mutation call now happens in `DraftActionBar`. Keep `handleApprove` and `editAndShareApprove` exported with the same external signatures.

- `src/app/(application)/dashboard/_components/use-sms-share.ts` — delete `useSmsShare()` (line 27-55). Keep `canUseNativeShare`, `shareNative`, `canUseSmsLink` exports as pure helpers in the same file. Remove the `"use client"` directive iff no remaining export needs it (the helpers are pure and don't — they can be imported into client or server modules; but `shareNative` calls `analytics.queue.smsShared` which uses PostHog, so leaving the directive is safe and correct).

- `src/app/(application)/dashboard/_components/draft-action-bar.tsx` — add inline state in the component (`useState` for `isDrawerOpen`, `pendingShare: { body, messageId, leadName, source: "approve" | "edit" } | null`). Pass `onRequestSmsShare` to both hooks. Replace the `smsShareState`-derived `isPending` reads (lines 33-34) with the local `isDrawerOpen`. Replace the `smsShareState` selection (lines 51-53) with direct reads from `pendingShare`. The `SmsShareDrawer`'s `onApprove` reads `pendingShare.source` and calls `approve.mutate({ id: pendingShare.messageId, skipDispatch: true })` or `editAndApprove.mutate({ id, body, skipDispatch: true })` accordingly, then closes the drawer. `onCancel` clears state without mutating.

- `src/app/(application)/dashboard/_components/__tests__/use-queue-actions.test.tsx` — remove the `useSmsShare` mock (lines 51-63 — keep `canUseNativeShare`, `shareNative`, `canUseSmsLink` mocks; drop the `useSmsShare` key). Replace `mockOpenDrawer`/`mockCloseDrawer` with a `mockRequestSmsShare` and pass it as `onRequestSmsShare` when constructing the hook (`useApproveAction({ onRequestSmsShare: mockRequestSmsShare })`). Update assertions: where the test asserts `openDrawer(body, id, leadName)` (lines 177-181, 248-252), assert `mockRequestSmsShare(body, id, leadName)`. Delete the test that exercises `hook.smsShareState.onApproveDrawer()` (lines 239-264) — that callback no longer lives on the hook; the equivalent assertion is now in `draft-action-bar.test.tsx` (added above).

- `src/app/(application)/dashboard/_components/__tests__/use-sms-share.test.ts` — delete the `describe("useSmsShare — leadName", ...)` block (lines 133-161). Keep all other describes (`canUseNativeShare`, `shareNative`, `canUseSmsLink`).

- `src/app/(application)/dashboard/_components/edit-dialog.tsx` — `EditMutation = ReturnType<typeof useEditAndApproveAction>` (line 18) becomes a different shape (no `smsShareState`). The fields `EditDialog` actually reads off it are `mutate`, `isPending`, `error` (lines 24-26) — all preserved. Update only if TS surfaces a mismatch; otherwise no change.

- *Verify before declaring done:* the `draft-action-bar.test.tsx` characterization tests written in step 1 still pass.

### Success

**Automated**

- [x] `make check` passes
- [x] `make test` passes
- [x] `make build` passes

**Manual**

- [x] `rg -n 'useSmsShare|SmsShareState|smsShareState' src/` returns zero matches.
- [x] `rg -n 'createContext|useContext' src/` continues to return only the unrelated tRPC server `createContext` in `src/app/api/trpc/[trpc]/route.ts:8`.
- [x] In dev (`make start`), with `sms-twilio-dispatch` flag OFF on a non-mobile / non-share-API browser: clicking "Approve" on an SMS draft row opens the SMS share drawer with the lead's first name in the title; the drawer's "Copy" button copies the message and approves; "Cancel" closes the drawer without approving.
- [x] Same flow but via "Edit" → save: the dialog closes, drawer opens with the *edited* body, drawer-approve calls editAndApprove with the edited body.

## References

- ADR: `docs/adr/adr012-context-providers-for-global-state-only.md`
- Design: `thoughts/designs/2026-05-04-context-providers-for-global-state-only.md`
- Prior plan (ADR + CLAUDE.md note): `thoughts/plans/2026-05-04-context-providers-for-global-state-only.md`
- Violating hook: `src/app/(application)/dashboard/_components/use-sms-share.ts:27`
- Violating wrappers: `src/app/(application)/dashboard/_components/use-queue-actions.ts:92,101,201`
- Consumer: `src/app/(application)/dashboard/_components/draft-action-bar.tsx:23-34,51-53,122-129`
- Drawer (already conformant): `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:20-27`
- Tests to update: `src/app/(application)/dashboard/_components/__tests__/use-queue-actions.test.tsx`, `__tests__/use-sms-share.test.ts`
- Tests to add: `src/app/(application)/dashboard/_components/__tests__/draft-action-bar.test.tsx`
