# Email Compose Providers: Mailto Default + Outlook Graph Drafts

**Status:** Design — pending implementation plan
**Date:** 2026-04-27
**Branch:** `feat/130-hubspot-email-outlook-dispatch`
**Related:** ENG-130, #154 (silent send-failure bug), #156 (MIME-content sendMail)

---

## Problem

The current ENG-130 flow direct-sends email via Microsoft Graph `/me/sendMail` from the consultant's connected Outlook mailbox at "approve" time. Two problems surfaced during pilot testing:

1. **Silent failure on SMTP rejection.** Graph returns 202 (queued) before SMTP delivery; the dashboard shows "Sent via email" even when Microsoft's outbound infrastructure later bounces the message with `550 5.7.501 Spam abuse detected from IP range`. Captured in #154.
2. **Hard dependency on Outlook integration.** Some customers will use Gmail or Apple Mail; some won't trust the platform enough to grant `Mail.Send` early. The current architecture forces an OAuth integration as a precondition to using the product.

## Solution Summary

Pivot the approve action from "send email" to "prepare email for the consultant to send themselves":

- **Default behaviour (no integration required):** generate a `mailto:` deep link with prefilled `to`, `subject`, `body`, and HubSpot BCC. Works for any email client.
- **Opt-in upgrade (Outlook connected):** create a draft via Graph `POST /me/messages` and return the draft's compose URL for one-click open in Outlook. Higher-fidelity send detection via Graph SentItems webhook.
- **Future (Gmail connected):** same provider abstraction, Gmail-side implementation.

Detection of "did the consultant actually send it?" lives in webhook reconciliation, not optimistic UI state. The dashboard shows the queue item in an "Awaiting send" section until detection fires.

The direct-send mode (`/me/sendMail`) is preserved behind a PostHog feature flag (`directEmailSend`) as a parallel mode — not legacy code being removed. It will be matured (fixing #154 and #156) and exposed as a user-facing opt-in once stable.

---

## Architecture

### Provider abstraction

```ts
// src/server/dispatch/compose-provider.ts
interface ComposeProvider {
  prepare(input: {
    to: string;
    subject: string;
    body: string;
    bcc: string[];
  }): Promise<ComposeResult>;
}

type ComposeResult =
  | { kind: "mailto"; url: string }
  | { kind: "graphDraft"; draftId: string; composeUrl: string };
```

Two implementations:

- **`MailtoProvider`** — pure URL construction, zero I/O. Default for unconnected users. URL includes `bcc=` for HubSpot ingestion.
- **`MsGraphDraftProvider`** — calls `POST /me/messages` via existing `graphClientForUser`. Returns the unofficial compose-mode URL `https://outlook.office.com/mail/deeplink/compose/{draftId}` for one-click edit.

Provider selection in the `approve` mutation: presence of `ms_graph_tokens` row for the user → `MsGraphDraftProvider`; otherwise → `MailtoProvider`.

**Pessimistic Graph behaviour (Q1):** if `ms_graph_tokens` exists but Graph operations fail, throw to the user with a trace ID. No silent fallback to mailto. Graph user errors are visible.

### State machine

```
pending  → drafted    (approve clicked, compose URL/draft prepared)
drafted  → sent       (send detected via webhook)
drafted  → dismissed  (consultant discards or 7-day expiry)
```

`approved` and `edited_and_approved` remain as terminal states for SMS (which still direct-sends via existing path) AND for direct-send mode users (`directEmailSend` flag ON).

### Schema changes

Drizzle migration on `message_queue`:

```sql
ALTER TYPE message_status_enum ADD VALUE 'drafted';

ALTER TABLE message_queue
  ADD COLUMN draft_id text,            -- NULL = mailto, NOT NULL = graph_draft (Q25)
  ADD COLUMN drafted_at timestamptz;
```

`mailto` URLs and Graph compose URLs are deterministic from row data — regenerated on demand, never persisted. `compose_kind` column dropped (Q25): `draft_id IS NULL` is the discriminator.

Extension to `ms_graph_tokens` for subscription lifecycle:

```sql
ALTER TABLE ms_graph_tokens
  ADD COLUMN subscription_id text,
  ADD COLUMN subscription_expires_at timestamptz,
  ADD COLUMN subscription_client_state text;
```

Extension to `conversations` for detection metadata + diff data:

```sql
ALTER TABLE conversations
  ADD COLUMN detection_source text,    -- 'hubspot_webhook' | 'graph_sentitems' | 'manual_override'
  ADD COLUMN sent_body text,           -- actual sent body (Q13)
  ADD COLUMN sent_subject text;        -- actual sent subject

CREATE UNIQUE INDEX message_queue_id_unique_in_conversations
  ON conversations(message_queue_id);  -- idempotency safety net (Q7)
```

Pre-migration check: `SELECT message_queue_id, COUNT(*) FROM conversations GROUP BY 1 HAVING COUNT(*) > 1` — must be empty.

The row insert moves from approve-time (in `dispatchEmail`) to detection-time (in webhook handlers) for draft mode. Eliminates the `hubspotActivityId IS NULL` intermediate state for new rows. Direct-send mode preserves the existing approve-time insert behaviour.

### Send detection

Two reconciliation paths converging on the same outcome:

| Path | Trigger | Primary users | Fallback |
|---|---|---|---|
| **HubSpot `email.creation` webhook** | BCC-ingested email arrives in HubSpot's pipeline (~15-90s after send) | mailto users | Backup signal for graph_draft users |
| **Graph SentItems webhook** | Sent message appears in user's Sent Items folder (~seconds after send) | graph_draft users | None for mailto users |

**HubSpot path** (existing handler at `src/app/api/hubspot/webhook/route.ts`, dual-path approach per Q8):
- First match attempt: `message_queue` rows in `drafted` status for this lead within ±5min of `engagement.timestamp`
- Fallback match attempt: existing `conversations` rows with `hubspotActivityId IS NULL` (preserves direct-send mode behaviour)
- On drafted match: INSERT `conversations` with engagement body/subject/`hubspotActivityId`/`detection_source = 'hubspot_webhook'`; UPDATE `message_queue.status = 'sent'`, `sentAt`
- Engagement body populates `sent_body`/`sent_subject` for diff data

**Graph SentItems path** (new handler at `src/app/api/ms-graph/webhook/route.ts`):
- Subscription created via `POST /subscriptions` for `me/mailFolders('SentItems')/messages`, `changeType: 'created'`, ~70hr lifetime
- Per-user subscription with random 32-byte `clientState` stored on `ms_graph_tokens.subscription_client_state` (Q7)
- Notification handler:
  1. Validates `clientState` against stored value (per-user secret lookup via `subscriptionId`)
  2. Fetches the message via `GET /me/messages/{id}` to get body/subject/conversationId
  3. Matches against `drafted` `message_queue` rows by `conversationId` (Graph drafts and their sent copies share `conversationId`)
  4. Status check (idempotency, Q7): if status != 'drafted', no-op
  5. Insert conversation + update message_queue.status = 'sent' in a transaction
  6. Captures `sent_body`/`sent_subject` from Graph for richer diff data
- Notification batch processing (Q20): sequential with per-item try/catch isolation; PostHog telemetry per failure; 200 returned regardless
- Validation handshake (`validationToken` query param) handled before body processing

**Idempotency** (Q7): dual layer — UNIQUE constraint on `conversations.message_queue_id` + status-based fast path check before the INSERT attempt.

### Race conditions

- **Two webhooks fire for a graph_draft user.** Graph SentItems first (~seconds); HubSpot later (~15-90s). Whichever lands first writes the conversation row; second is no-op via UNIQUE constraint or status check.
- **Webhook fires before approve commits.** Unlikely. Handler treats "no matching draft" as no-op; HubSpot retries on 200.
- **User edits the draft in Outlook.** `message_queue.body` = our suggestion at approve time; `conversations.sent_body` = what they actually sent. Diff is the edit.
- **User sends a different message to the lead, not from our draft.** HubSpot path could match if subject + lead align — false positive risk. Graph path avoids this via `conversationId` exact match.
- **Concurrent approves on same queue item** (Q15): conditional UPDATE `WHERE id = ? AND status IN ('pending', 'snoozed')` ensures only one approve wins. Compensating UPDATE rolls back to `pending` on provider failure.

### Drift cleanup

Daily compose-maintenance cron (folded into existing `nurture-scheduler` per Q22 due to Vercel cron limit):

1. **Subscription renewal** — for each `ms_graph_tokens` row with `subscription_expires_at < NOW() + 24hr`: `PATCH /subscriptions/{id}` to extend
2. **Subscription creation retry** — for each `ms_graph_tokens` row with `subscription_id IS NULL` (failed at OAuth callback per Q27): attempt `POST /subscriptions`
3. **Stale draft expiry** — `drafted` rows older than 7 days transition to `dismissed` with reason `"draft_expired"`. Best-effort `DELETE /me/messages/{draft_id}` for graph_draft rows.

`Promise.allSettled` ensures one task failure doesn't abort the others. Each task captures errors to PostHog independently with `traceId`.

---

## UI Changes

### Approve mutation behaviour

- Returns `{ id, composeResult }` to the dashboard
- Dashboard auto-opens the URL on success:
  - `mailto` → `window.location.href = composeResult.url`
  - `graphDraft` → `window.open(composeResult.composeUrl, "_blank")`
- Optimistic snapshot pattern stays — row is removed from "Pending" immediately and added to "Awaiting send"

### "Awaiting send" queue section (Q28)

Either stacked sections on the same dashboard page (Option A) or tabs (Option B). Final pick deferred to `frontend-design` skill during implementation.

Polling: `messages.listAwaitingSend` query refetches every **30s** when tab is visible (Q16). Future Phase: switch to tRPC subscriptions for real-time updates.

Each row shows:
- Lead name, channel, subject preview
- "Drafted Xm ago" timestamp
- "Reopen in mail client" → opens existing draft (graph_draft) or regenerated mailto URL (Q21)
- "Mark as sent" → manual override (Q10)
- "Cancel draft" → deletes Graph draft + transitions to `dismissed` (Q9)

When detection fires, row disappears with subtle confirmation toast: `"Email to {lead} confirmed sent"`.

### Toast copy (Q4)

| Scenario | Copy |
|---|---|
| Approve success (mailto) | "Draft ready" + "Open in mail app" action |
| Approve success (graph_draft) | "Draft created in Outlook" + "Open draft" action |
| Send detected | "Email to {lead} confirmed sent" |
| Mark as sent (manual) | "Marked as sent" |
| Graph failure | "Outlook draft failed — Trace: {id}" + "Reconnect Outlook" + "Retry" actions, copy-trace-on-click |

---

## Error Handling + Telemetry

### Trace IDs (Q2 — generic infrastructure)

- ULID generated in tRPC procedure middleware → `ctx.requestId`
- Error formatter extends `data.traceId` for all tRPC errors
- PostHog `captureException` calls include `traceId` as a property
- Graph API `request-id` response header captured as `data.upstreamRequestId` on Graph-specific errors

### PostHog event taxonomy (Q3, Q26)

Both `captureException` (full diagnostics) AND structured `posthog.capture()` events (alerting + funnel analysis):

- `compose_provider_succeeded` — properties: `provider` (`mailto` | `graphDraft`), `mode` (`draft` | `direct_send`), `userId`, `leadId`, `messageQueueId`
- `compose_provider_failed` — same + `errorCode`, `traceId`, `upstreamRequestId`, `errorMessage`
- `compose_send_detected` — fired from webhook handler; properties: `detectionPath` (`hubspot` | `graphSentItems`), `latencyMs`, `wasEdited` (boolean from diff), `userId`, `leadId`, `messageQueueId`
- `compose_send_marked_manual` — properties: `userId`, `leadId`, `messageQueueId`, `daysSinceDrafted`
- `compose_subscription_created` — properties: `trigger` (`oauth_callback` | `cron_retry`), `userId`
- `compose_subscription_creation_failed` — properties: `trigger`, `userId`, `traceId`, `errorMessage`
- `compose_outlook_disconnected` — properties: `userId`, `draftedCount`
- `compose_send_detection_failed` — properties: `subscriptionId`, `traceId`, `errorMessage`
- `compose_draft_delete_failed` — properties: `userId`, `messageQueueId`, `traceId`

### Error UX (Q4)

For Phase 1: error toast with copy-trace + retry. Persistent inline error states deferred to Phase 2.

### Subscription health (Q14)

Phase 1: reactive detection only. PostHog dashboard tracks `compose_provider_succeeded[graph_draft]` vs `compose_send_detected[graph_sentitems]` ratio. Manual investigation via DB queries when ratio degrades.

Phase 2: active health check cron + self-healing on approve.

### Alerts (Q26)

Three tiers (Critical / Warning / Informational) defined in the runbook. Alert configuration deferred to a later phase at developer discretion. Phase 1 ships event capture + dashboards; alerts configured incrementally.

---

## Feature flagging (Q18)

PostHog flag `directEmailSend` (per-user targeting):

```ts
async approve(input) {
  const { row, lead } = await loadActionableWithLead(...);
  await checkEmailPreconditions(...);

  const useDirectSend = await isFeatureEnabled("directEmailSend", ctx.user.id);
  if (useDirectSend) {
    if (!await hasGraphConnection(ctx.user.id)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Direct send requires Outlook connection." });
    }
    return directSendFlow(row, lead);  // wraps existing dispatchEmail logic
  }

  return draftFlow(row, lead, ctx);
}
```

**Default state at merge:** OFF for all users.

**Permanent toggle, not transitional.** Direct-send mode stays in the codebase as a parallel mode, matured incrementally. Phase 3 surfaces it as a user-facing opt-in.

---

## OAuth scope changes (Q12)

Existing scope: `["Mail.Send", "offline_access", "User.Read"]`

New scope: `["Mail.ReadWrite", "Mail.Send", "offline_access", "User.Read"]`

- `Mail.ReadWrite` required for `POST /me/messages` (draft creation), `DELETE /me/messages/{id}` (cancel), and SentItems webhook subscription
- `Mail.Send` retained for direct-send mode

**Re-consent strategy:** lazy. Existing connected users keep working until they hit the new code path. On 403 from draft creation, we throw `MsGraphInsufficientScopeError` mapped to a `TRPCError` with the existing reconnect-CTA toast pattern.

**Risk: MC1163922.** Microsoft's October 2025 policy change means M365 tenants on the default consent policy may now require admin pre-approval for `Mail.ReadWrite`. The mailto default mitigates this — Outlook integration becomes opt-in, not blocking.

---

## Disconnect flow (Q19)

New endpoint `POST /api/auth/ms-graph/disconnect`:

1. Best-effort `DELETE /subscriptions/{id}` (if exists)
2. For each `drafted` `message_queue` row owned by this user with `draft_id IS NOT NULL`:
   - Best-effort `DELETE /me/messages/{draft_id}` (if token still works)
   - UPDATE `draft_id = NULL` (graceful conversion to mailto — `Reopen` button now generates mailto URL)
3. DELETE `ms_graph_tokens` row
4. Capture PostHog event: `compose_outlook_disconnected`

Pending drafts convert from Graph to mailto seamlessly — consultant can keep working without re-doing approvals.

---

## Subscription creation on OAuth callback (Q27)

After successful token exchange, attempt `POST /subscriptions`. On success: store `subscription_id`, `subscription_expires_at`, `subscription_client_state`.

On failure: token row saved with NULL subscription fields. Dashboard displays banner: "Outlook connected but send detection isn't fully active — retrying in the background." Compose-maintenance cron retries on next run.

User can still send emails during the gap; HubSpot BCC detection still fires. Detection is degraded, not broken.

---

## Testing (Q24)

### Module organisation

```
src/server/ms-graph/
  client.ts          (existing — graphClientForUser, token refresh)
  emails.ts          (existing — sendEmail, used by direct-send mode)
  drafts.ts          (new — createDraft, deleteDraft, getMessage)
  subscriptions.ts   (new — createSubscription, renewSubscription, deleteSubscription)
  index.ts           (re-exports)

src/server/dispatch/
  compose-provider.ts       (new — interface)
  mailto-provider.ts        (new)
  ms-graph-provider.ts      (new)
  resolve-provider.ts       (new — selects provider per user)
  email-dispatch.ts         (existing — direct-send mode)
  compose-maintenance.ts    (new — renewExpiringGraphSubscriptions, expireStaleDrafts)
```

### Unit (Rstest)

- `mailto-provider.test.ts` — URL encoding correctness, BCC inclusion, length-ceiling guard (warn if URL > 1900 chars), special character escaping
- `ms-graph-provider.test.ts` — draft payload shape, compose URL derivation, error mapping (`MsGraphInsufficientScopeError` for 403)
- `resolve-provider.test.ts` — token row exists → Graph; absent → mailto
- `compose-maintenance.test.ts` — renewal logic, retry creation logic, stale draft expiry
- `messages-router.test.ts` extended — approve writes `drafted` status; doesn't write `sentAt` or insert conversation; conditional UPDATE rejects double-approve
- `hubspot/webhook/route.test.ts` extended — dual-path matching (drafted first, conversations fallback)
- `ms-graph/webhook/route.test.ts` new — `clientState` validation, batched notification per-item isolation, conversationId match, idempotency, validationToken handshake

**Mocking strategy:** wrap each Graph operation as a module-level function in `drafts.ts` / `subscriptions.ts`. Tests mock these via `mock.module()` — never mock the SDK Client directly.

### E2E (Playwright)

- `e2e/features/email-dispatch.spec.ts` updated — assert mutation response shape, queue status transitions, simulated webhook → conversation row
- Mock at the dispatch boundary in E2E (replace `MsGraphDraftProvider` with a stub returning canned compose results)

---

## Rollout (Q23)

**Phase 1 — this PR:**
- Migration + provider abstraction + new approve flow
- Mailto path enabled for all users
- Graph draft path automatic for users with Outlook connected
- `directEmailSend` flag wired up, defaulted OFF
- Dashboard "Awaiting send" section with 30s polling
- HubSpot webhook dual-path matching
- Graph SentItems webhook handler + per-user subscription on OAuth callback
- Disconnect endpoint with mailto conversion
- Compose-maintenance work folded into existing `nurture-scheduler` cron
- PostHog event taxonomy + dashboards
- Internal runbook at `docs/runbooks/email-compose-providers.md`
- Updated E2E spec for new flow

**Phase 2 — confidence checkpoint** (no code change, evidence-driven):
- Trigger: 2 weeks of Phase 1 with no incidents AND `compose_send_detected` ratio > 90% for graph_draft users
- Active subscription health check cron + self-healing on approve
- Configure PostHog alerts at developer discretion based on observed thresholds

**Phase 3 — direct-send opt-in via new Settings → Integrations:**
- Trigger: #154 and #156 merged AND draft mode is observably stable in production
- Build new **"Integrations" section** under the Settings page (`/settings/integrations` route or similar). This is a new top-level Settings area that will house all third-party integrations going forward (Outlook today, Gmail later, plus any future CRM / calendar / messaging integrations).
- Per-integration UI affordances:
  - **Connect / Disconnect** button (replaces the current `ms-graph-connect-banner` that lives on the dashboard)
  - **Connection status display** (last connected, scopes granted, subscription health for Outlook)
  - **Configuration toggles** specific to each integration — for Outlook: a "Send emails directly from Outlook (advanced)" toggle that flips the user's `directEmailSend` PostHog flag, with explanatory copy on the deliverability and silent-failure trade-offs
- Replace the on-dashboard "Outlook connected but send detection isn't fully active" banner (Q27) with a status indicator in the Integrations panel; keep a lightweight inline banner on the dashboard only for actively-blocking issues (token revoked, etc.)
- Default for direct-send toggle remains OFF; users opt in deliberately after reading the trade-offs
- Wire the Disconnect action to the `POST /api/auth/ms-graph/disconnect` endpoint built in Phase 1 (Q19)

---

## Known gaps + open questions

1. **Compose-mode URL is undocumented.** `https://outlook.office.com/mail/deeplink/compose/{id}` works today but Microsoft has never published it. If it breaks, fall back to the official `webLink` (read-mode, requires user to click pencil to edit).
2. **Subscription renewal reliability.** Daily renewal gives ~46hr buffer. Phase 2 health check provides additional safety.
3. **7-day draft expiry is arbitrary.** Confirm with consultants what feels right based on workflow rhythm.
4. **Mailto BCC reliability.** Some clients silently drop `bcc` query params. Worth measuring how often HubSpot detection fails for mailto users.
5. **HubSpot ±5min match window may need widening.** BCC-to-engagement latency varies; if matches miss, widen to ±15min.
6. **Validation handshake reachability in dev.** Subscription creation skipped in dev (Q5). Webhook handler tested via mock notification payloads, not end-to-end with Microsoft.
