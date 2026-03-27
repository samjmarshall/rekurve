# Epic 1: MVP Foundation — Scaffold, Database, Auth & HubSpot

**GitHub Issue:** samjmarshall/www#85
**Type:** Epic
**Milestone:** M0: Pilot Validation
**Labels:** epic, infrastructure
**Priority:** P0 (Critical)
**Estimate:** 5-10 hours (1 week at current capacity)
**Start:** 2026-03-31
**Target:** 2026-04-04

---

## Goal

Stand up the full application skeleton for the Creation Homes AI Sales Assistant — route groups, tRPC server layer, database schema, authentication, and HubSpot integration. By the end of this epic, the consultant can log in via magic link and land on an empty dashboard, with all database tables migrated and HubSpot API connected.

## Business Context

**Problem:** The Creation Homes pilot customer is ready and waiting. No code exists yet for the new home builder sales assistant.
**Opportunity:** Unblock all subsequent epics — lead management, HITL queue, and lot matching all depend on this foundation.
**Success metrics:** Auth flow works end-to-end, all tables exist in Neon, HubSpot contact sync runs without error.
**Stakeholders:** Pilot consultant (Creation Homes QLD), Sam (founder/developer).

## Scope

**In Scope:**
- Next.js route group structure: `(website)`, `(login)`, `(onboarding)`, `(application)`
- tRPC dual-client setup (RSC direct caller + client httpBatchStreamLink)
- Drizzle ORM + Neon Postgres: all 6 tables with migrations
- NextAuth v5 with email magic link
- HubSpot API connection and bidirectional contact sync
- Auth flow: login -> dashboard redirect, session checks at layout level
- Empty dashboard shell (mobile-responsive app shell)

**Out of Scope:**
- Lead entry forms (Epic 2)
- AI scoring logic (Epic 2)
- Message queue UI (Epic 3)
- Lot matching (Epic 4)
- Twilio/SMS integration (Epic 3)
- Multi-user support

## Key Deliverables

1. **Route group scaffold** — 4 independent route groups with separate layouts, no shared root layout
2. **tRPC server layer** — Dual-client pattern, protectedProcedure, SuperJSON + Zod error formatting, router stubs for leads/lots/messages/ai/nurture
3. **Database schema** — All 6 tables: `leads`, `lots`, `lot_matches`, `message_queue`, `conversations`, `nurture_sequences` with enums and indexes
4. **Auth flow** — NextAuth v5, `auth()` wrapped in `cache()`, magic link provider, login/dashboard redirect
5. **HubSpot integration** — API client, contact sync (create/update), webhook or polling for inbound changes

## Breakdown into Stories/Tasks

> Child issues will be created via `/create_plan`. Indicative breakdown:

- [ ] Scaffold route groups with independent layouts
- [ ] Set up tRPC dual-client (RSC + client) with router stubs
- [ ] Configure Drizzle ORM + Neon connection
- [ ] Create database schema and run migrations (all 6 tables)
- [ ] Implement NextAuth v5 with magic link provider
- [ ] Build login page and auth redirect flow
- [ ] Build empty dashboard app shell (mobile-responsive)
- [ ] Set up HubSpot API client and contact sync
- [ ] Verify end-to-end: login -> dashboard with session, tables exist, HubSpot connected

## Dependencies

- Neon Postgres project provisioned (Vercel integration)
- HubSpot account set up by pilot consultant (confirmed — willing to set up independent HubSpot)
- Vercel project configured for deployment
- Environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `HUBSPOT_API_KEY`

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| HubSpot API rate limits during sync | Medium | Implement batching and respect rate limit headers |
| Magic link email deliverability | Medium | Use Resend or Vercel Email; test with real email before pilot |
| Neon cold start latency | Low | Neon serverless driver handles this; monitor in practice |

## Success Criteria

- [ ] Consultant can receive magic link email and log in
- [ ] Dashboard loads with empty state after auth
- [ ] All 6 database tables exist with correct schema
- [ ] tRPC health check returns OK from both RSC and client contexts
- [ ] HubSpot contact created in app syncs to HubSpot (and vice versa)
- [ ] Deployed to Vercel and accessible

## References

- Design doc: `thoughts/designs/2026-03-27-ai-sales-assistant-new-home-builders.md`
- Route group pattern: `rekurve/rekurve/`
- tRPC dual-client pattern: `v2/aidlc-demo/`
- Enquiry form fields: `docs/sales/Display-Client-Enquiry-Form-v1.2.md`
