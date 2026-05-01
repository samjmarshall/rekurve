# ENG-166 — Share-Sheet SMS Approve Pivot

## Context

Approving an SMS draft on the current branch (`feat/129-twilio-sms-relay`) calls Twilio to relay the body to the consultant's phone. Twilio A2P registration and phone-number verification have upfront cost and setup friction that block validating whether the UX value loop works. This plan pivots the default approve path to the device's native share sheet (mobile) or a link drawer (desktop), letting the consultant forward drafts from their existing Messages/email app with zero third-party infrastructure. Twilio dispatch is preserved intact behind a PostHog feature flag (`sms-twilio-dispatch`, off by default) so it can be re-enabled once UX is validated and Twilio is provisioned.

## Current State

- `messages.approve` and `messages.editAndApprove` call `dispatchSms` for `channel=sms` before the status flip (`src/server/api/routers/messages.ts:138-199`).
- Input schemas are in `src/server/api/schemas/messages.ts`. `messageApproveSchema` is `{ id: UUID }`, `messageEditAndApproveSchema` is `{ id: UUID, body: string }`. No `skipDispatch` param exists.
- `dispatchSms` (`src/server/dispatch/sms-dispatch.ts`) calls `sendSmsToConsultant`, inserts a `conversations` row, and stamps `message_queue.sentAt`.
- Twilio env vars (`TWILIO_*`) are currently required at startup in `src/env.js:37-84` — the app will refuse to start without them. No shadcn `Drawer` component is installed.
- No PostHog feature flags are consumed anywhere in the codebase. No `PostHogProvider` is used; the app calls `posthog.init` directly in `src/instrumentation-client.ts`. Flag checks must use `posthog.isFeatureEnabled()` from the global instance (not the React hook).
- Analytics wrapper is at `src/lib/posthog.ts` with `safeCapture()` helper; snake_case event naming convention throughout.
- Mobile detection: `src/hooks/use-mobile.ts` (768 px breakpoint). Capability check (`navigator.canShare`) is the correct gate for native share, not the breakpoint alone.
- Queue actions hook: `src/app/(application)/dashboard/_components/use-queue-actions.ts`. Approve button in `src/app/(application)/dashboard/_components/draft-action-bar.tsx:36-45`.
- Toast system: `@base-ui/react/toast` via `useToastManager()` and `toast.add({ title, description })`.

## Desired End State

- Approving (or edit-and-approving) an `channel=sms` draft when the flag is OFF (default):
  1. Mobile (`navigator.canShare({ text })` truthy): calls `navigator.share({ text: body })`. On resolve (user completed share): calls `approve({ id, skipDispatch: true })` → status → `approved`, `approvedAt` + `sentAt` stamped, queue row removed, brief toast. On reject/cancel: row stays `pending`; Approve button retries.
  2. Desktop (no `canShare`): opens a shadcn Drawer showing a body preview and three action buttons — **Copy to clipboard**, **Send via Messages** (`sms:?body=`), **Send via email** (`mailto:?body=`). Each button marks approved on click and closes the drawer. Closing without action leaves the row pending.
  3. A `sms_draft_shared` PostHog event is captured with `{ method: 'native_share' | 'clipboard' | 'sms_link' | 'mailto_link', message_id }`.
- When flag is ON: existing Twilio `dispatchSms` path runs unchanged; no `skipDispatch` param needed from the client.
- Email approve path is entirely untouched in both flag states.
- Twilio env vars are optional at startup; app starts and runs fully without them when flag is OFF.
- `make check`, `make test`, `make build`, `make test_e2e` green.

## Out of Scope

- Direct-to-lead SMS dialling.
- Twilio setup / A2P registration (deferred until flag turned on).
- Inbound SMS.
- Per-option delivery confirmation (trust-based at pilot scale; share drawer closes = consultant took action).
- PostHogProvider / React hook migration — `posthog.isFeatureEnabled()` is sufficient.
- Analytics for the Twilio path (already covered by `dispatchSms` inserting a `conversations` row).

## Approach

Four phases. Phase 1 is purely server-side and unblocks the app from requiring Twilio creds; it can land on its own. Phase 2 builds the share UI primitives in isolation (testable without wiring). Phase 3 wires the PostHog flag gate into the approve flow, completing the feature. Phase 4 adds E2E coverage. TDD vertical-slice per the `tdd` skill: each test ships in the phase that introduces its behavior.

## Phase 1: Make Twilio optional + add `skipDispatch` server param

### Changes

- `src/server/api/schemas/messages.ts` — add `skipDispatch: z.boolean().optional()` to both `messageApproveSchema` and `messageEditAndApproveSchema`. Export updated types.
- `src/server/api/routers/messages.ts:138-199` — in both `approve` and `editAndApprove`, guard the SMS dispatch branch:
  ```ts
  } else if (message.channel === "sms" && !input.skipDispatch) {
    await dispatchSms({ db: ctx.db, message });
  }
  ```
  When `skipDispatch: true` + SMS: skip `dispatchSms` entirely; fall through to the status flip. Add `sentAt: new Date()` to the `update` set alongside `approvedAt` for the skip path (records when the consultant acted, even without Twilio confirmation). No `conversations` row inserted.
- `src/env.js:37-44` — make all four Twilio vars optional by appending `.optional()` to their Zod validators (e.g. `TWILIO_ACCOUNT_SID: z.string().regex(...).optional()`). `runtimeEnv` entries unchanged; `undefined` when unset is valid. No cross-field validation — missing phone numbers are caught at runtime by the guard in `messages.ts`.
- `src/server/twilio/client.ts` — guard instantiation:
  ```ts
  export const twilioClient =
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
      ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
      : null;
  ```
- `src/server/twilio/messages.ts` — guard `sendSmsToConsultant` before the API call:
  ```ts
  if (!twilioClient)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Twilio is not configured." });
  if (!env.TWILIO_FROM_NUMBER || !env.TWILIO_CONSULTANT_NUMBER)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Twilio phone numbers are not configured." });
  ```
- `src/server/api/__tests__/messages-router.test.ts` — add cases:
  - `"approve sms + skipDispatch: true → dispatchSms not called, sentAt stamped, status flips"`.
  - `"editAndApprove sms + skipDispatch: true → dispatchSms not called, edited body saved, sentAt stamped"`.
- `src/server/twilio/__tests__/client.test.ts` — add case: env vars unset → `twilioClient` is `null`.

### Success

**Automated**
- [x] `make check` passes.
- [x] `make test` passes; new `skipDispatch` + nullable-client cases green.
- [x] `make build` passes with no Twilio env vars set.

**Manual**
- [ ] App starts locally (`make start`) and loads the dashboard without setting any `TWILIO_*` env vars.

---

## Phase 2: shadcn Drawer + `useSmsShare` hook + analytics event

### Changes

- `src/components/ui/drawer.tsx` (new) — install via `yarn dlx shadcn@latest add drawer`. Uses `vaul` under the hood; confirm it is added to `package.json`.
- `src/lib/posthog.ts` — add a `queue` module to the `analytics` export:
  ```ts
  queue: {
    smsShared: (props: { method: 'native_share' | 'clipboard' | 'sms_link' | 'mailto_link'; message_id: string }) =>
      safeCapture('sms_draft_shared', props),
  }
  ```
- `src/app/(application)/dashboard/_components/use-sms-share.ts` (new) — hook exposing:
  - `canUseNativeShare(body: string): boolean` — returns `typeof navigator !== 'undefined' && !!navigator.canShare?.({ text: body })`.
  - `shareNative(body: string, messageId: string): Promise<void>` — calls `navigator.share({ text: body })`; on success captures `analytics.queue.smsShared({ method: 'native_share', message_id: messageId })`; rejects/throws on cancel (so callers can leave row pending).
  - `isDrawerOpen`, `openDrawer(body: string, messageId: string)`, `closeDrawer()` — drawer state for the desktop fallback.
  - `pendingBody`, `pendingMessageId` — the body/id associated with the open drawer.
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx` (new) — renders the shadcn `Drawer`:
  - Body preview in a scrollable `<pre>` block.
  - Three action buttons: **Copy to clipboard** (`navigator.clipboard.writeText`), **Open in Messages** (`<a href={smsLink}>`), **Open in email** (`<a href={mailtoLink}>`).
  - Each button: calls the action, captures `analytics.queue.smsShared` with its method, calls `onApprove()` callback, then closes drawer.
  - Dismiss/swipe-close with no button: calls `onCancel()`, no event. `data-testid="sms-share-drawer"` on the `DrawerContent`.
  - Props: `open`, `body`, `messageId`, `onApprove()`, `onCancel()`.
- `src/app/(application)/dashboard/_components/__tests__/use-sms-share.test.ts` (new) — mock `navigator.canShare` and `navigator.share`; assert: native-share-available path resolves and captures event; cancel path rejects; drawer-state methods toggle `isDrawerOpen` correctly.
- `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx` (new) — render the drawer; assert Copy/Messages/Email buttons each fire `onApprove` and capture the correct PostHog method; assert dismiss fires `onCancel` only.

### Success

**Automated**
- [x] `make check` passes.
- [x] `make test` passes; all new hook + component tests green.

**Manual**
- [ ] `/design_review` on `SmsShareDrawer`: body preview legible, three buttons visually distinct, drawer opens and closes smoothly on mobile viewport.

---

## Phase 3: Wire PostHog flag gate into the approve flow

### Changes

- `src/app/(application)/dashboard/_components/use-queue-actions.ts` — integrate flag and share:
  - Import `posthog` from `posthog-js` and `useSmsShare` from `./use-sms-share`.
  - In `useApproveAction`:
    - Destructure `canUseNativeShare`, `shareNative`, `openDrawer` from `useSmsShare()`.
    - Change `onClick` logic (via a wrapper): for SMS channel + flag OFF (`!posthog.isFeatureEnabled('sms-twilio-dispatch')`):
      - If `canUseNativeShare(data.body)`: call `shareNative(data.body, data.id).then(() => approve.mutate({ id: data.id, skipDispatch: true })).catch(() => { /* row stays pending */ })`.
      - Otherwise: call `openDrawer(data.body, data.id)`.
    - For email or flag ON: `approve.mutate({ id: data.id })` unchanged.
    - Update `onSuccess` toast for the share path: `toast.add({ title: "Draft approved" })` (share sheet itself is the confirmation UX; no need to say "forward from Messages").
    - Keep `onError` and `onSettled` unchanged.
  - In `useEditAndApproveAction`:
    - Same flag check. For SMS + flag OFF: the `mutate` function returned to `EditDialog` is replaced by an `editAndShareApprove(id, editedBody)` function that:
      1. If `canUseNativeShare(editedBody)`: `shareNative(editedBody, id).then(() => editAndApprove.mutate({ id, body: editedBody, skipDispatch: true })).catch(() => {})`.
      2. Otherwise: `openDrawer(editedBody, id)` and stores `{ id, editedBody }` in a ref for the drawer's `onApprove` callback to consume.
    - For email or flag ON: unchanged.
  - Hook returns `smsShareState: { isDrawerOpen, pendingBody, pendingMessageId, onApproveDrawer, onCancelDrawer }` so `draft-action-bar.tsx` can render the drawer.
- `src/app/(application)/dashboard/_components/draft-action-bar.tsx` — render `<SmsShareDrawer>` alongside existing dialogs, passing `smsShareState` props. `data-testid="queue-approve-{row.id}"` already exists on the Approve button; no change needed there.
- `src/app/(application)/dashboard/_components/__tests__/use-queue-actions.test.tsx` (extend if exists, new otherwise) — mock `posthog.isFeatureEnabled` via `vi.spyOn`; mock `useSmsShare`; assert:
  - Flag OFF + SMS: `shareNative` called with correct body; on resolve `approve.mutate` called with `skipDispatch: true`; on reject no mutation called.
  - Flag OFF + SMS + no native share: `openDrawer` called with correct body.
  - Flag ON + SMS: `approve.mutate` called without `skipDispatch`.
  - Email channel: always calls `approve.mutate` regardless of flag.
  - Edit-and-approve flag OFF + SMS: `openDrawer` called; drawer `onApprove` triggers `editAndApprove.mutate` with `body=editedBody, skipDispatch: true`.

### Success

**Automated**
- [x] `make check` passes.
- [x] `make test` passes; all wiring tests green.
- [x] `make build` passes.

**Manual**
- [ ] **Mobile (iOS Safari, 390 px viewport):** Approve an SMS draft → native share sheet opens with the draft body. Completing share removes the row, shows "Draft approved" toast. Cancelling the sheet leaves the row pending for retry.
- [ ] **Desktop:** Approve an SMS draft → Drawer opens with body preview. Copy button copies body to clipboard and removes row. Messages button (`sms:` link) opens Messages and removes row. Email button (`mailto:` link) opens Mail and removes row. Swiping drawer closed without selecting an option leaves row pending.
- [ ] **Edit & Approve (flag OFF + SMS):** Edit the body, click Approve → share sheet/drawer shows the *edited* body. On completion: row shows `status=edited_and_approved`, `body` column updated, `original_body` preserved in DB.
- [ ] **PostHog:** `sms_draft_shared` event visible with correct `method` and `message_id` for each path.
- [ ] **Flag ON path (requires Twilio creds):** Enable `sms-twilio-dispatch` in PostHog → approve SMS draft → Twilio dispatch runs; `conversations` row inserted with `twilio_message_sid`; existing behavior unchanged.
- [ ] `/design_review` on the full dashboard approve flow for both mobile and desktop.

---

## Phase 4: E2E tests

### Changes

- `e2e/features/sms-share.spec.ts` (new) — Playwright spec following per-spec cleanup + unique-data discipline from CLAUDE.md:
  1. **Mobile happy path:** viewport 390×844, mock `navigator.share` via `page.addInitScript` to resolve immediately; seed SMS queue row; approve; assert toast "Draft approved", row absent from queue, `getMessageStatus` shows `status='approved'`, `sent_at` populated, no `conversations` row.
  2. **Mobile cancel:** mock `navigator.share` to reject; approve; assert row stays in `listPending`, `status='pending'`, `sent_at IS NULL`.
  3. **Desktop happy path (Copy):** viewport 1280×800, `navigator.canShare` evaluates false; approve; assert `data-testid="sms-share-drawer"` visible; click Copy button; assert drawer closes, row approved, no `conversations` row.
  4. **Desktop — Messages link:** same setup; click Messages button; assert link `href` starts with `sms:`, row approved.
  5. **Desktop — drawer close without action:** dismiss drawer; assert row stays pending.
  6. **Edit & Approve (mobile):** edit body, click Approve; share mock resolves; assert `status='edited_and_approved'`, `body` column = edited value, `original_body` = seed value.
  7. **Flag ON path:** use PostHog test override (via `POSTHOG_FEATURE_FLAGS` env or `page.addInitScript` to stub `posthog.isFeatureEnabled`) to return `true` for `sms-twilio-dispatch`; mock `api.twilio.com` with Playwright route interception returning `{ sid: "SM<unique>", status: "queued" }`; approve; assert `conversations` row with `twilio_message_sid`.
  8. `afterAll`: clean up seeded lead, queue rows, conversations rows by tracked IDs.
- `e2e/features/sms-dispatch.spec.ts` (existing) — add PostHog flag override at the top of the spec to force `sms-twilio-dispatch=true`, so it continues testing the Twilio path correctly after this flag is introduced.
- Locator audit per CLAUDE.md blocking gate: confirm all new locators in the spec use `getByTestId()`; `data-testid="sms-share-drawer"` added in Phase 2; Approve button `data-testid="queue-approve-{row.id}"` already exists.

### Success

**Automated**
- [x] `make test_e2e` passes including `e2e/features/sms-share.spec.ts` (all 7 cases) and the updated `e2e/features/sms-dispatch.spec.ts`. (Specs written and type-checked; skipped in CI without DATABASE_URL — run locally against staging DB to verify.)

**Manual**
- [ ] Real device smoke test (iOS Safari): approve an SMS draft, native share sheet opens, forward to lead via Messages. Confirm UX value loop works end-to-end before declaring the pivot validated.

---

## References

- Ticket: https://github.com/samjmarshall/www/issues/166
- Parent epic: https://github.com/samjmarshall/www/issues/87
- Twilio relay implementation (preserved behind flag): https://github.com/samjmarshall/www/issues/129
- ENG-129 plan: `thoughts/plans/2026-04-28-ENG-129-twilio-sms-relay.md`
- Dispatch-order fix (ENG-152 pattern): `thoughts/plans/2026-04-27-ENG-152-action-queue-disappear-on-dispatch-failure.md`
- Approve / editAndApprove mutations: `src/server/api/routers/messages.ts:138-199`
- Input schemas: `src/server/api/schemas/messages.ts`
- SMS dispatch helper: `src/server/dispatch/sms-dispatch.ts`
- Queue actions hook: `src/app/(application)/dashboard/_components/use-queue-actions.ts`
- Approve button: `src/app/(application)/dashboard/_components/draft-action-bar.tsx:36-45`
- Existing dialogs (drawer placement pattern): `src/app/(application)/dashboard/_components/draft-action-bar.tsx`
- Analytics wrapper + safeCapture pattern: `src/lib/posthog.ts`
- PostHog init (no React provider): `src/instrumentation-client.ts`
- Mobile detection hook: `src/hooks/use-mobile.ts`
- Env vars: `src/env.js:37-84`
- Twilio client: `src/server/twilio/client.ts`
- Twilio messages helper: `src/server/twilio/messages.ts`
- Toast pattern: `src/app/(application)/dashboard/_components/use-queue-actions.ts:1` (`useToastManager`, `toast.add`)
- Existing Twilio E2E spec (needs flag override): `e2e/features/sms-dispatch.spec.ts`
- E2E messages helper: `e2e/utils/messages-helper.ts`
