---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-04-29'
# prettier-ignore
---

# Outlook send with HubSpot BCC reconciliation

Technical Story: Issue [#130](https://github.com/samjmarshall/rekurve/issues/130) — originally specified the HubSpot Single-Send Transactional API; pilot cost gating and the "invisible infrastructure" posture moved the send path to the consultant's Outlook mailbox with BCC reconciliation.

## Context and Problem Statement

Outbound email approved on `/dashboard` has to leave the system on behalf of the consultant — display-home walk-in leads already have the consultant's name and email address, and the product posture is that the consultant is the relationship and Rekurve is invisible infrastructure. The HubSpot timeline must still record the engagement so the consultant and their sales manager see a complete conversation log, and any reply the lead sends must land in the consultant's normal Outlook inbox so they can take over the thread without switching apps.

How does outbound email send while keeping Rekurve invisible to the lead, populating the HubSpot timeline faithfully, and leaving the consultant a reply-ready thread on their own machine?

## Decision Drivers

- **Lead-facing sender identity** — the consultant is the relationship. The lead must see the consultant's own email address (`firstname.lastname@creationhomes.com.au`) as the sender, not a Rekurve-branded address.
- **HubSpot timeline fidelity** — the engagement on the HubSpot timeline must look like a real email: correct MIME, headers, threading, and direction flags. This is what the sales manager sees when auditing pipeline activity.
- **Reply-thread compatibility** — when the lead replies and the consultant hits Reply in Outlook, the reply must also land in HubSpot without separate inbound plumbing.
- **Cost (pre-PMF)** — Marketing Hub Enterprise + Transactional Email add-on (~$400/mo) is gated out at pilot scale.
- **Thread visibility on the consultant's own machine** — the consultant must see the outbound thread in their normal Outlook Sent Items so they can reply natively at any time.

## Considered Options

1. Graph `/me/sendMail` + `HUBSPOT_BCC_ADDRESS` reconciliation
2. HubSpot Single-Send Transactional API
3. HubSpot Engagements API direct POST after Graph send
4. Resend from a shared `noreply@rekurve` domain

## Decision Outcome

Chosen option: "1. Graph `/me/sendMail` + `HUBSPOT_BCC_ADDRESS` reconciliation", because it is the only option that puts the consultant's own mailbox on the lead-facing side while letting HubSpot's native BCC ingestion produce the highest-fidelity timeline engagement at zero subscription cost. The shipped mechanism: the approve mutation calls Microsoft Graph `/me/sendMail` on the consultant's own M365 mailbox with `env.HUBSPOT_BCC_ADDRESS` (the portal-specific `bcc-NNNNN@bcc.hubspot.com`) BCC'd on every send; HubSpot ingests the BCC, creates the timeline engagement asynchronously, and fires `object.creation` for `objectTypeId = "0-49"`; `handleEmailCreation` matches the engagement back to the local `conversations` row by lead + delivery method + ±5min `createdAt` window + matching subject and stamps `hubspotActivityId`.

### Positive Consequences

- **Consistent with [adr003](adr003-hubspot-source-of-truth-for-contacts.md).** HubSpot owns the canonical timeline engagement; the local `conversations` row mirrors it via `hubspotActivityId` once HubSpot tells us what the engagement ID is. The app does not synthesise the timeline shape — same posture as contact data.
- **Single mailbox per consultant is locked in by schema, and that is a feature for the pilot.** `ms_graph_tokens.userId` is the primary key — one Microsoft account per `user.id`, no shared mailbox, no send-as, no delegated send. This eliminates ambiguity about which mailbox a send came from and which inbox a reply will arrive in. Multi-mailbox onboarding is a schema change and an OAuth-flow change, not a config tweak — a deliberate post-PMF concern.

### Negative Consequences

- **`conversations.hubspotActivityId` is nullable for ~15–90s after every send, and indefinitely if the webhook is dropped.** This is the operational shape of "HubSpot creates the engagement asynchronously." Most consumers (lead profile, queue UI, conversation log) tolerate the null state and should continue to. The approve mutation does not block on reconciliation. Future features that require a guaranteed `hubspotActivityId` cannot be built on `conversations` without first solving missed-webhook recovery — a nightly reconciler (find rows older than ~15min with null `hubspotActivityId`, query HubSpot for matching engagements, stamp them) is the obvious shape but is deliberately deferred until pilot evidence shows the webhook actually drops events. Any feature that *cannot* tolerate indefinite null on this column owns the reconciler as a blocker.
- **Subject-based reconciliation is fuzzy at the ±5-minute boundary.** Two outbound emails to the same lead with the same subject within 5 minutes will race; the closest-by-`createdAt` candidate wins, the other stays null. Acceptable at pilot volume because AI drafts vary subjects; if collision rates rise, the matching window narrows or the match key extends (e.g. body hash) before the window widens.
- **Silent SMTP-bounce gap ([#154](https://github.com/samjmarshall/rekurve/issues/154)).** Graph returns 202 (queued) before SMTP delivery. Microsoft can later bounce with `550 5.7.501 Spam abuse detected from IP range` and the dashboard will already have shown "Sent via email". This is a known limitation of "trust the 202"; the successor design folded into adr013 / adr014 addresses it via webhook-driven send detection.
- **MSAL `acquireTokenByCode` workaround fragility.** The SDK's typed result drops `refresh_token`, so the OAuth callback POSTs `/oauth2/v2.0/token` directly to capture it. If MSAL changes its surface, the hand-rolled fetch needs review — fragile against `@azure/msal-node` upgrades and worth flagging in code review when the package is bumped.

## Pros and Cons of the Options

### 1. Graph `/me/sendMail` + `HUBSPOT_BCC_ADDRESS` reconciliation

The consultant authorises Microsoft Graph access via OAuth; the approve mutation calls Graph `/me/sendMail` on their mailbox with `env.HUBSPOT_BCC_ADDRESS` BCC'd; HubSpot creates the engagement asynchronously and the webhook handler reconciles it back to the local `conversations` row.

| Pros | Cons |
| ---- | ---- |
| Lead sees the consultant's own email as the sender — Rekurve stays invisible | `hubspotActivityId` nullable for ~15–90s after every send (indefinitely if webhook drops) |
| HubSpot's native BCC ingestion produces the highest-fidelity timeline engagement (correct MIME, headers, threading, direction flags) | ±5-minute subject-match reconciliation can race on rapid-fire same-subject sends |
| Outlook thread lands in the consultant's Sent Items — they can reply natively at any time | Graph returns 202 before SMTP delivery — silent bounce gap ([#154](https://github.com/samjmarshall/rekurve/issues/154)) |
| Forward-compatible with inbound replies: the original BCC stays on the reply thread, so HubSpot picks the reply up the same way | MSAL `acquireTokenByCode` workaround is fragile against `@azure/msal-node` upgrades |
| Zero subscription cost — uses the consultant's existing M365 mailbox | Schema locks one Microsoft mailbox per consultant — multi-mailbox onboarding is a schema + OAuth-flow change |

### 2. HubSpot Single-Send Transactional API

What issue [#130](https://github.com/samjmarshall/rekurve/issues/130) originally specified — call HubSpot's Single-Send endpoint and let HubSpot send the email and write the engagement in one call.

| Pros | Cons |
| ---- | ---- |
| One API call — no reconciliation step, no nullable window on `hubspotActivityId` | Requires Marketing Hub Enterprise + Transactional Email add-on (~$400/mo) — cost-gated out of the pre-PMF pilot |
| HubSpot owns delivery, retries, and timeline atomically | Sender identity routed through HubSpot's sending infrastructure, not the consultant's mailbox — breaks lead-facing identity driver |
| Battle-tested transactional path | Consultant does not get an Outlook Sent Items entry or a reply-ready thread on their own machine |

### 3. HubSpot Engagements API direct POST after Graph send

Call `POST /crm/v3/objects/emails` from the approve mutation once Graph returns 202, stamp `hubspotActivityId` synchronously, skip the BCC plumbing and the reconciliation window entirely.

- Good, because it eliminates the ~15–90s nullable window on `hubspotActivityId` and the ±5-minute subject-match race.
- Good, because the HubSpot CRM API surface is already installed — no new BCC envelope-routing dependency.
- Bad, because HubSpot's native BCC ingestion is the highest-fidelity way to populate the timeline: it produces an engagement with the right MIME, headers, threading, and direction flags because HubSpot built it for exactly this. A hand-rolled Engagements POST has to recreate that surface and will drift from "looks like a normal email in the timeline" in ways the consultant or sales manager will eventually notice.
- Bad, because the BCC mechanism is forward-compatible with inbound replies: when the lead replies and the consultant hits Reply in Outlook, the original BCC stays on the thread, so HubSpot picks the reply up the same way it picks up the outbound. Engagements API outbound + manual inbound handling is a much bigger lift later.

### 4. Resend from a shared `noreply@rekurve` domain

Already installed for OTP, simpler to wire — send all outbound from a Rekurve-branded sender via Resend.

- Good, because Resend is already installed for OTP — it would be the lowest-effort send-path swap.
- Good, because the delivery surface is well-trodden (no MSAL workaround, no OAuth flow per consultant).
- Bad, because the lead would see a Rekurve-branded sender, which contradicts the product's posture: the consultant is the relationship and Rekurve is invisible infrastructure.
- Bad, because there is no Outlook thread, no Sent Items entry on the consultant's machine, and no reply visibility in their normal inbox — the consultant loses the manual-takeover surface.
- Bad, because reply handling is not native — replies to `noreply@` are either lost or require separate inbound plumbing.

## Consequence update — 2026-05-04 (ADR-013 / ADR-014)

The *core decision* of this ADR — Outlook + HubSpot BCC over Resend / Single-Send / direct Engagements POST — is preserved under [ADR-013](adr013-local-db-canonical-for-lead-data.md). The *mechanism* changes:

- The synchronous Microsoft Graph send from the approve mutation moves into an Inngest worker subscribed to a `message.approval-requested` event published through the [outbox](adr014-outbox-pattern-for-inngest-delivery.md). The mutation commits the message-state transition locally and returns to the Consultant immediately; the Graph send happens in the worker.
- The BCC reconciliation flow becomes a `step.waitForEvent("hubspot.email.engagement-created", { match: "data.correlationId" })` keyed by a generated correlation ID stamped into the email's `internetMessageId` header. The fuzzy ±5-minute subject match window is replaced by deterministic correlation. The `hubspotActivityId` nullable window survives but is bounded by the `step.waitForEvent` timeout instead of "indefinitely if the webhook is dropped."
- A `step.waitForEvent` timeout (e.g. 1 h) emits `hubspot.engagement-missed` for the operator surface, replacing the silent indefinite-null state and removing one of the open consequences of this ADR.
- The Graph 202-then-silent-bounce gap (#154) becomes a separate Inngest function subscribed to a future Graph webhook for delivery status; the worker stamps the bounce on the local `conversations` row instead of leaving the dashboard saying "Sent" while SMTP later rejects.

The schema is unchanged. The choice of Outlook is unchanged. The single-mailbox-per-Consultant lock-in stands. The successor design referenced below folds into the ADR-013 / ADR-014 plan rather than superseding this ADR independently.

## Links

- Successor design: [Email compose providers](../../thoughts/designs/2026-04-27-email-compose-providers.md)
- Issue [#130](https://github.com/samjmarshall/rekurve/issues/130) — originally specified HubSpot Single-Send
- Issue [#154](https://github.com/samjmarshall/rekurve/issues/154) — silent SMTP bounce after Graph 202
- Issue [#156](https://github.com/samjmarshall/rekurve/issues/156) — MIME-content `sendMail`
- Refined by [ADR013](adr013-local-db-canonical-for-lead-data.md)
- Refined by [ADR014](adr014-outbox-pattern-for-inngest-delivery.md)
