# Email Compose Providers: Mailto Default + Outlook Graph Drafts

**Status:** Design — pending implementation plan
**Date:** 2026-04-27
**Branch:** `feat/130-hubspot-email-outlook-dispatch`
**Related:** ENG-130 (#issue), #154 (silent send-failure bug), #156 (MIME-content sendMail)

---

## Problem

The current ENG-130 flow direct-sends email via Microsoft Graph `/me/sendMail` from the consultant's connected Outlook mailbox at "approve" time. Two problems surfaced during pilot testing:

1. **Silent failure on SMTP rejection.** Graph returns 202 (queued) before SMTP delivery; the dashboard shows "Sent via email" even when Microsoft's outbound infrastructure later bounces the message with `550 5.7.501 Spam abuse detected from IP range`. Captured in #154.
2. **Hard dependency on Outlook integration.** Some customers will use Gmail or Apple Mail; some won't trust the platform enough to grant `Mail.Send` early. The current architecture forces an OAuth integration as a precondition to using the product.

## Solution Summary

Pivot the approve action from "send email" to "prepare email for the consultant to send themselves":

- **Default behaviour (no integration required):** generate a `mailto:` deep link with prefilled `to`, `subject`, `body`, and HubSpot BCC. Works for any email client.
- **Opt-in upgrade (Outlook connected):** create a draft via Graph `POST /me/messages` and return the draft's `webLink` for one-click open in Outlook. Higher-fidelity send detection via Graph SentItems webhook.
- **Future (Gmail connected):** same provider abstraction, Gmail-side implementation.

Detection of "did the consultant actually send it?" lives in webhook reconciliation, not optimistic UI state. The dashboard shows the queue item in an "Awaiting send" section until detection fires.

The legacy direct-send code stays in the codebase behind a PostHog feature flag (`directEmailSend`) for ~3 months as insurance, then removed.

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
  | { kind: "graphDraft"; draftId: string; webLink: string; composeUrl: string };
```

Two implementations:

- **`MailtoProvider`** — pure URL construction, zero I/O. Default.
- **`MsGraphDraftProvider`** — calls `POST /me/messages` via existing `graphClientForUser`. Returns Graph's `webLink` (read-mode, official) and the unofficial compose-mode URL `https://outlook.office.com/mail/deeplink/compose/{id}` for one-click edit.

Provider selection in the `approve` mutation: presence of `ms_graph_tokens` row for the user → `MsGraphDraftProvider`; otherwise → `MailtoProvider`.

### State machine

```
pending  → drafted    (approve clicked, compose URL/draft prepared)
drafted  → sent       (send detected via webhook)
drafted  → dismissed  (consultant discards or 7-day expiry)
```

`approved` and `edited_and_approved` remain as terminal states for SMS (which still direct-sends via existing path).

### Schema changes

Drizzle migration on `message_queue`:

```sql
ALTER TYPE message_status_enum ADD VALUE 'drafted';

ALTER TABLE message_queue
  ADD COLUMN compose_kind text,        -- 'mailto' | 'graph_draft', nullable
  ADD COLUMN draft_id text,            -- Graph message ID, nullable
  ADD COLUMN draft_web_link text,      -- official read-mode link, nullable
  ADD COLUMN drafted_at timestamptz;   -- nullable
```

`mailto` URLs are deterministic from `to/subject/body/bcc` — regenerated on demand, never persisted.

`ms_graph_tokens` extension for subscription lifecycle:

```sql
ALTER TABLE ms_graph_tokens
  ADD COLUMN subscription_id text,
  ADD COLUMN subscription_expires_at timestamptz;
```

`conversations` table is unchanged. The row insert moves from approve-time (in `dispatchEmail`) to detection-time (in webhook handlers). Eliminates the current `hubspotActivityId IS NULL` intermediate state.

### Send detection

Two reconciliation paths converging on the same outcome:

| Path | Trigger | Primary users | Fallback |
|---|---|---|---|
| **HubSpot `email.creation` webhook** | BCC-ingested email arrives in HubSpot's pipeline (~15-90s after send) | mailto users | Backup signal for graph_draft users |
| **Graph SentItems webhook** | Sent message appears in user's Sent Items folder (~seconds after send) | graph_draft users | None for mailto users |

**HubSpot path** (existing handler at `src/app/api/hubspot/webhook/route.ts`):
- Match changes from "find `conversations` row with null `hubspotActivityId`" to "find `message_queue` row in `drafted` status for this lead within ±5min of `engagement.timestamp`"
- On match: INSERT `conversations` row with engagement body/subject/`hubspotActivityId`; UPDATE `message_queue.status = 'sent'`, `sentAt`

**Graph SentItems path** (new handler at `src/app/api/ms-graph/webhook/route.ts`):
- Subscription created on `/api/auth/ms-graph/callback` success: `POST /subscriptions` for `me/mailFolders('SentItems')/messages`, `changeType: 'created'`, ~70hr lifetime
- Hourly cron renews subscriptions expiring within 24hr
- Notification handler validates `clientState`, fetches the message via Graph, matches against `drafted` `message_queue` rows by `conversationId` (Graph drafts and their sent copies share `conversationId`), reconciles same as HubSpot path plus captures `sentBody`/`sentSubject` for diff data

### Race conditions

- **Both webhooks fire for a graph_draft user.** Graph SentItems fires first (~seconds); HubSpot fires later (~15-90s). Whichever lands first writes the conversation row; second is no-op via unique constraint on `conversations.messageQueueId` or status check.
- **Webhook fires before approve commits.** Unlikely (DB write happens before any external call). Handler treats "no matching draft" as no-op; HubSpot retries on 200.
- **User edits the draft in Outlook.** `message_queue.body` = our suggestion at approve time; `conversations.body` = what they actually sent (from Graph or HubSpot). Diff is the edit.
- **User sends a different message to the lead, not from our draft.** HubSpot path could match if subject + lead align — false positive risk. Graph path avoids this via `conversationId` exact match.

### Drift cleanup

Daily cron: `drafted` rows older than 7 days with no detection → transition to `dismissed` with reason `"draft_expired"`.

---

## UI Changes

### Approve mutation behaviour

- Returns `{ id, composeResult }` to the dashboard
- Dashboard auto-opens the URL on success:
  - `mailto` → `window.location.href = composeResult.url`
  - `graphDraft` → `window.open(composeResult.composeUrl, "_blank")`
- Optimistic snapshot pattern stays — row is removed from "Pending" immediately

### New "Awaiting send" queue section

Below "Pending", collapsible. Each row:
- Lead name, channel, subject preview
- "Drafted Xm ago"
- "Reopen in mail client" → regenerates mailto / reopens compose URL
- "Mark as sent" → manual override, transitions `drafted → sent` and inserts conversation row from queue data (no diff)
- "Cancel draft" → transitions to `dismissed`

When detection fires, row disappears with subtle confirmation toast: `"Email to {lead} confirmed sent"`.

### Toast copy

| Scenario | Copy |
|---|---|
| Approve success (mailto) | "Draft ready" + "Open in mail app" action |
| Approve success (graph_draft) | "Draft created in Outlook" + "Open draft" action |
| Send detected | "Email to {lead} confirmed sent" |
| Mark as sent (manual) | "Marked as sent" |
| Approve failure | Existing error handling |

---

## Feature flagging

PostHog flag `directEmailSend` (per-user targeting, already integrated):

```ts
const useDirectSend = await posthog.isFeatureEnabled(
  "directEmailSend",
  ctx.user.id,
);
if (useDirectSend && hasGraphConnection) {
  return dispatchEmail(...);  // legacy path
}
return draftEmail(...);  // new default
```

Default OFF. Internal admin allowlist for regression testing during Phase 1.

---

## OAuth scope changes

Existing scope: `["Mail.Send", "offline_access", "User.Read"]`

New scope: `["Mail.ReadWrite", "Mail.Send", "offline_access", "User.Read"]`

- `Mail.ReadWrite` required for `POST /me/messages` (draft creation) and SentItems webhook subscription
- `Mail.Send` retained for direct-send flag fallback during transition; dropped in Phase 3
- Existing connected users will hit a re-consent prompt on next visit (we add `prompt=consent` to the auth URL during the transition)

**Risk: MC1163922.** Microsoft's October 2025 policy change means M365 tenants on the default consent policy may now require admin pre-approval for `Mail.ReadWrite`. The mailto default mitigates this — Outlook integration becomes opt-in, not blocking.

---

## Testing

### Unit (Rstest)

- `src/server/dispatch/__tests__/mailto-provider.test.ts` — URL encoding, BCC inclusion, length-ceiling guard (warn > 1900 chars), special character escaping
- `src/server/dispatch/__tests__/ms-graph-provider.test.ts` — draft payload shape, `webLink` extraction, error mapping
- `src/server/dispatch/__tests__/resolve-provider.test.ts` — token row exists → Graph; absent → mailto; expired refresh → mailto fallback
- `src/server/api/__tests__/messages-router.test.ts` extended — approve writes `drafted` status + `composeKind`; does NOT write `sentAt` or insert conversation
- `src/app/api/hubspot/webhook/__tests__/route.test.ts` extended — match against `drafted` queue row, insert conversation + transition to `sent`
- `src/app/api/ms-graph/webhook/__tests__/route.test.ts` new — `clientState` validation, subscription lookup, conversationId match, idempotency

### E2E (Playwright)

- `e2e/features/email-dispatch.spec.ts` updated — assert mutation response shape, queue status transitions, simulated webhook → conversation row

---

## Rollout

**Phase 1 (this PR):**
- Migration + provider abstraction + new approve flow
- Mailto path enabled for all users
- Graph draft path behind feature flag (`enableGraphDrafts`) — internal admin only initially
- `directEmailSend` flag exists but defaults OFF for everyone

**Phase 2 (pilot validation, ~1 week post-merge):**
- Enable Graph drafts for Creation Homes' user via flag
- Monitor SentItems webhook reliability
- Capture diff data: how often are drafts edited?

**Phase 3 (cleanup, ~3 months out):**
- If `directEmailSend = true` rollout is 0% across all users for 30+ days: delete `dispatchEmail`, `sendEmail`, drop `Mail.Send` scope, remove flag
- Schedule reminder via `/schedule` for the audit + cleanup PR

---

## Known gaps + open questions

1. **Compose-mode URL is undocumented.** `https://outlook.office.com/mail/deeplink/compose/{id}` works today but Microsoft has never published it. If it breaks, fall back to the official `webLink` (read-mode, requires user to click pencil to edit).
2. **Subscription renewal reliability.** Graph subscriptions on messages have ~3-day max lifetime. We renew ~24hr before expiry. Vercel cron reliability is generally fine but worth a "subscription health" admin view.
3. **7-day draft expiry is arbitrary.** Confirm with consultants what feels right.
4. **Mailto BCC reliability.** Some clients silently drop `bcc` query params. Worth measuring how often HubSpot detection fails for mailto users.
5. **HubSpot ±5min match window may need widening.** BCC-to-engagement latency varies; if matches miss, widen to ±15min.
