---
Status: 'In Progress'
Deciders: 'Sam Marshall'
Date: '2026-03-27'
# prettier-ignore
---

# Use iMessage via Device-Bridge Service for Automated Sales Messaging

Technical Story: Automated messages sent from the consultant's personal phone number for trust and seamless manual takeover. Related: samjmarshall/rekurve#87 (Epic 3: HITL Message Queue + Nurture)

## Context and Problem Statement

The HITL message queue (Epic 3) needs to send AI-drafted follow-up messages to leads on the consultant's behalf. The current design specifies Twilio for SMS and HubSpot for email. However, the pilot consultant's leads come from display home walk-ins — these leads already have the consultant's personal phone number. Sending from a different Twilio number breaks trust and context.

Additionally, when a lead replies with something urgent or complex, the consultant needs to pick up the conversation immediately from their iPhone — in the same thread, from the same number — with zero switching cost.

How should the system send automated text messages from the consultant's personal iMessage/phone number while preserving the ability to seamlessly hand off to manual conversation?

## Decision Drivers

- **Trust continuity**: Display home walk-in leads already have the consultant's personal number. Messages from an unknown Twilio number feel impersonal and may be ignored.
- **Seamless manual takeover**: When a reply requires immediate human attention, the consultant must be able to respond from their native Messages app in the same conversation thread.
- **iMessage delivery**: Most Australian iPhone users have iMessage enabled. Blue bubble delivery provides read receipts and richer messaging vs green SMS.
- **Pilot scale**: ~20-50 active leads, well within any rate limit. No need for enterprise-grade message pooling.
- **Cost sensitivity**: Pre-revenue pilot phase. Minimise fixed costs.
- **Reliability**: Messages must be delivered. If the primary channel fails, a fallback must exist.
- **Inbound capture**: Replies from leads must flow back into the system for AI analysis and conversation logging, even if the consultant replies manually.
- **Apple's enforcement stance**: No official iMessage API exists. All automation carries some level of risk. Apple can revoke iMessage access with no appeals process.

## Considered Options

1. Texting Blue (device-bridge, personal number, $19/mo)
2. myCRMSIM (device-bridge, personal number, GoHighLevel-specific, $29/mo)
3. Twilio SMS only (dedicated number, no iMessage)
4. Sendblue / Blooio (managed iMessage API, dedicated number, $289-1000/mo)
5. BlueBubbles (self-hosted open source, personal number, ~$75-119/mo infra)
6. AppleScript on a Mac (DIY, personal number, free)

## Decision Outcome

Leaning towards: "Option 1 — Texting Blue", because it is the only option that satisfies all three critical drivers (personal number, seamless manual takeover, API for automation) at the lowest cost and complexity for pilot scale. Final decision pending validation of Texting Blue's webhook capabilities and API documentation.

### Positive Consequences

- Messages come from the consultant's existing personal number — leads recognise the sender
- Consultant can respond directly from their iPhone Messages app at any time, picking up where automation left off
- Inbound replies captured via webhook, keeping the AI and conversation log in sync even after manual takeover
- Lowest monthly cost ($19/mo) of any structured service
- Minimal architecture changes — slots into the existing `message_queue` approval flow as a send-path swap
- Low Apple ban risk at pilot volume (~20-50 leads)

### Negative Consequences

- Consultant's iPhone must remain on and connected for messages to send
- Dependency on a small third-party service (Texting Blue) — less established than Twilio
- If the consultant's iPhone is offline, messages are delayed (no automatic fallback unless Twilio is retained)
- All device-bridge iMessage services carry inherent risk of Apple changing how Messages works in a macOS/iOS update
- Need to validate: does Texting Blue capture outbound messages sent manually by the consultant (for conversation log completeness)?

## Pros and Cons of the Options

### 1. Texting Blue (device-bridge, $19/mo)

Routes iMessage through the consultant's actual iPhone via an installed profile. REST API + webhooks. Web-based team inbox included.

| Pros | Cons |
| ---- | ---- |
| Uses consultant's personal number | iPhone must stay on and connected |
| $19/mo — cheapest option | Small company, less battle-tested than Twilio |
| REST API + webhooks for send/receive | Webhook documentation depth unverified |
| Team inbox for multi-user later | Device-constrained throughput (fine for pilot) |
| Consultant can reply natively in Messages app | No automatic SMS fallback if device offline |
| Low ban risk at pilot volume | |

### 2. myCRMSIM (device-bridge, $29/mo)

Bridges Mac + iPhone to GoHighLevel CRM. Personal number. Recommends max 50 contacts/day.

| Pros | Cons |
| ---- | ---- |
| Uses consultant's personal number | Locked to GoHighLevel CRM — we use HubSpot |
| Well-documented 50/day safe threshold | Requires Mac running continuously + iPhone |
| Auto-falls back to SMS if not iMessage | $29/mo (marginally more expensive) |
| Native CRM inbox for manual takeover | CRM lock-in makes it unsuitable for our stack |

### 3. Twilio SMS only (no iMessage)

Standard A2P SMS from a dedicated Twilio number. Well-documented, battle-tested, no Apple dependency.

| Pros | Cons |
| ---- | ---- |
| Most reliable and well-documented | Different number — breaks trust with walk-in leads |
| No Apple dependency or ban risk | Green SMS only, no iMessage features |
| Per-message pricing suits low volume | No seamless manual takeover (different thread) |
| Battle-tested infrastructure | Consultant would need to switch apps to respond |
| Australian number available | A2P registration required |

### 4. Sendblue / Blooio (managed iMessage API, $289-1000/mo)

Cloud-hosted Mac infrastructure with pooled Apple IDs. Dedicated phone number (not the consultant's personal number). Blue bubble delivery.

| Pros | Cons |
| ---- | ---- |
| Managed infrastructure, no device dependency | Dedicated number, NOT personal number |
| Risk distributed across Apple ID pools | $289-1000/mo — excessive for pilot |
| Good API documentation (Sendblue) | No seamless manual takeover from native Messages |
| Handles iMessage + SMS fallback | Consultant would need to use their web inbox |

### 5. BlueBubbles (self-hosted, ~$75-119/mo infra)

Open-source macOS server with REST API + webhooks. Runs on own Mac or rented Mac Mini.

| Pros | Cons |
| ---- | ---- |
| Full control, personal number | Must maintain Mac server 24/7 |
| Free software, good API | $75-119/mo for cloud Mac Mini |
| Active open-source community | Infrastructure maintenance burden |
| Captures all message types | No off-the-shelf CRM integration |
| | More complexity than a managed service |

### 6. AppleScript on a Mac (DIY, free)

Native macOS scripting via `osascript` to send messages through the Messages app.

| Pros | Cons |
| ---- | ---- |
| Free, no third-party dependency | Extremely fragile — breaks with macOS updates |
| Uses personal number | No reliable delivery confirmation |
| Trivially simple for one-off sends | No webhook for inbound messages |
| | No API for programmatic control |
| | Ban-prone at any meaningful volume |
| | Not suitable for production |

## Open Questions

- [ ] Validate Texting Blue API: webhook event types, delivery status callbacks, does it capture manually-sent outbound messages?
- [ ] Confirm Texting Blue works with Australian phone numbers and Australian iPhone setup
- [ ] Determine whether to retain Twilio as a fallback for device-offline scenarios or accept delayed delivery
- [ ] Investigate Texting Blue's track record / uptime history / company stability

## Implementation Notes

A channel-filtered `dispatch-imessage` Inngest subscriber placeholder now exists (`src/inngest/functions/messages/dispatch-imessage.ts`, #262). It shares the `verify-still-approved` cancellation step with `dispatch-email` and `dispatch-sms` but throws "not implemented" in its send step. It is unreachable until the four Open Questions above are resolved and this ADR is Accepted.

## Links

- Design doc: [AI Sales Assistant for New Home Builders](../../thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md)
- Epic 3: [HITL Message Queue + Nurture](../../thoughts/epics/2026-03-27-epic-3-hitl-message-queue-nurture.md)
- Texting Blue: https://texting.blue/
- myCRMSIM: https://mycrmsim.com/imessage
- BlueBubbles: https://github.com/BlueBubblesApp/bluebubbles-server
