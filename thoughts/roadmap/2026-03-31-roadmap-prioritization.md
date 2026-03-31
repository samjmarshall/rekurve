# Roadmap Prioritization — 2026-03-31

## Context

- **Current focus**: M0 Pilot Validation — building MVP product for Creation Homes pilot
- **Epic 1 progress**: Infrastructure done (scaffold, DB, auth, login). 9 open issues remain (tRPC, dashboard shell, HubSpot, lead forms, pipeline board, AI qualification)
- **Epics 2-4**: Lead Management, HITL Messages, Lot Matcher — all ahead
- **Capacity constraint**: Solo founder/developer

## Decision: Deprioritize Hero A/B Experiment (#108)

**Issue**: #108 — Implement PostHog experiment to A/B test 6 hero designs

**Action**: Move to Post-PMF: Scaling milestone

**Rationale**:
- The site has no public traffic sources (not listed on Google Search Console, social media, etc.)
- A 7-way A/B test with zero visitors produces zero data
- Traffic won't come until after the pilot product is live and showing results from Creation Homes
- The experiment wrapper adds code complexity (dynamic imports, feature flag resolution, 7 component variants) that must be maintained while building unrelated product features
- The 6 design branches will still exist when traffic justifies the experiment

**Instead**: When ready, pick one hero design that fits the Creation Homes / QLD new home sales consultant positioning and ship it directly — no experiment infrastructure needed yet.

## Pre-PMF Principle Applied

> "Pre-PMF, optimize for learning from customers, not from traffic. The pilot with Creation Homes will teach you more about positioning than any A/B test on an unlisted site."

Scaling-stage activities (traffic optimization, multivariate testing, conversion rate optimization) are premature without a validated product and active distribution.

## Implementation Checklist

- [ ] Move #108 to "Post-PMF: Scaling" milestone
- [ ] Clear priority, iteration, start/end dates on #108
