# ENG-130 — Outlook Email Dispatch + HubSpot Activity Reconciliation

## Context

Approving a draft with `channel=email` currently flips the queue row's status but sends nothing — the action queue UI shows "Approved — will send shortly" as a placeholder (`src/app/(application)/dashboard/_components/use-queue-actions.ts:70`, `:123`). #130 closes that gap by sending the email through the consultant's Microsoft 365 mailbox via Microsoft Graph, BCCing HubSpot's portal-specific ingestion address so the email lands on the contact's HubSpot timeline, inserting an outbound `conversations` row, and stamping `message_queue.sentAt`. `conversations.hubspotActivityId` is populated **asynchronously** by a HubSpot `email.creation` webhook handler — the approve mutation does not block on HubSpot ingestion.

This deviates from the ticket's "use HubSpot's single-send transactional API or engagements/emails endpoint" wording. The chosen approach (Outlook + BCC + webhook reconciliation) was selected because (a) it avoids the Marketing Hub Enterprise + Transactional Email add-on requirement, (b) it gives the consultant a real Outlook thread on their own machine, and (c) it lays the foundation for inbound email triage — a deferred Epic 3 goal — without rework. Inbound handling and a nightly missed-webhook reconciler are explicitly out of scope.

## Current State

- Messages router has approve / editAndApprove mutations that only update queue status — no dispatch hook (`src/server/api/routers/messages.ts:82-111`).
- `loadActionable()` helper validates terminal-state transitions and returns the row (`src/server/api/routers/messages.ts:17-35`); it does **not** join lead context.
- `conversations.hubspotActivityId` (`src/server/db/schema/conversations.ts:20`) and `message_queue.sentAt` (`src/server/db/schema/message-queue.ts:29`) columns exist but are never populated.
- HubSpot module is split into `src/server/hubspot/{client,contacts,properties,index}.ts` — no email/engagement helpers exist. Client uses `@hubspot/api-client@13.5.0` instantiated with `env.HUBSPOT_ACCESS_TOKEN` (`src/server/hubspot/client.ts:1-7`).
- Existing HubSpot webhook handler lives at `src/app/api/hubspot/webhook/route.ts:19-67`, validates `x-hubspot-signature-v3`, switches on `subscriptionType` (`contact.creation`, `contact.propertyChange`, `contact.deletion`).
- `leads.email`, `leads.phone`, `leads.hubspotContactId` all exist (`src/server/db/schema/leads.ts:28,33,34`).
- Resend (`resend@6.9.4`) is installed and used only for OTP login email (`src/lib/auth.ts:5-36`). It is **not** the dispatch path for #130.
- No Microsoft Graph client, no per-user OAuth, no token storage table.
- HubSpot SDK module-mock test pattern is established at `src/server/hubspot/__tests__/contacts.test.ts:1-40`.
- Approve / editAndApprove UI mutations already surface tRPC errors via toast through `errorMessage()` (`src/app/(application)/dashboard/_components/use-queue-actions.ts:56-59,73-80,129-136`).

## Desired End State

- Approving a queue row with `channel=email` and a lead with both `hubspotContactId` and `email` set:
  1. Sends the email from the consultant's connected Microsoft 365 mailbox via Graph `sendMail`, with `<portalId>@bcc.hubspot.com` in the BCC list.
  2. Inserts an outbound `conversations` row (`direction=outbound`, `deliveryMethod=email`, `messageQueueId`, `subject`, `body`, `hubspotActivityId=null`).
  3. Stamps `message_queue.sentAt = now()`.
  4. Within ~15–90s, HubSpot fires an `email.creation` webhook for the auto-ingested engagement; the existing webhook route reconciles it back to the `conversations` row by `(leadHubspotContactId, subject, sentAt±5min)` and writes `hubspotActivityId`.
- Approve fails fast (status stays `pending`) with a clear `TRPCError` if: lead has no `hubspotContactId`, lead has no `email`, or the consultant's Microsoft account is not connected.
- Approve fails after-status-write (status stays `approved`, error toast surfaces) if the Graph send itself errors.
- Channel `sms` falls through unchanged — #129 owns that path.
- `make check`, `make build`, `make test` all green; new Rstest unit tests cover the helper, dispatch branching, and the webhook reconciler.

## Out of Scope

- **Inbound email** — no handling of `INCOMING_EMAIL` engagements, no Outlook reply ingestion, no triage classifier. Belongs in a follow-up ticket once the outbound foundation lands.
- **Inbound webhook stub** — even a no-op handler for `email.creation` where `hs_email_direction=INCOMING_EMAIL` is deferred. Webhook handler only processes outbound (`EMAIL` direction).
- **Nightly missed-webhook reconciler cron** — a follow-up ticket (will sweep `conversations.hubspotActivityId IS NULL` rows older than the live-poll window). For #130 we accept that an undelivered webhook leaves `hubspotActivityId` null indefinitely.
- **SMS dispatch** (#129).
- **Multi-tenant Microsoft account onboarding UI** — onboarding flow is minimal (one OAuth round-trip on first send attempt or a settings page button). No org-level admin consent UI.
- **Rich HTML email templates** — body is sent as plain text (matches the AI-drafted format from #127). HTML rendering is a future ticket.
- **Send-as-different-mailbox / shared mailbox / delegated send** — only the consultant's own mailbox.
- **E2E test against a real HubSpot portal end-to-end** — Phase 4 includes a Playwright spec that mocks Graph and HubSpot APIs only; live portal validation happens in pilot QA.

## Approach

Four phases. Phase 1 establishes the Microsoft Graph integration in isolation (OAuth + token storage + a `sendEmail` helper) so it can be unit-tested before any router wiring. Phase 2 wires dispatch into the messages router as a transactional flow that survives downstream HubSpot delays. Phase 3 extends the existing HubSpot webhook to reconcile `hubspotActivityId` on the async path. Phase 4 covers an end-to-end Playwright test (with mocked external APIs) and pilot-readiness checks.

Tests ship in the same phase as the behaviour, vertical-slice TDD style — one failing unit test, one implementation pass, repeat (per the `tdd` skill). Drizzle is mocked wholesale in unit tests using the existing `leads-router.test.ts` chainable-mock pattern (`src/server/api/__tests__/leads-router.test.ts`). HubSpot SDK and Microsoft Graph SDK are mocked via `rs.doMock("../client", ...)` matching `src/server/hubspot/__tests__/contacts.test.ts:8-39`.

## Phase 1: Microsoft Graph integration + per-consultant OAuth

### Changes

- `package.json` — add `@microsoft/microsoft-graph-client@^3` and `@azure/msal-node@^2` (or equivalent OAuth2 client). Pin exact versions matching the `@hubspot/api-client` pinning convention at `package.json:43`.
- `src/env.js` — add `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET` (`--sensitive`), `MS_GRAPH_TENANT_ID`, `MS_GRAPH_REDIRECT_URI`, `HUBSPOT_BCC_ADDRESS` (e.g., `bcc-12345@bcc.hubspot.com` — portal-specific, fetched once from HubSpot Settings → Integrations → Email). Mirror the `HUBSPOT_ACCESS_TOKEN` pattern at `src/env.js:28,60`.
- `src/server/db/schema/ms-graph-tokens.ts` (new) — `pgTable("ms_graph_tokens")` with `userId` (FK to `users.id` from `auth.ts`, unique, cascade delete), `accessToken` (text, encrypted-at-rest is out of scope — note as TODO), `refreshToken` (text), `expiresAt` (timestamptz), `microsoftUserId` (text), `email` (text), `createdAt`, `updatedAt`.
- `src/server/db/schema/index.ts` — re-export the new table (mirrors `src/server/db/schema/index.ts:7`).
- `drizzle/000X_<name>.sql` — generated via `yarn db:generate`. Apply via `yarn db:migrate` per the project rule against `db:push`.
- `src/server/ms-graph/client.ts` (new) — single-tenant `ConfidentialClientApplication` from MSAL, exports `graphClientForUser(userId): Promise<GraphClient>` that loads the user's token row, refreshes if `expiresAt < now()+60s`, returns an authenticated `Client` from `@microsoft/microsoft-graph-client`. Throws `MsGraphNotConnectedError` (custom class) if no token row exists.
- `src/server/ms-graph/emails.ts` (new) — `sendEmail({ userId, to, bcc, subject, body }): Promise<{ internetMessageId: string; sentAt: Date }>` — calls `client.api("/me/sendMail").post({ message: {...}, saveToSentItems: true })`. Plain-text body for now.
- `src/server/ms-graph/index.ts` (new) — re-exports public surface (mirrors `src/server/hubspot/index.ts:1-18`).
- `src/server/ms-graph/__tests__/emails.test.ts` (new) — Rstest unit tests using the `rs.doMock("../client", ...)` pattern. Cases:
  - Sends with correct `to`, `bcc`, `subject`, `body`, `saveToSentItems: true`.
  - BCC list includes `env.HUBSPOT_BCC_ADDRESS` even when caller passes additional BCCs (currently we pass none, but the helper accepts).
  - Throws `MsGraphNotConnectedError` when no token row exists for the user.
  - Refreshes token when `expiresAt` is within the 60s skew window; persists new `accessToken`/`expiresAt`.
  - Propagates Graph SDK errors (do not swallow).
- `src/server/ms-graph/__tests__/client.test.ts` (new) — module shape + token-load happy path with mocked drizzle (chainable mocks per `src/server/api/__tests__/leads-router.test.ts`).
- `src/app/api/auth/ms-graph/start/route.ts` (new) — `GET` that builds the MSAL auth URL with scopes `Mail.Send offline_access User.Read` and redirects.
- `src/app/api/auth/ms-graph/callback/route.ts` (new) — `GET` handler that exchanges the code for tokens, fetches `/me` for the Microsoft user id + email, upserts the `ms_graph_tokens` row keyed by `userId` (the better-auth session user). Redirects back to `/dashboard?ms_connected=1`.
- `src/app/(application)/dashboard/_components/ms-graph-connect-banner.tsx` (new, minimal) — renders only if the current user has no `ms_graph_tokens` row; links to `/api/auth/ms-graph/start`. Wired into the dashboard layout so it shows above the queue. (No design polish — pilot-grade.)
- `src/app/(application)/dashboard/_components/__tests__/ms-graph-connect-banner.test.tsx` (new) — renders/hides based on a `connected` prop.

### Success

**Automated**
- [x] `make check` passes (typecheck + lint).
- [x] `make test` passes; new tests in `src/server/ms-graph/__tests__/` and the banner test all green.
- [x] `make build` passes.

**Manual**
- [x] Local dev: visit `/api/auth/ms-graph/start`, complete consent with a test M365 mailbox, land on `/dashboard?ms_connected=1`, verify a row in `ms_graph_tokens`.
- [x] Repeat the OAuth flow for the same user — token row is updated in place, not duplicated (driven by the `userId` unique constraint).
- [x] Disconnect (delete the row by hand), reload `/dashboard`, banner reappears.
- [x] In a node REPL or temporary script, call `sendEmail({ userId, to: "your-test@inbox", subject: "ping", body: "hi" })` — message arrives, BCC also lands on the HubSpot portal address.
- [x] `/design_review` for the connect banner.

## Phase 2: Wire dispatch into the messages router

### Changes

- `src/server/dispatch/email-dispatch.ts` (new) — single function `dispatchEmail({ db, ctx, message, lead }): Promise<{ conversationId: string }>` that:
  1. Throws `TRPCError({ code: "FAILED_PRECONDITION" })` if `lead.hubspotContactId` is null (mirrors existing TRPCError usage at `src/server/api/routers/messages.ts:26-32`).
  2. Throws `TRPCError({ code: "FAILED_PRECONDITION" })` if `lead.email` is null.
  3. Calls `sendEmail({ userId: ctx.session.userId, to: lead.email, bcc: [env.HUBSPOT_BCC_ADDRESS], subject: message.subject, body: message.body })`.
  4. On success: in a single `db.transaction`, inserts the `conversations` row (`hubspotActivityId: null`) and updates `message_queue.sentAt = now()`. Returns the new `conversations.id`.
  5. On `MsGraphNotConnectedError`: throws `TRPCError({ code: "FAILED_PRECONDITION", message: "Connect your Microsoft account to send emails." })`.
  6. On any other Graph error: re-throws as `TRPCError({ code: "INTERNAL_SERVER_ERROR" })` with the original message in `cause`.
- `src/server/api/routers/messages.ts` —
  - Modify `loadActionable()` to also return the joined lead row (or add a sibling `loadActionableWithLead()` to keep the existing helper signature stable for callers in #129). Lean toward the sibling helper to minimise blast radius.
  - In `approve` and `editAndApprove` mutations: after the `update(messageQueue).set(...)` returning, branch on `row.channel`. For `email`, call `dispatchEmail({...})`. For `sms`, no-op (#129 will fill this in).
  - Order is important: status update **first** (so on dispatch failure the row stays in `approved`/`edited_and_approved` per the ticket), dispatch **second**.
- `src/server/api/__tests__/messages-router.test.ts` (extend, not rewrite) — new test cases for both `approve` and `editAndApprove`:
  1. `channel=email` happy path: dispatch called with right args, `conversations` row inserted, `sentAt` stamped.
  2. `channel=email` lead missing `hubspotContactId`: throws `FAILED_PRECONDITION`, status stays `pending`.
  3. `channel=email` lead missing `email`: throws `FAILED_PRECONDITION`, status stays `pending`.
  4. `channel=email` Graph send fails: status is `approved` after the call, `conversations` row **not** inserted, `sentAt` **not** set, error rethrown as `INTERNAL_SERVER_ERROR`.
  5. `channel=email` Microsoft account not connected: throws `FAILED_PRECONDITION` with the user-facing message; status stays `pending` (precondition check runs before status write).
  6. `channel=sms`: status flips, dispatch is **not** called (#129 stub).
- `src/server/dispatch/__tests__/email-dispatch.test.ts` (new) — unit tests for the helper itself: precondition branches, transaction-on-success, transaction-not-on-failure (i.e., `sentAt` and `conversations` row never appear if Graph throws).
- `src/app/(application)/dashboard/_components/use-queue-actions.ts` — update success-toast copy from `"Approved — will send shortly"` to `"Sent via email"` when the mutation result indicates an email dispatch (`use-queue-actions.ts:69-72,122-128`); leave the SMS branch as `"Approved — will send shortly"` until #129 lands. Surface `FAILED_PRECONDITION` errors with their server-provided `message` so the consultant sees "Connect your Microsoft account to send emails." or "This lead has no email address." directly.

### Success

**Automated**
- [x] `make check` passes.
- [x] `make test` passes; all new unit tests green.
- [x] `make build` passes.

**Manual**
- [x] Seed a queue row with `channel=email` for a lead that has both `email` and `hubspotContactId` (use `e2e/utils/messages-helper.ts` patterns from `e2e/utils/messages-helper.ts:23-78`); approve via the dashboard; confirm the email lands in the `to` inbox, the BCC lands on the HubSpot ingestion mailbox, a `conversations` row exists with `hubspotActivityId=null`, and `message_queue.sentAt` is populated.
- [x] Re-run with a lead missing `email` — toast surfaces "This lead has no email address." and the queue row stays in `pending`.
- [x] Re-run with the consultant disconnected from Microsoft — toast surfaces the connect prompt and the row stays `pending`.
- [x] Re-run with the Graph token revoked mid-send (manually invalidate via Azure portal) — row ends in `approved`, no `conversations` row, error toast. Note: consultant cannot self-serve retry from queue UI; support must reset status manually. Follow-up ticket needed.
- [x] `/design_review` on the dashboard for the toast/banner copy changes.

## Phase 3: HubSpot `object.creation` (EMAIL) webhook reconciliation (outbound only)

### Changes

- `src/server/hubspot/emails.ts` (new) — exported `getEmailEngagement(emailId: string)` wrapping `hubspot.crm.objects.emails.basicApi.getById(emailId, properties)` for `hs_email_subject`, `hs_email_to_email`, `hs_email_direction`, `hs_email_status`, `hs_timestamp`. Plus `findContactIdForEmail(emailId): Promise<string | null>` using the associations API. Mirrors `src/server/hubspot/contacts.ts` shape.
- `src/server/hubspot/__tests__/emails.test.ts` (new) — module-mock unit tests for the two helpers; happy path + 404 → null + propagated errors.
- `src/server/hubspot/index.ts` — re-export `getEmailEngagement`, `findContactIdForEmail`.
- `src/app/api/hubspot/webhook/route.ts` —
  - Add `WebhookEvent.subscriptionType` case `"email.creation"` to the switch at `src/app/api/hubspot/webhook/route.ts:72-87`.
  - Implement `handleEmailCreation(emailObjectId)`:
    1. Fetch the engagement and its associated contact id.
    2. **Outbound only** — early-return if `hs_email_direction !== "EMAIL"` (HubSpot's enum: `EMAIL` for outbound, `INCOMING_EMAIL` for inbound). Inbound is out of scope.
    3. Look up the local `leads` row by `hubspotContactId`; early-return if not found (lead deleted or unsynced).
    4. Find the matching `conversations` row: `leadId == lead.id AND deliveryMethod == 'email' AND direction == 'outbound' AND hubspotActivityId IS NULL AND createdAt BETWEEN hsTimestamp - 5min AND hsTimestamp + 5min AND subject == hs_email_subject`. Order by `abs(createdAt - hsTimestamp)` asc, take 1.
    5. If matched: update `hubspotActivityId = emailObjectId`. If not matched: log and continue (matches the existing webhook's "log and continue, return 200" pattern at `src/app/api/hubspot/webhook/route.ts:58-63`).
- `src/app/api/hubspot/webhook/__tests__/route.test.ts` (extend) — new test cases:
  1. `email.creation` for an outbound email with an unmatched `conversations` row → row's `hubspotActivityId` is set.
  2. `email.creation` for inbound (`hs_email_direction=INCOMING_EMAIL`) → no DB writes; logged and ignored.
  3. `email.creation` for an unknown `hubspotContactId` → no DB writes; logged and ignored.
  4. `email.creation` where two candidate `conversations` rows exist → the one closest to `hs_timestamp` wins.
  5. `email.creation` where the `conversations` row already has a non-null `hubspotActivityId` → no overwrite (idempotency).

### Success

**Automated**
- [x] `make check` passes.
- [x] `make test` passes; webhook route tests cover all five new cases.
- [x] `make build` passes.

**Manual**
- [x] In HubSpot Settings → Integrations → Private Apps → app → Webhooks, create a new subscription with **"Use expanded object support"** toggled ON, Object = Email, Event = Created. (This produces `object.creation` with `objectTypeId: "0-49"`, not the legacy `email.creation` type.) Document in PR description.
- [x] End-to-end: covered by `e2e/features/email-dispatch.spec.ts:49-86` (signed webhook → handler returns 200) plus the 5 unit reconciliation tests in `src/app/api/hubspot/webhook/__tests__/route.test.ts:314-423`. Production HubSpot webhook is wired to prod-only, so live timeline verification deferred to post-merge smoke test.
- [x] Inbound reply guard covered by unit test `route.test.ts:343-360` (`INCOMING_EMAIL` direction → no DB writes). Live verification deferred to post-merge smoke test (prod-only HubSpot webhook).

## Phase 4: E2E coverage + pilot-readiness

### Changes

- `e2e/features/email-dispatch.spec.ts` (new) — Playwright spec, follows the per-spec cleanup + unique-data discipline from `CLAUDE.md` E2E section:
  1. Seed a lead with a unique email + `hubspotContactId` set to a known sandbox contact.
  2. Seed a `message_queue` row with `channel=email`, `subject=<unique>`, `body=<unique>`.
  3. Mock Microsoft Graph at the network layer (Playwright route interception against the Graph host) — the spec verifies our integration code, not a live Graph send.
  4. Mock HubSpot's webhook delivery by POSTing a synthetic `email.creation` event to `/api/hubspot/webhook` with a valid signature header (use the real `Signature.sign()` from `@hubspot/api-client`).
  5. Approve via the dashboard, assert the toast says "Sent via email", assert the `conversations` row exists with `hubspotActivityId` populated after the synthetic webhook fires.
  6. `afterAll` cleans up the seeded lead + messages + conversations by phone/email per the project rule.
- `e2e/utils/messages-helper.ts` — extend with `seedEmailQueueItem()` and `cleanupConversationsForLead()` helpers (used by the new spec and any future inbound spec).
- `README.md` — add a "Microsoft Graph setup" section (env vars, redirect URI, scopes). Update the "HubSpot integrations" section noting the new `email.creation` subscription. Note the `HUBSPOT_BCC_ADDRESS` setup step.
- E2E locator audit — every locator added to `email-dispatch.spec.ts` uses `getByTestId()` per the blocking gate in `CLAUDE.md`. Add `data-testid` to any new banner/toast elements introduced in Phase 1 / Phase 2 if the existing components don't already expose one.

### Success

**Automated**
- [x] `make check` passes.
- [x] `make test` passes.
- [x] `make build` passes.
- [x] `make test_e2e` passes including the new `email-dispatch.spec.ts`. 257 passed, 56 skipped (UI dispatch test skips without `MS_GRAPH_TEST_ACCESS_TOKEN`, as designed). Webhook test passes with fake engagement ID → 404 → early return → 200.

**Manual**
- [ ] Pilot dry-run with Creation Homes mailbox in a HubSpot sandbox portal: full approve → email lands → BCC lands → timeline activity visible → `hubspotActivityId` reconciled within 90s. **Deferred to post-merge customer pilot** — local verification not possible (HubSpot webhook points at production, no Creation Homes M365 access in dev).
- [x] Vercel env vars present and encrypted across Preview + Production: `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_GRAPH_REDIRECT_URI`, `HUBSPOT_BCC_ADDRESS`. Verified via `yarn vercel env ls`.
- [ ] PR description documents: which HubSpot endpoint was chosen and why (Outlook + BCC + webhook reconciliation, with the trade-off table from the design sketch).

## Fallback Options (if MS Graph proves infeasible in pilot)

Three alternatives to the Outlook + BCC + webhook approach, ranked by implementation complexity:

1. **Resend (simplest)** — already installed (`resend@6.9.4`, used for OTP). Send emails from a shared `noreply@rekurve.com` domain instead of the consultant's own mailbox. No per-user OAuth. Loses the "real Outlook thread" benefit — consultant won't see replies in their inbox. BCC + webhook reconciliation still works the same way.

2. **HubSpot Engagements API** — call `POST /crm/v3/objects/emails` to create an email engagement directly in HubSpot CRM without sending anything. Pair with Resend or another provider for the actual send. Activity is on the timeline immediately (no async reconciliation). Requires Marketing Hub Starter or above; no Transactional add-on needed for engagement creation only.

3. **HubSpot Transactional Email API** — `POST /marketing/v3/transactional/single-email/send`. HubSpot handles both send and CRM timeline recording in one call. Requires **Marketing Hub Enterprise + Transactional Email Add-on** (paid add-on, ~$400/mo). Most integrated option but highest cost gate — ruled out for early pilot.

## References

- Ticket: https://github.com/samjmarshall/www/issues/130
- Parent epic: https://github.com/samjmarshall/www/issues/87
- SMS sibling (in flight, parallel): https://github.com/samjmarshall/www/issues/129
- Messages router: `src/server/api/routers/messages.ts:1-136`
- Messages router prior plan: `thoughts/plans/2026-04-12-ENG-126-messages-router.md`
- Action queue prior plan: `thoughts/plans/2026-04-13-ENG-128-action-queue-view.md`
- Existing HubSpot webhook: `src/app/api/hubspot/webhook/route.ts:1-141`
- HubSpot SDK mock pattern: `src/server/hubspot/__tests__/contacts.test.ts:1-40`
- Drizzle chainable-mock pattern: `src/server/api/__tests__/leads-router.test.ts:1-899`
- Conversations schema: `src/server/db/schema/conversations.ts:1-26`
- Message queue schema: `src/server/db/schema/message-queue.ts:13-37`
- Resend (used elsewhere, **not** for #130): `src/lib/auth.ts:5-36`
