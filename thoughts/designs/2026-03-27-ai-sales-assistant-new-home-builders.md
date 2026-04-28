# AI Sales Assistant for New Home Sales Consultants

**Date:** 2026-03-27
**Status:** Validated
**Approach:** AI Conversation Agent + Pipeline Dashboard (Approach A)

---

## Context

### The Pivot

Rekurve is pivoting from "AI sales automation for generic service businesses" to an **AI sales assistant for New Home Sales Consultants at QLD volume builders**. The first pilot customer is a sales consultant at Creation Homes QLD.

### The Problem

The consultant only has access to display home walk-ins — no inbound marketing leads. This results in very low lead volume. Due to the critical shortage of available land in SEQ (Logan has less than one week of serviced lots), when lots become available, the consultant often does not have a qualified lead ready for the lot. Other consultants with warm/hot pipelines win those allocations. Building and maintaining a strong pipeline of qualified leads, ready to go when a lot becomes available, is the core unlock.

### Market Context (QLD/SEQ)

- SEQ median land price: $437,900 (27% annual growth), now exceeding Melbourne
- Typical house-and-land package: ~$966,000
- $30,000 First Home Owner Grant expires 30 June 2026 (reverts to $15,000)
- Full stamp duty removal on new builds for first home buyers (from 1 May 2025) — no price cap
- Combined government incentive: up to ~$58,000 for first home buyers building new
- Build costs forecast to rise 10% in Brisbane by 2027-28 (Olympics-driven escalation)
- Annual lot shortfall: ~13,000 lots per year short of demand

### Pilot Customer

- **Builder:** Creation Homes QLD
- **Current CRM:** Brightfox (willing to set up independent HubSpot)
- **Lead sources:** Display home walk-ins only (no inbound marketing leads)
- **Lead generation plan:** Combination of personal social media, referral networks, community/networking, and figuring out what works
- **Lot availability model:** Mixed — some first-come-first-served via spreadsheets, some exclusive territory windows (~1 week), some direct from land developers (first right to sell with a qualified buyer)

---

## System Overview

Three layers:

### 1. AI Engine (the brain)

Powered by Claude API. Handles lead qualification analysis, message drafting, lead scoring, nurture sequence generation, and lot-lead matching. It never communicates directly with leads — it produces recommendations and drafts for the consultant.

### 2. Consultant Dashboard (the interface)

A Next.js web app (mobile-responsive, since the consultant is on their feet in a display home). This is the consultant's daily workspace. It answers three questions: "Who needs my attention?", "What should I say to them?", and "Which leads match this lot?"

### 3. HubSpot (the data layer)

Stores contacts, deals, properties, and activity history. Handles email delivery when the consultant approves a message. Provides CRM infrastructure (contact deduplication, email tracking, basic reporting).

### Flow

Leads enter from any channel -> AI analyses and scores them -> AI drafts appropriate outreach -> consultant reviews and approves in the dashboard -> HubSpot sends and logs the interaction -> AI monitors responses and queues the next action.

### Human-in-the-Loop (HITL)

All AI-generated responses and direct lead interactions require consultant review and approval before sending. The AI drafts, the consultant approves. Over time, as patterns are validated and the AI learns the consultant's voice, certain message types may be auto-approved.

---

## Lead Capture & Ingestion

Leads enter from varied, informal channels. The system meets the consultant where leads actually come from.

### Manual Entry (Walk-ins)

After a display home conversation, the consultant opens the dashboard and logs the lead. The form mirrors the Creation Homes enquiry fields (name, contact, land status, finance status, timeline, budget, property type, block dimensions). Voice-to-text input option for dictating notes while the conversation is fresh.

### Quick Capture

For informal encounters (networking events, social conversations), a minimal "name + phone + notes" entry that creates a lead with "unqualified" status. The AI then drafts qualification questions for the consultant to ask in follow-up.

### Referral Intake

When a mortgage broker or real estate agent sends a lead, the consultant forwards the email/message to a dedicated intake address. The AI parses the referral details, creates the contact in HubSpot, and flags what qualification data is missing.

### Future Channels (post-MVP)

Social media DM ingestion, web landing page forms, and QR codes at display homes. These are top-of-funnel features that layer on once the core pipeline management is proven.

### Normalisation

Every lead, regardless of entry point, gets normalised into the same qualification schema and immediately scored by the AI. Incomplete leads are flagged with specific missing fields so the consultant knows exactly what to ask next.

---

## Qualification Schema

Based on the Creation Homes Display Client Enquiry Form v1.2:

| Field | Options/Format |
|---|---|
| Full name | Free text |
| Phone number | Free text |
| Email address | Free text |
| Best time for contact | Weekdays / Weekends / Anytime |
| Do you have land? | Yes / No |
| Is land registered? | Yes / No + Address |
| Size of the property? | M2, Width, Depth |
| Type of property? | Single Storey / Double Storey / Investment / Upsize / Downsize / First Home Buyer |
| What are you looking to spend? | Free text (budget) |
| Have you seen Broker/Lender? | Yes / No |
| Timeline to start construction | Ready Now / 3-6 Months / 12 Month+ |
| Resolve Finance referral | Yes / No opt-in |
| Additional notes | Free text |

---

## AI Qualification & Scoring

### Lead Score (0-100)

| Factor | Weight | Hot Signal | Cold Signal |
|---|---|---|---|
| **Land status** | **30pts** | Registered land with dimensions | No land, no area preference |
| Finance status | 25pts | Pre-approved with broker | Haven't thought about it |
| Timeline | 20pts | Ready Now | 12+ months |
| Budget clarity | 10pts | Specific figure, aligns with Creation range | "Not sure" |
| Property type | 10pts | First Home Buyer (FHOG eligible) or clear intent | Vague / "just looking" |
| Engagement | 5pts | Responsive, asks questions | Ghosting follow-ups |

Land status holds the highest weight because land availability is the major constraint. Any lead with land should be treated as priority.

### Land Status Sub-scoring

- Registered land with dimensions known -> 30pts (can match to a design immediately)
- Land under contract / settling soon -> 22pts (pipeline-ready, waiting on settlement)
- Actively searching specific estates -> 15pts (can be matched when lots drop)
- "Looking at land eventually" -> 5pts (nurture)
- No land, no preferences -> 0pts

### Qualification Gap List

For every lead, the AI identifies exactly which fields are missing and generates the next question to ask. For a quick-capture lead (name + phone only), it might produce: "We know nothing about their finance or land status. Suggested opening: ask if they've started looking at land in any particular area."

### Lead Stages

- **Unqualified** (0-25) — Missing critical info, needs discovery
- **Nurture** (26-50) — Qualified but not ready (timeline 12mo+, no finance)
- **Warm** (51-75) — Qualified, progressing, but missing a key gate (e.g. no pre-approval yet)
- **Hot** (76-100) — Finance ready, timeline imminent, lot preferences known — ready to match

---

## Human-in-the-Loop Message Queue

### The Queue

A single, prioritised list of pending actions. Each item shows:

- Lead name and current score/stage
- The AI's recommended action (e.g. "Initial follow-up — ask about land status")
- The drafted message (SMS or email), ready to send
- Why the AI recommends this action (e.g. "No contact in 5 days, timeline is 3-6 months")
- One-tap approve, edit, snooze, or dismiss

### Priority Order

Sorted by urgency, not chronologically:

1. Hot leads with time-sensitive context (lot just became available, FHOG deadline approaching)
2. New leads needing first response (speed-to-lead)
3. Warm leads with overdue follow-up
4. Nurture touchpoints on schedule

### Batching for Efficiency

Low-stakes nurture messages (educational content, market updates, check-ins for 12mo+ leads) can be batch-approved: review a handful, then "approve all similar." Keeps HITL meaningful without creating busywork.

### Learning from Edits

Every time the consultant modifies a draft before approving, the system logs the before/after. Over time, this builds a profile of the consultant's voice, preferred phrasing, and communication style. The AI adapts its drafts to match, reducing edits needed.

### Escalation

If a lead replies with something complex (objection, detailed question, emotional response), the AI flags it as "consultant-only" rather than attempting a draft.

### SMS Delivery — Consultant Relay (MVP)

> **Future-state decision pending:** See [ADR-001](../../docs/adr/adr001-imessage-integration-for-sales-automation.md) (In Progress) for the planned iMessage device-bridge integration that will replace this relay model.

For MVP, the system does **not** send SMS to the lead directly. When the consultant approves an SMS draft, Twilio sends the drafted message body to the **consultant's own phone number**. The consultant then copies the message and sends it to the lead from their personal Messages app.

- **Outbound**: On approve, Twilio delivers the draft body to the consultant's phone (a single fixed number — the consultant). The lead receives the message from the consultant's personal number, in their existing iMessage thread, exactly as if it had been hand-typed.
- **Logging**: We log the outbound `conversations` row immediately on approve, on the assumption that the consultant relays the draft as-is. The risk of "approved but never sent" is judged low at pilot scale and will be addressed structurally by the iMessage integration (ADR-001) rather than a manual confirm step.
- **Inbound**: Lead replies land in the consultant's Messages app, not the system. Inbound capture is deferred until ADR-001 lands. The consultant pastes important replies into a lead note manually if they want them on record.
- **No carrier-to-lead path**: This intentionally sidesteps A2P/10DLC compliance, sender-trust issues from a Twilio shortcode, and the need to provision a per-consultant Twilio number for outbound-to-lead.

The `message_queue.channel` enum remains `sms | email`. The `conversations.delivery_method` enum remains, with SMS rows recorded as `sms` (intent) — the actual hop from consultant to lead happens off-system. Once ADR-001 ships, iMessage delivery becomes a system-tracked hop and `delivery_method=imessage` will be populated.

### Why Consultant Relay First

This relay is a deliberate stepping stone to the iMessage end-state in ADR-001:

- The consultant's phone is already the source-of-truth for SMS history with leads. Routing drafts through it now matches the long-term shape, just with a manual paste step.
- It eliminates the need for a Twilio sender number that the lead would not recognise.
- When ADR-001 ships, the only thing that changes for the lead is that the paste step disappears — the conversation continues in the same thread on the same number.

---

## Nurture Sequences

The AI generates contextual, personalised nurture plans for each lead based on their qualification data, stage, and QLD market context. No rigid drip templates.

### By Lead Stage

**Unqualified (0-25)** — Goal: complete the qualification picture. Discovery messages targeting specific missing fields. Cadence: 3-4 touches over 2 weeks, then archive if unresponsive.

**Nurture (26-50)** — Goal: keep top-of-mind until ready. Value-driven content: estate updates, FHOG eligibility reminders, construction cost trend warnings. Cadence: 1-2 touches per month.

**Warm (51-75)** — Goal: close qualification gaps. If finance is the blocker, offer to connect with Resolve Finance. If land is the gap, surface relevant estates or lot releases. Cadence: weekly, alternating SMS and email.

**Hot (76-100)** — Goal: get them into the display home or progress to tender. Consultant-direct outreach, not AI nurture. AI shifts to preparing briefing notes and design recommendations based on block dimensions and budget.

### Market-Aware Triggers

The AI incorporates real urgency: FHOG deadline countdown, lot releases in preferred estates, price increases, build cost escalation forecasts. Data-backed facts that genuinely help buyers make informed decisions.

---

## Lot-Lead Matching ("Ready Board")

### Lot Entry

The consultant logs lot availability as it comes in. Minimal fields: estate/suburb, lot number, land size (m2 + frontage), price, availability type (first-come / exclusive territory / developer direct), and exclusivity window. Takes 30 seconds.

### Instant Matching

Cross-references the lot against every lead in the pipeline on:

- **Location preference** — Does the lead want this estate/suburb/corridor?
- **Budget fit** — Can they afford this lot + a Creation Homes build?
- **Block compatibility** — Do the lot dimensions suit their desired property type?
- **Readiness** — Are they finance-ready and timeline-ready?
- **FHOG eligibility** — First home buyers flagged if lot + build falls under $750K grant cap

### Match Output

A ranked list of matching leads with:

- Match strength (strong / partial / stretch)
- What makes them a fit ("Pre-approved, wants Springfield, budget $720K, lot is $320K leaving $400K for build")
- What's missing ("Haven't confirmed block width preference — call to check")
- A pre-drafted outreach message

### Reverse Matching

When a lead reaches Hot status, the system shows compatible currently available lots — proactive recommendation rather than waiting for the lead to ask.

---

## Dashboard UX

Mobile-first. The consultant is on their feet in a display home, often on their phone between walk-ins.

### Three Views

**1. Action Queue (Default/Home)** — The HITL message queue. What they see when they open the app. Scrollable, priority-sorted. Swipe to approve, tap to edit, long-press to snooze. Badge count shows pending items. Morning routine: open the app, 5 minutes approving messages over coffee.

**2. Pipeline Board** — Leads by stage (Unqualified -> Nurture -> Warm -> Hot). Each card: name, score, last contact, top qualification gap. Tap for full profile with conversation history, AI next action, and lot matches. Filter by estate preference, FHOG eligibility, or timeline.

**3. Lot Matcher** — Enter lot details, hit "Find Matches," get ranked leads. One tap to queue outreach. Persistent view of all active lots with match counts ("Springfield lot: 3 strong matches, Yarrabilba lot: none").

**No fourth view.** Reporting, analytics, sequence config lives in HubSpot or a settings panel. The dashboard is for doing, not analysing.

### Notifications

Push notifications for: new lead entered by referral/intake, lot-lead match found, lead replied, lead score changed to Hot.

---

## Tech Architecture

### Route Group Structure

Following the rekurve/rekurve/ pattern — four independent route groups with no shared root layout:

```
src/app/
  (website)/          # Public marketing site — edge runtime, SEO-optimised
    layout.tsx        # <html>, fonts, robots: index/follow
    page.tsx          # Landing page
    privacy/

  (login)/            # Auth pages — redirects to /dashboard if session exists
    layout.tsx        # robots: noindex, no chrome
    login/
    signup/

  (onboarding)/       # Post-auth setup — redirects if not authenticated
    layout.tsx
    onboarding/

  (application)/      # Authenticated dashboard — TRPCReactProvider here only
    layout.tsx        # Auth gate, app shell
    dashboard/        # Action Queue (default view)
    pipeline/         # Pipeline Board
    lots/             # Lot Matcher
    settings/
```

Auth enforced at layout level via server-side session checks and redirects. (website) stays fully static/edge-rendered for SEO. TRPCReactProvider only wraps (application).

### Server Layer — tRPC

Following the aidlc-demo dual-client pattern:

- RSC direct caller (server.ts) with cache()-wrapped context and HydrateClient for SSR prefetch -> client hydration
- Client httpBatchStreamLink for interactive mutations
- protectedProcedure with narrowed session types
- SuperJSON + Zod error formatting
- Routers: leads, lots, messages, ai, nurture

### Database — Neon Postgres + Drizzle ORM

Serverless Postgres on Neon, integrates natively with Vercel. Drizzle ORM for type-safe queries. Relational model fits naturally: leads have messages, lots have matches, sequences have steps. DynamoDB was assessed but rejected — the only reason for AWS would be DynamoDB itself, adding unnecessary AWS account/IAM/Terraform overhead for a single service with cross-cloud latency.

### Auth — better-auth

`auth.api.getSession()` wrapped in `cache()`. Email OTP via better-auth plugin for the pilot (single consultant). Chose OTP over magic link: eliminates corporate email scanner token consumption, better mobile UX (iOS/Android auto-detect OTP codes), simpler client implementation (no callback route needed), and more resilient retry flow (3 attempts vs 1). Google OAuth addable later for multi-user. Auth.js maintainers joined better-auth in Sep 2025 — better-auth is the recommended path for new projects.

### External Integrations

- **Claude API** — server-side AI functions (scoring, drafting, matching)
- **HubSpot CRM API** — contact sync, email sending, deal tracking
- **Twilio** — relays approved SMS drafts to the **consultant's** phone for manual forward to the lead (MVP). Single fixed recipient number. No A2P/10DLC consumer path required.
- **iMessage via device-bridge service** — future replacement for the consultant-relay step, sending directly from the consultant's personal phone number. See [ADR-001](../../docs/adr/adr001-imessage-integration-for-sales-automation.md) (In Progress).
- **Vercel** — deployment, Neon Postgres

---

## Data Model

### leads

The central entity. Maps to the Creation Homes enquiry form.

- `id`, `hubspot_contact_id` (sync key)
- Contact: `first_name`, `last_name`, `email`, `phone`, `preferred_contact_time`
- Land: `has_land`, `land_registered`, `land_address`, `land_size_sqm`, `land_width`, `land_depth`
- Qualification: `property_type` (enum: single_storey, double_storey, investment, upsize, downsize, first_home_buyer), `budget`, `seen_broker`, `construction_timeline` (enum: ready_now, 3_6_months, 12_months_plus)
- Scoring: `lead_score` (0-100), `lead_stage` (enum: unqualified, nurture, warm, hot)
- Preferences: `preferred_estates` (array), `preferred_suburbs` (array)
- Source: `lead_source` (enum: walk_in, referral, social, web, other), `referrer_name`, `notes`
- `resolve_finance_opted_in` (boolean)
- Timestamps: `created_at`, `updated_at`, `last_contacted_at`

### lots

Available lot inventory.

- `id`, `estate_name`, `suburb`, `lot_number`
- `land_size_sqm`, `frontage_m`, `depth_m`, `price`
- `availability_type` (enum: first_come, exclusive_territory, developer_direct)
- `exclusive_until` (nullable timestamp)
- `status` (enum: available, matched, sold, expired)
- `notes`
- Timestamps: `created_at`, `updated_at`

### lot_matches

Join table linking lots to matching leads.

- `id`, `lot_id`, `lead_id`
- `match_strength` (enum: strong, partial, stretch)
- `match_reasoning` (AI-generated explanation)
- `outreach_status` (enum: pending, queued, sent, responded)
- `created_at`

### message_queue

The HITL approval queue.

- `id`, `lead_id`
- `channel` (enum: sms, email) — intent, not delivery method
- `subject` (nullable, email only), `body`
- `ai_reasoning` (why the AI recommends this action)
- `priority` (integer, lower = more urgent)
- `status` (enum: pending, approved, edited_and_approved, dismissed, snoozed)
- `snoozed_until` (nullable timestamp)
- `original_body` (preserved when edited, for learning)
- `approved_at`, `sent_at`, `created_at`

### conversations

Log of all messages sent/received per lead.

- `id`, `lead_id`, `message_queue_id` (nullable — null for manual sends)
- `channel`, `direction` (enum: inbound, outbound)
- `delivery_method` (enum: imessage, sms, email) — actual protocol used
- `subject`, `body`
- `hubspot_activity_id` (sync key)
- `created_at`

### nurture_sequences

Active nurture plans per lead.

- `id`, `lead_id`
- `sequence_type` (enum: discovery, nurture, warm_progression, lot_alert)
- `status` (enum: active, paused, completed)
- `next_step_at` (when the next message should be drafted)
- `created_at`, `updated_at`

No separate users table for the pilot. NextAuth user record covers auth identity. Multi-user comes later.

---

## Phase 1 MVP Scope (Month 1)

### Week 1: Foundation

- Project scaffold: route groups, tRPC, Drizzle, Neon, better-auth with email OTP
- Database schema: all tables, migrations run
- HubSpot integration: API connection, contact sync
- Auth flow: login -> dashboard redirect

### Week 2: Lead Management + AI Scoring

- Lead entry forms: full enquiry form (walk-in) and quick capture (name + phone + notes)
- AI qualification: Claude API integration for qualifyAndScore() — runs on lead create/update
- Pipeline board view: leads grouped by stage, tap for full profile
- Lead profile page: all qualification data, score breakdown, gap list

### Week 3: HITL Message Queue + Nurture

- Message queue: AI drafts follow-up messages based on lead stage and gaps
- Action queue view: prioritised list with approve/edit/snooze/dismiss
- Twilio SMS integration: relays approved SMS drafts to the consultant's phone for manual forward to the lead
- HubSpot email integration: sends on approval, logs activity
- Basic nurture: AI generates next-step recommendations and queues drafts on schedule
- Conversation log: all sent/received messages on lead profile

### Week 4: Lot Matcher + Polish

- Lot entry form: estate, dimensions, price, availability type, exclusivity window
- AI lot-lead matching: matchLeadsToLot() runs on lot creation
- Lot matcher view: enter lot -> see matches -> one-tap queue outreach
- Reverse matching: hot lead profile shows compatible available lots
- Push notifications: new lead, lot match found, lead replied, lead turned hot
- Mobile UX polish

### NOT in Phase 1

- Referral email intake (parsing forwarded emails)
- AI voice/tone learning from edits (data logged but not trained on)
- Batch approval for nurture messages
- Top-of-funnel: landing pages, lead magnets, ad integration
- Multi-user / multi-builder support
- Reporting / analytics dashboards

### Success Criteria

The consultant has a populated pipeline of scored, staged leads. When a lot becomes available, they can find matching leads and send outreach within minutes, not hours. Follow-up compliance is near 100% because the AI queues every touchpoint.

---

## Research References

### New Home Sales Process

- [Builder Funnel — Homebuilder Sales Funnel](https://info.builderfunnel.com/understanding-how-the-homebuilder-sales-funnel-works)
- [Bokka Group — Conversion Rates](https://www.bokkagroup.com/home-builder-insights/articles/average-conversion-rates-home-builder-sales)
- [Bokka Group — OSC Program Guide](https://www.bokkagroup.com/home-builder-insights/articles/build-an-online-sales-counselor-program-for-new-home-construction)
- [Association of Professional Builders — Sales Process](https://blog.associationofprofessionalbuilders.com/the-proven-construction-sales-process-for-custom-home-builders)

### QLD/SEQ Market

- [Oliver Hume — SEQ Land Prices](https://www.oliverhume.com.au/news/south-east-queensland-land-prices-surge-past-400-000)
- [Urban Developer — SEQ Land Squeeze](https://www.theurbandeveloper.com/articles/people-are-coming-but-land-isn-t-seq-squeeze-rpm-greenfied)
- [QRO — First Home Owner Grant](https://qro.qld.gov.au/property-concessions-grants/first-home-grant/)
- [QLD Stamp Duty Concession](https://aplacetocallhome.initiatives.qld.gov.au/initiatives/stamp-duty-concession)
- [WT Partnership — Construction Cost Escalation](https://wtpartnership.com.au/about/news/renewed-cost-escalation-brisbane-2032-housing-demand-fuel-next-construction-cycle/)

### Existing Tools

- [Lasso CRM](https://www.ecisolutions.com/products/lasso-crm/)
- [Structurely — AI Lead Qualification](https://www.structurely.com/)
- [Builtfront — CRM Comparison](https://builtfront.com/blog/best-crm-software-home-builders/)

### Architectural References

- `rekurve/rekurve/` — Route group pattern (website/login/onboarding/application), tRPC setup, Drizzle + Neon
- `v2/aidlc-demo/` — tRPC v11 dual-client pattern (RSC + client), auth with cache(), HydrateClient, shared QueryClient
- `v2/devoli-aws-prototype/` — DynamoDB pattern (assessed, rejected for this project due to AWS overhead)
