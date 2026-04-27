# ENG-152 — Keep Action Queue Row on Email Dispatch Failure

## Context

Approving an email-channel queue row currently flips `status` to `approved` *before* `dispatchEmail` runs (`src/server/api/routers/messages.ts:150-158`). When the Graph send throws (corrupt/expired token, 4xx/5xx, network), the user sees a "Failed to send email. Please try again." toast but the row is already terminal — it falls out of `listPending` and there is no UI path to retry. Same bug affects `editAndApprove` (`src/server/api/routers/messages.ts:176-189`). Visible to the Creation Homes pilot consultant; every transient Graph failure silently drops a message.

## Current State

- `approve` mutation: precondition check → status flip to `approved` → `dispatchEmail` (`src/server/api/routers/messages.ts:137-161`). The status write is committed before dispatch is attempted.
- `editAndApprove` mutation: same sequence with `status: "edited_and_approved"` and the body update folded into the same `update` call (`src/server/api/routers/messages.ts:163-192`).
- `dispatchEmail` (`src/server/dispatch/email-dispatch.ts:17-72`) sends via Graph, inserts a `conversations` row, and stamps `message_queue.sentAt`. On Graph failure it throws `TRPCError({ code: "INTERNAL_SERVER_ERROR" })` (or `PRECONDITION_FAILED` for `MsGraphNotConnectedError`). It does not currently touch `status` or `approvedAt`.
- Client `useApproveAction` calls `optimistic.restore` on error (`src/app/(application)/dashboard/_components/use-queue-actions.ts:105-108`), but `onSettled` invalidates `listPending`, which refetches and excludes the now-`approved` row (`src/app/(application)/dashboard/_components/use-queue-actions.ts:109-111`). The optimistic restore is wiped by the refetch.
- Existing unit test at `src/server/api/__tests__/messages-router.test.ts:606-628` asserts the *current* (buggy) order: "re-throws dispatch error; status update was already written before dispatch". This test must invert.
- Existing E2E spec covers happy-path dispatch only (`e2e/features/email-dispatch.spec.ts:88-130`); no failure-path coverage.
- E2E helper `seedMsGraphTokens` accepts an `accessToken` override and is suitable for seeding a deliberately invalid token (`e2e/utils/messages-helper.ts:183-210`).
- Helper `getMessageStatus(id)` exists for asserting DB state from E2E specs (`e2e/utils/messages-helper.ts:83-96`).

## Desired End State

- Approving an email row whose dispatch fails (invalid token, Graph 4xx/5xx, network error) leaves the row at its previous status (`pending` or `snoozed`) with `approvedAt = null`. The row remains in `listPending`. The error toast still surfaces.
- The same applies to `editAndApprove`: failed dispatch leaves the row at `pending`/`snoozed` with `body` and `originalBody` unchanged.
- Successful dispatch still flips the row to `approved` (or `edited_and_approved`), stamps `approvedAt` and `sentAt`, inserts the `conversations` row, and removes the row from `listPending` — no regression vs. today's happy path.
- The "Failed to send email. Please try again." toast is now truthful: clicking Approve again on the same row triggers a fresh dispatch attempt.
- `make check`, `make build`, `make test` green; `e2e/features/email-dispatch.spec.ts` covers the corrupt-token failure path.

## Out of Scope

- A dedicated "Retry" button or failure indicator on rows. The fix relies on the row staying pending so the existing Approve button serves as retry. UX polish (e.g., a "last attempt failed" badge) is a follow-up.
- A dispatch-failure log table or admin observability surface. The error toast + server logs are sufficient for the pilot.
- SMS dispatch (#129) — touching `messages.ts` for SMS is explicitly avoided here.
- Wrapping send + DB writes in a 2-phase commit / outbox pattern. The reorder accepts a small "sent-but-status-still-pending" window where a failed *post-dispatch* status update could let the user re-approve and double-send. The window is narrow (single DB write, no network) and the BCC-to-HubSpot reconciler already deduplicates timeline entries by `subject + timestamp`. Acceptable for pilot scale; revisit if it bites.

## Approach

Reorder both mutations: `loadActionableWithLead` → precondition check → `dispatchEmail` → `update messageQueue.set({ status, approvedAt, body? })`. Dispatch failure leaves the row untouched; dispatch success then commits the terminal status. `editAndApprove` passes `input.body` directly to `dispatchEmail` (rather than reading from the row) so the edited copy is what actually gets sent. SMS-channel rows (no dispatch) keep their existing single-write behaviour.

The reorder is small — it fits in one phase. Tests ship in the same phase per the TDD vertical-slice rule.

## Phase 1: Reorder dispatch before status flip

### Changes

- `src/server/api/routers/messages.ts:137-161` (`approve`) — for `channel === "email"`: run preconditions, then `dispatchEmail({ db, ctx, message, lead })`, then `update messageQueue.set({ status: "approved", approvedAt: new Date() })`. For `sms`, keep the current single-write path. Return the post-update row.
- `src/server/api/routers/messages.ts:163-192` (`editAndApprove`) — same reorder. Pass `input.body` to `dispatchEmail` (build a `messageForDispatch = { ...existing, body: input.body, subject: existing.subject }` so the edited copy is sent). On dispatch success, run the existing `update` that sets `status`, `body`, `originalBody`, `approvedAt`. For `sms`, keep the current single-write path.
- `src/server/dispatch/email-dispatch.ts:17-72` — no functional change; the helper already reads `message.body`/`message.subject`, so passing the edited body via the `message` arg works without a new param. Verify the `Message` type at `:8-11` accepts the synthesised object (it does — it's `Pick<..., "id" | "leadId" | "channel" | "subject" | "body">`).
- `src/server/api/__tests__/messages-router.test.ts:606-628` — invert the existing "status update was already written before dispatch" test:
  - Rename to `"dispatch failure leaves row non-terminal; status update is not called"`.
  - Assert: `mockDb.update` was **not** called (or, more precisely, `update().set()` was never invoked with `status: "approved"`).
  - Assert: dispatch error is re-thrown to the caller.
- `src/server/api/__tests__/messages-router.test.ts` — extend `messages.approve — email channel` and `messages.editAndApprove — email channel` describe blocks with:
  1. `dispatch fails → status update is never called` (covers token/network/Graph 5xx — they all surface as a thrown `TRPCError` from `dispatchEmail`).
  2. `dispatch succeeds → status update runs after dispatch` (assert call order via `mockDispatchEmail.mock.invocationCallOrder` vs the update mock's invocation order).
  3. `editAndApprove dispatch failure → body and originalBody are not written` (assert `set` not called with the edited body).
  4. `editAndApprove dispatches with input.body, not the existing row body` (assert `mockDispatchEmail` received `expect.objectContaining({ message: expect.objectContaining({ body: "Rewritten" }) })`).
- `e2e/features/email-dispatch.spec.ts` — new test `"approve fails when MS Graph token is invalid; row stays pending and is retryable"`:
  1. `seedEmailQueueItem(...)` with a unique suffix.
  2. `seedMsGraphTokens(session.userId, { accessToken: "invalid-token-for-failure-path" })` — token row exists so `checkEmailPreconditions` passes; the Graph call itself fails.
  3. Sign in, navigate to `/dashboard`.
  4. Click Approve on the seeded row.
  5. Assert: toast contains `/Failed to send email/i`.
  6. Assert: `queue.row(item.messageId)` remains visible after the toast settles.
  7. Assert: `getMessageStatus(item.messageId)` returns `status: "pending"`, `original_body: null` (and a separate assertion that `approvedAt` is null — extend `getMessageStatus` to return `approved_at` in this phase).
  8. *Recovery path:* `seedMsGraphTokens(session.userId, { accessToken: process.env.MS_GRAPH_TEST_ACCESS_TOKEN! })` to overwrite (the `ON CONFLICT DO UPDATE` at `e2e/utils/messages-helper.ts:204-209` handles this), click Approve again, assert the row disappears and the success toast shows. Gate the recovery half on `MS_GRAPH_TEST_ACCESS_TOKEN` the same way the existing happy-path test does (`e2e/features/email-dispatch.spec.ts:93-96`).
- `e2e/utils/messages-helper.ts:83-96` (`getMessageStatus`) — extend the returned shape with `approved_at: string | null` and the SELECT to include `approved_at`. Existing callers (none today outside the new spec) are unaffected.

### Success

**Automated**
- [ ] `make check` passes
- [ ] `make test` passes — inverted unit test plus the four new cases above all green
- [ ] `make build` passes
- [ ] `make test_e2e` passes — the new failure-path spec passes against a real DB; recovery half skips when `MS_GRAPH_TEST_ACCESS_TOKEN` is unset

**Manual**
- [ ] Connect a Microsoft account via `/api/auth/ms-graph/start`, then corrupt the token (`UPDATE ms_graph_tokens SET access_token = 'invalid' WHERE user_id = '<id>';`), open `/dashboard`, click Approve on an email row → toast shows the failure copy, row remains in the pending list. Confirm `SELECT status, approved_at, sent_at FROM message_queue WHERE id = '<id>';` shows `status='pending'`, `approved_at IS NULL`, `sent_at IS NULL`.
- [ ] Repeat with a working token → row disappears, toast says "Sent via email", `status='approved'`, `approved_at` and `sent_at` populated, `conversations` row inserted.
- [ ] Repeat the corrupt-token path with **Edit & Approve** → row stays pending; `body` and `original_body` unchanged in the DB.
- [ ] Re-approve the same row after restoring a working token → dispatch succeeds; no double-send (verify only one `conversations` row and one inbox delivery).
- [ ] `/design_review` — no UI changes in this PR, but eyeball the toast copy in the failure case to confirm "Failed to send email. Please try again." reads correctly now that "try again" is real.

## References

- Ticket: https://github.com/samjmarshall/www/issues/152
- Parent: #130 — `thoughts/plans/2026-04-25-ENG-130-hubspot-email-outlook-dispatch.md` (Phase 2 introduced the buggy ordering; manual test note at `:125` flagged the gap)
- Buggy ordering: `src/server/api/routers/messages.ts:150-158`, `:176-189`
- Dispatch helper: `src/server/dispatch/email-dispatch.ts:17-72`
- Optimistic-remove + invalidate: `src/app/(application)/dashboard/_components/use-queue-actions.ts:26-54`, `:105-111`
- Existing test to invert: `src/server/api/__tests__/messages-router.test.ts:606-628`
- E2E failure-path scaffolding: `e2e/features/email-dispatch.spec.ts:88-130`, `e2e/utils/messages-helper.ts:183-210`
