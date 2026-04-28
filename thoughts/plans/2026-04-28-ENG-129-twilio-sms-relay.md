# ENG-129 — Twilio SMS Relay-to-Consultant on Approval

## Context

Approving a `channel=sms` draft currently flips `message_queue.status` and shows an "Approved" toast but dispatches nothing — the SMS path is a no-op (`src/server/api/routers/messages.ts:146,169`, `src/app/(application)/dashboard/_components/use-queue-actions.ts:99-103,157-163`). #129 wires Twilio to relay the approved draft body to a single fixed consultant phone (`env.TWILIO_CONSULTANT_NUMBER`); the consultant then forwards it from their personal Messages app. Email (#130) is already shipped via Outlook+BCC; this lands the matching SMS half of the Epic 3 value loop.

The relay-to-consultant model (not direct-to-lead) is deliberate per the ticket: leads already have the consultant's personal number, A2P/10DLC consumer registration is sidestepped, and the data shape is forward-compatible with ADR-001 (iMessage device-bridge) which will replace the manual paste step.

## Current State

- `messages.approve` and `messages.editAndApprove` only branch on `channel === "email"`; `sms` falls through to a status-flip with no dispatch (`src/server/api/routers/messages.ts:146-149,169-177`).
- Email dispatch order was corrected by ENG-152: dispatch → status flip, so failures leave the row at `pending` and the existing Approve button serves as retry (`src/server/api/routers/messages.ts:137-158,160-191`, `thoughts/plans/2026-04-27-ENG-152-action-queue-disappear-on-dispatch-failure.md`). SMS will follow the same shape.
- `src/server/dispatch/email-dispatch.ts:17-72` is the canonical dispatch helper pattern: send → insert `conversations` row → stamp `message_queue.sentAt`. Failures rethrow as `TRPCError` and skip the DB writes.
- `conversations` schema has `messageQueueId`, `channel`, `direction`, `deliveryMethod`, `subject`, `body`, `hubspotActivityId` (`src/server/db/schema/conversations.ts:7-26`). No column exists for a Twilio Message SID or a delivery-status string.
- `src/server/hubspot/{client,index}.ts:1-23` is the existing pattern for a single externally-instantiated SDK client + barrel re-exports.
- `src/app/api/hubspot/webhook/route.ts:29-77` is the existing pattern for a signed webhook: header presence check → timestamp freshness → SDK signature verify → 401 on failure → process events → 200 even on per-event errors to avoid retry storms.
- `src/server/api/__tests__/messages-router.test.ts:644` asserts the *current* SMS behaviour ("status flips, dispatch is not called"); this must invert.
- `e2e/utils/messages-helper.ts:57-81` already supports seeding `channel=sms` queue rows; `getMessageStatus` returns `status, body, original_body, snoozed_until, approved_at` (`:83-96`).
- `src/app/(application)/dashboard/_components/use-queue-actions.ts:99-103,157-163` shows `"Approved"` for SMS with a `// SMS dispatch lands in #129` placeholder comment.
- No `twilio` package installed (`package.json:43-83`).

## Desired End State

- Approving (or edit-and-approving) a `channel=sms` draft:
  1. Calls Twilio's `messages.create({ to: env.TWILIO_CONSULTANT_NUMBER, from: env.TWILIO_FROM_NUMBER, body, statusCallback: "<deployment>/api/twilio/status" })`.
  2. On success: inserts an outbound `conversations` row (`direction=outbound`, `deliveryMethod=sms`, `messageQueueId`, `body`, `twilioMessageSid` populated) and stamps `message_queue.sentAt`. **Then** flips `status` to `approved`/`edited_and_approved` and stamps `approvedAt`.
  3. On Twilio failure: row stays at `pending`/`snoozed`, no `conversations` row, no `sentAt`, error rethrown as `TRPCError({ code: "INTERNAL_SERVER_ERROR" })`, toast surfaces in the queue UI, the row remains in `listPending` so the consultant can retry.
- The recipient is **never** `lead.phone` — the helper has no per-lead dialing surface.
- Email branch unchanged; SMS falls through correctly with no regression to email.
- `/api/twilio/status` validates `X-Twilio-Signature` via the SDK; rejects with 403 on failure; on valid callbacks updates the `conversations` row whose `twilioMessageSid` matches with the latest `MessageStatus` value (e.g., `delivered`, `failed`, `undelivered`).
- Twilio env vars validated in `src/env.js`, read via `env` from `~/env`, and present (sensitive where appropriate) in Vercel Preview + Production.
- `make check`, `make build`, `make test`, `make test_e2e` green.

## Out of Scope

- **Direct-to-lead SMS** — superseded by ADR-001.
- **iMessage via device-bridge** — separate ticket once ADR-001 is accepted.
- **Inbound SMS** — replies stay in the consultant's personal Messages app for MVP. No webhook for inbound, no triage.
- **In-app confirmation that the consultant relayed the draft** — trust-based at pilot scale per the ticket.
- **Per-consultant Twilio numbers** — single fixed recipient is sufficient for the single-consultant pilot.
- **Messaging-service SID config** — sticking with `TWILIO_FROM_NUMBER` only for pilot simplicity. Swap is small if delivery issues surface.
- **Live HubSpot/CRM activity logging for SMS** — not in the AC; if needed later, can be added by extending the dispatch helper.
- **Status-callback retry / dead-lettering / admin failure surface** — beyond signature validation + best-effort row update, the callback returns 200 and logs.
- **A "Retry" button** — unchanged from email path; the row staying pending on failure means the existing Approve button acts as retry.

## Approach

Three phases. Phase 1 establishes the Twilio integration in isolation (env vars, client, helper) so it is unit-testable before any router wiring. Phase 2 wires dispatch into `messages.ts` matching the ENG-152 dispatch-before-status-flip order, plus the schema additions to `conversations` (`twilio_message_sid`, `delivery_status`). Phase 3 adds the signed status callback route. Tests ship in the phase that introduces the behaviour (vertical-slice TDD per the `tdd` skill); Drizzle is mocked wholesale via the chainable-mock pattern from `src/server/dispatch/__tests__/email-dispatch.test.ts:32-72`; Twilio SDK is module-mocked via `rs.doMock("../client", ...)` matching `src/server/hubspot/__tests__/contacts.test.ts:8-39`.

## Phase 1: Twilio client + `sendSmsToConsultant` helper

### Changes

- `package.json` — add `twilio@^5.x` (latest 5.x). Pin exactly per the existing convention at `package.json:48` (`@hubspot/api-client: 13.5.0`). Run `make install` to update `yarn.lock`.
- `src/env.js:9-37,53-72` — add server-side env vars with T3 validation, mirroring `HUBSPOT_ACCESS_TOKEN` / `HUBSPOT_BCC_ADDRESS` shape:
  - `TWILIO_ACCOUNT_SID: z.string().regex(/^AC[a-f0-9]{32}$/, "Must be an AC-prefixed Twilio Account SID")`
  - `TWILIO_AUTH_TOKEN: z.string().min(1)` *(sensitive)*
  - `TWILIO_FROM_NUMBER: z.string().regex(/^\+\d{8,15}$/, "Must be E.164 (e.g. +14155551234)")`
  - `TWILIO_CONSULTANT_NUMBER: z.string().regex(/^\+\d{8,15}$/, "Must be E.164")`
  - All four added to `runtimeEnv` per the existing destructure.
- `src/server/twilio/client.ts` (new) — instantiate the Twilio Node SDK once, mirroring `src/server/hubspot/client.ts:1-7`:
  ```ts
  import twilio from "twilio";
  import { env } from "~/env";
  export const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  ```
- `src/server/twilio/messages.ts` (new) — `sendSmsToConsultant(body: string, opts?: { statusCallback?: string }): Promise<{ sid: string; status: string; sentAt: Date }>`. Always passes `to: env.TWILIO_CONSULTANT_NUMBER` and `from: env.TWILIO_FROM_NUMBER` — no per-lead dialing. Returns the Twilio Message SID, status (e.g., `queued`, `sent`), and a captured `sentAt = new Date()`. Throws on Twilio API errors (do not swallow).
- `src/server/twilio/index.ts` (new) — barrel re-exports `twilioClient`, `sendSmsToConsultant`. Mirrors `src/server/hubspot/index.ts:1-23`.
- `src/server/twilio/__tests__/messages.test.ts` (new) — module-mock unit tests using `rs.doMock("../client", ...)` (mirror `src/server/hubspot/__tests__/contacts.test.ts:1-40`). Cases:
  1. `sendSmsToConsultant("hi")` calls `twilioClient.messages.create` with `to=env.TWILIO_CONSULTANT_NUMBER`, `from=env.TWILIO_FROM_NUMBER`, `body="hi"`, no per-lead `to`.
  2. Recipient is **never** `lead.phone` — the helper has no signature for it; verify TypeScript surface accepts only `(body, opts?)`.
  3. Forwards the optional `statusCallback` URL through to `messages.create` when provided.
  4. Returns the Twilio SID, status, and a `sentAt` `Date`.
  5. Propagates Twilio errors (no swallow).
- `src/server/twilio/__tests__/client.test.ts` (new) — module shape smoke test (`twilioClient` exported, instantiated against the mocked SDK with the env values).

### Success

**Automated**
- [ ] `make check` passes (typecheck + lint).
- [ ] `make test` passes; new tests under `src/server/twilio/__tests__/` all green.
- [ ] `make build` passes.

**Manual**
- [ ] Add `TWILIO_*` to local `.env.local` via `make env_pull` after pushing them to Vercel Preview/Production. Mark `TWILIO_AUTH_TOKEN` `--sensitive` per the CLAUDE.md rule.
- [ ] In a node REPL or temporary script, call `sendSmsToConsultant("ENG-129 ping")` against a real Twilio sandbox; SMS arrives on the consultant's phone with the exact body, no prefix/suffix.

## Phase 2: Wire SMS dispatch into the messages router (+ schema columns)

### Changes

- `src/server/db/schema/conversations.ts:7-26` — add two nullable columns:
  - `twilioMessageSid: text("twilio_message_sid")`
  - `deliveryStatus: text("delivery_status")`
  - Add an index on `twilio_message_sid` so the status webhook can look up rows: `index("conversations_twilio_sid_idx").on(table.twilioMessageSid)`.
- `drizzle/000X_<name>.sql` — generated via `make db_generate`. Apply via `make db_migrate` per CLAUDE.md (never `db:push`).
- `src/server/dispatch/sms-dispatch.ts` (new) — single function `dispatchSms({ db, message }): Promise<{ conversationId: string }>` mirroring `email-dispatch.ts:17-72`:
  1. Builds the status-callback URL: `${env.BETTER_AUTH_URL}/api/twilio/status` (re-uses the deploy-aware host already validated in `env.js:12-22`).
  2. Calls `sendSmsToConsultant(message.body, { statusCallback })`. Captures `{ sid, sentAt }`.
  3. On Twilio error: rethrows as `TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send SMS. Please try again.", cause: err })`. **Skips** all DB writes.
  4. On success: inserts the `conversations` row (`leadId: message.leadId`, `messageQueueId: message.id`, `channel: "sms"`, `direction: "outbound"`, `deliveryMethod: "sms"`, `body: message.body`, `twilioMessageSid: sid`, `deliveryStatus: status`, `subject: null`, `hubspotActivityId: null`). Updates `message_queue.sentAt`. Returns `{ conversationId }`.
- `src/server/dispatch/__tests__/sms-dispatch.test.ts` (new) — mirror `email-dispatch.test.ts`. Cases:
  1. Calls `sendSmsToConsultant` with the draft body and the `statusCallback` URL.
  2. Inserts the `conversations` row with `direction=outbound`, `deliveryMethod=sms`, `messageQueueId=msg.id`, `body=msg.body`, `twilioMessageSid=<sid>`, `deliveryStatus=<status>`.
  3. Stamps `messageQueue.sentAt` on success.
  4. Returns `conversationId` from the insert.
  5. Twilio error → `TRPCError(INTERNAL_SERVER_ERROR)`; insert/update **not** called.
- `src/server/api/routers/messages.ts:137-158,160-191` — extend the existing email branches:
  - `approve`: after `loadActionableWithLead` + email branch, add `if (message.channel === "sms") { await dispatchSms({ db: ctx.db, message }); }` ahead of the `update messageQueue.set({ status: "approved", approvedAt: new Date() })` call. Order matches the ENG-152 fix (dispatch → status flip).
  - `editAndApprove`: same shape; pass `{ ...existing, body: input.body }` as `message` so the edited body is what relays. Preserve the existing `originalBody` write.
  - SMS dispatch failure: `TRPCError` propagates, status update is skipped, row stays `pending`/`snoozed`.
- `src/server/api/__tests__/messages-router.test.ts` —
  - Add `mockDispatchSms = rs.fn().mockResolvedValue({ conversationId: "conv-456" });` to `beforeEach` and `rs.doMock("~/server/dispatch/sms-dispatch", () => ({ dispatchSms: mockDispatchSms }))`.
  - **Invert** the existing test at `:644` (`"sms channel: status flips, dispatch is not called"` → `"sms channel: dispatch runs, then status flips"`). Assert `mockDispatchSms` was called once with `{ db: <mockDb>, message: expect.objectContaining({ id: MSG_ID, body: "Original draft body" }) }`, and that the status update ran *after* via `mockDispatchSms.mock.invocationCallOrder[0] < mockUpdate.mock.invocationCallOrder[0]`.
  - Add: `"sms channel: dispatch failure leaves row pending; status update is not called"` — `mockDispatchSms.mockRejectedValue(new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send SMS. Please try again." }))`, assert the caller throws and `mockDb.update` was never invoked.
  - Add: `"editAndApprove sms: dispatches with input.body, not the existing row body"` — assert `mockDispatchSms` received `expect.objectContaining({ message: expect.objectContaining({ body: "Edited body" }) })`.
  - Add: `"editAndApprove sms dispatch failure → body and originalBody are not written"` — mirror the email parallel test from ENG-152.
- `src/app/(application)/dashboard/_components/use-queue-actions.ts:97-103` (`useApproveAction.onSuccess`) — replace the SMS placeholder branch:
  ```ts
  toast.add({
    title: "Sent to your phone",
    description: "Forward it to the lead from Messages.",
  });
  ```
  Same change at `:151-163` for `useEditAndApproveAction`. Remove the `// SMS dispatch lands in #129` comment.
- `src/app/(application)/dashboard/_components/__tests__/use-queue-actions.test.tsx` (extend if it exists, otherwise the toast change is covered by E2E in Phase 3).

### Success

**Automated**
- [ ] `make check` passes.
- [ ] `make test` passes; inverted unit test plus new dispatch + router tests all green.
- [ ] `make build` passes.
- [ ] `make db_generate` produced exactly one new migration with two `ADD COLUMN` statements + the new index; `make db_migrate` applied cleanly against a Neon dev branch.

**Manual**
- [ ] Seed an `sms` queue row via `seedPendingMessage({ leadId, channel: "sms", body: "ENG-129 dispatch test" })` (`e2e/utils/messages-helper.ts:57-81`); approve via the dashboard. SMS arrives on `TWILIO_CONSULTANT_NUMBER` with the exact body, no prefix/footer. `SELECT twilio_message_sid, delivery_status, body FROM conversations WHERE message_queue_id = '<id>'` shows the SID populated and `body` matching. `SELECT status, sent_at FROM message_queue WHERE id = '<id>'` shows `status='approved'`, `sent_at` not null.
- [ ] With Twilio creds invalidated (e.g., set `TWILIO_AUTH_TOKEN=bogus` locally and restart), approve again — toast surfaces "Failed to send SMS. Please try again.", row stays in `listPending`, `SELECT status, sent_at FROM message_queue` shows `status='pending'`, `sent_at IS NULL`, and no `conversations` row exists.
- [ ] Restore a working token, click Approve on the same row → succeeds; only one `conversations` row exists, only one SMS arrives.
- [ ] Edit & Approve flow: edit the body to a new value, approve — the SMS that arrives matches the *edited* body. With creds broken, body and `original_body` remain unchanged in the DB.
- [ ] `/design_review` for the new toast copy on the dashboard.

## Phase 3: Twilio status callback route

### Changes

- `src/app/api/twilio/status/route.ts` (new) — `POST` handler mirroring `src/app/api/hubspot/webhook/route.ts:29-77`:
  1. Read `X-Twilio-Signature` header. If missing, return `403`.
  2. Read the request body as form-encoded (`request.formData()` — Twilio status callbacks are `application/x-www-form-urlencoded`, not JSON).
  3. Validate using `twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, request.url, paramsObject)`. Return `403` on invalid.
  4. Extract `MessageSid` and `MessageStatus` from the form body.
  5. `db.update(conversations).set({ deliveryStatus: messageStatus }).where(eq(conversations.twilioMessageSid, messageSid))`.
  6. Return `200 { received: true }` regardless of whether a row was found (idempotency; Twilio does not need our internal state). Log when no row matches.
  7. Wrap per-event work in try/catch and return `200` on internal errors to prevent Twilio retry storms (matches the HubSpot webhook pattern at `src/app/api/hubspot/webhook/route.ts:65-73`).
- `src/app/api/twilio/status/__tests__/route.test.ts` (new) — module-mock unit tests, mirror `src/app/api/hubspot/webhook/__tests__/route.test.ts:1-80`. Cases:
  1. Missing `X-Twilio-Signature` header → 403, no DB writes.
  2. `validateRequest` returns `false` → 403, no DB writes.
  3. Valid signature with `MessageSid=SMxxx`, `MessageStatus=delivered` → `db.update` called with `deliveryStatus: "delivered"` where `twilioMessageSid = "SMxxx"`; 200 returned.
  4. Valid signature with `MessageStatus=failed` → row updated to `failed`.
  5. Valid signature, unknown SID (no row matches) → 200; update is still called (idempotent no-op via `where`); log line emitted.
  6. Internal exception during DB update → 200 returned anyway; error logged.
- `e2e/features/sms-dispatch.spec.ts` (new) — Playwright spec, follows the per-spec cleanup + unique-data discipline from CLAUDE.md:
  1. Seed a lead + `channel=sms` queue row with a unique body suffix.
  2. Mock Twilio at the network layer (Playwright route interception against `api.twilio.com/2010-04-01/.../Messages.json`) — return a synthetic `{ sid: "SM<unique>", status: "queued" }`.
  3. Sign in, navigate to `/dashboard`, click Approve.
  4. Assert toast `"Sent to your phone"`. Assert the row disappears from the queue.
  5. Assert via `getMessageStatus(item.messageId)` that `status='approved'`, `approved_at` and `sent_at` populated.
  6. Assert a `conversations` row exists for `messageQueueId` with `twilio_message_sid='SM<unique>'`, `delivery_status='queued'`, `body=<seeded body>`.
  7. Replay a synthetic Twilio status callback by POSTing a signed form payload to `/api/twilio/status` (`MessageSid=SM<unique>`, `MessageStatus=delivered`) — sign using `twilio.validateRequest`'s reverse via the SDK's signing helper (`twilio.RequestValidator(token).getValidationSignature(url, params)`).
  8. Re-query the `conversations` row; assert `delivery_status='delivered'`.
  9. Failure-path test: Twilio mock returns 500 — assert toast contains "Failed to send SMS", row remains in `listPending`, `getMessageStatus` shows `status='pending'`, `sent_at IS NULL`, and no `conversations` row was inserted.
  10. Bad-signature test: POST `/api/twilio/status` with a tampered signature → 403, row's `delivery_status` unchanged.
  11. `afterAll` cleans up the seeded lead, queue rows, and conversations rows by tracked IDs (no broad search filters per CLAUDE.md E2E section).
- `e2e/utils/messages-helper.ts` — extend with `getConversationsForMessage(messageQueueId): Promise<Array<{ id, twilio_message_sid, delivery_status, body }>>` and `cleanupConversationsForLead(leadId)` helpers (used by the new spec).
- `e2e/utils/messages-helper.ts` E2E locator audit — the new spec's locators must use `getByTestId()` per the CLAUDE.md blocking gate. Add `data-testid="queue-toast-sms-success"` to the new toast in `use-queue-actions.ts` if no testid is exposed by the toast manager already.
- `README.md` — add a "Twilio setup" subsection (env vars, what `--sensitive` to mark, where to configure the status callback URL in the Twilio console — *deployment URL + `/api/twilio/status`*; note the relay-to-consultant model so future readers don't try to dial leads).

### Success

**Automated**
- [ ] `make check` passes.
- [ ] `make test` passes; the six route tests + the dispatch tests + the inverted router tests are all green.
- [ ] `make build` passes.
- [ ] `make test_e2e` passes including `e2e/features/sms-dispatch.spec.ts`. SMS-mocked happy path, failure-path, and signature-rejection cases all green; cleanup leaves no orphan rows.

**Manual**
- [ ] In Twilio console → Messaging → Services or the purchased number's settings, set the status callback URL to `<deploy-host>/api/twilio/status` for both Preview and Production. Verify by approving a real draft against a Twilio test credential and watching the row's `delivery_status` flip from `queued` → `sent` → `delivered` over ~5–30s.
- [ ] Replay a captured Twilio status callback against staging with `curl` using a valid signature → 200, row updated. Tamper one byte of the signature → 403. Verify via `SELECT delivery_status FROM conversations WHERE twilio_message_sid = '<SID>'`.
- [ ] Vercel env vars present and encrypted across Preview + Production: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (sensitive), `TWILIO_FROM_NUMBER`, `TWILIO_CONSULTANT_NUMBER`. Verified via `yarn vercel env ls`.
- [ ] PR description documents: relay-to-consultant rationale, dispatch-before-status-flip ordering (cite ENG-152), the two new `conversations` columns + index, and the deviation from the original ticket's "leave row at approved on failure" wording.
- [ ] `/design_review` on the dashboard for the toast copy.

## References

- Ticket: https://github.com/samjmarshall/www/issues/129
- Parent epic: https://github.com/samjmarshall/www/issues/87
- Email sibling (shipped, dispatch order pattern): https://github.com/samjmarshall/www/issues/130
- Dispatch-order correction (must mirror): `thoughts/plans/2026-04-27-ENG-152-action-queue-disappear-on-dispatch-failure.md`
- Email dispatch plan (parallel): `thoughts/plans/2026-04-25-ENG-130-hubspot-email-outlook-dispatch.md`
- Future iMessage replacement: `docs/adr/adr001-imessage-integration-for-sales-automation.md`
- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md`
- Messages router: `src/server/api/routers/messages.ts:137-191`
- Email dispatch helper (pattern): `src/server/dispatch/email-dispatch.ts:17-72`
- Email dispatch tests (pattern): `src/server/dispatch/__tests__/email-dispatch.test.ts:1-195`
- Existing webhook + signature pattern: `src/app/api/hubspot/webhook/route.ts:29-77`
- Existing webhook tests (pattern): `src/app/api/hubspot/webhook/__tests__/route.test.ts:1-80`
- HubSpot client/index pattern: `src/server/hubspot/client.ts:1-7`, `src/server/hubspot/index.ts:1-23`
- HubSpot SDK mock pattern: `src/server/hubspot/__tests__/contacts.test.ts:1-40`
- Conversations schema: `src/server/db/schema/conversations.ts:7-26`
- Message queue schema: `src/server/db/schema/message-queue.ts:13-37`
- Queue toast call sites: `src/app/(application)/dashboard/_components/use-queue-actions.ts:97-114,148-173`
- E2E messages helper: `e2e/utils/messages-helper.ts:23-96`
