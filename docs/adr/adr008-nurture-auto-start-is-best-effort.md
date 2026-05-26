---
Status: 'Superseded by [ADR010](adr010-inngest-source-of-truth-for-followup-plan.md)'
Deciders: 'Sam Marshall'
Date: '2026-04-29'
# prettier-ignore
---

# Nurture auto-start failures are swallowed on the lead write path

## Context and Problem Statement

`leads.create` and `leads.update` invoke `startOrUpdateSequence` after the canonical lead row is written and (on update) re-scored. The call sits at the end of a write path that has already committed in two systems — local Postgres (the lead row + score) and HubSpot (the contact). `startOrUpdateSequence` itself can throw for a handful of nurture-infra reasons: missing migration, partial-index drift on `nurture_active_one_per_lead_uidx`, enum mismatch between `sequenceTypeEnum` / `sequenceStatusEnum` and `SEQUENCE_TYPE_BY_STAGE`, transient Neon connection errors, or a race against a concurrent `startSequence` for the same lead.

Should `startOrUpdateSequence` failures fail the lead-create mutation, or be swallowed so capture succeeds regardless?

## Decision Drivers

- **Lead capture is load-bearing.** A consultant entering a walk-in must succeed even if the nurture infra is degraded. Capture is the product surface that pays the bills; nurture is scaffolding around it.
- **HubSpot is non-transactional with the local DB.** Per [adr003](adr003-hubspot-source-of-truth-for-contacts.md), HubSpot has already been written by the time `startOrUpdateSequence` is invoked. Any rollback to "undo" the lead creation would leave an orphan contact in HubSpot — exactly the failure mode adr003 calls out.
- **Operator cannot act on nurture-infra errors from the consultant UI.** A "nurture sequence start failed" toast in front of a consultant capturing a walk-in is information they cannot use — they cannot diagnose a partial-index drift or a Neon transient.
- **Cron tick is the recovery surface for active sequences.** `runSchedulerTick` already walks `nurture_sequences` daily; for missed auto-starts the recovery path is a future qualifying edit re-firing `startOrUpdateSequence`, not a separate retry queue.

## Considered Options

1. Swallow with `.catch(console.error)` after canonical row + HubSpot writes
2. Let `startOrUpdateSequence` throw and propagate as a tRPC error
3. Wrap lead-create in a transaction that rolls back on nurture failure
4. Queue the auto-start as a deferred job (Vercel Workflows / DLQ)
5. Partial-success response shape (e.g. `{ lead, nurtureSequenceStarted: false }` or HTTP 207)

## Decision Outcome

Chosen option: "1. Swallow with `.catch(console.error)` after canonical row + HubSpot writes", because lead capture is load-bearing and nurture auto-start is not part of the capture contract — coupling them surfaces a back-end concern to the consultant they cannot act on, while the cron tick already provides the recovery model for active sequences. The rule is site-scoped: nurture-side effects on the lead write path are best-effort, regardless of the specific function being invoked.

### Positive Consequences

- **The rule binds the lead write path specifically — siblings live elsewhere.** `nurture.startSequence` (tRPC, operator path) does *not* swallow — it surfaces `BAD_REQUEST` to the caller because the operator can act on the error. Only `leads.create` / `leads.update` swallow, because the consultant capturing a walk-in cannot. A future caller that invokes `startOrUpdateSequence` from a non-write-path site (a webhook handler, a cron, a backfill script) inherits the operator-path posture by default, not the swallow — the swallow is opt-in to the lead write path, not opt-out everywhere else.
- **Composes correctly with [adr003](adr003-hubspot-source-of-truth-for-contacts.md)'s HubSpot swallow.** ADR-003 swallows HubSpot errors *inside `scoreLead()`* so HubSpot uptime cannot fail a re-score. This ADR swallows nurture errors *outside `scoreLead()`*, after the canonical row is committed. They look the same in shape (`.catch(console.error)`) and serve the same posture (lead capture is load-bearing) but answer different questions: ADR-003 is about HubSpot's reliability, this ADR is about nurture-infra's reliability. A future PR that consolidates the two swallow sites into a shared helper has to preserve both rationales.

### Negative Consequences

- **A failed auto-start surfaces as silent absence, not as an error.** No tRPC error, no toast, no PostHog event. The lead row exists, the HubSpot contact exists, the consultant sees capture succeed — and there is no `nurture_sequences` row. The signal is the action queue going empty for that lead's cadence window, plus `[leads.create] nurture sequence start failed` in Vercel logs. If the failure rate ever rises above "rare," there is no instrumentation to detect it until the consultant reports it. Open observability gap shared with [adr004](adr004-webhook-swallow-and-always-200.md) and the rest of the swallow family.
- **Recovery is opportunistic, not active.** A lead that misses its auto-start gets a sequence row only when (a) a qualifying field changes and `leads.update` re-fires `startOrUpdateSequence`, or (b) someone manually invokes `nurture.startSequence` via tRPC (operator path, no UI). If neither happens, the lead is permanently quiet. There is no nightly reconciler, no "leads without sequences" sweep, and the cron tick only walks *active* sequences — it does not heal the missing ones. Build the reconciler if pilot evidence shows real loss; do not pre-build it.
- **The auto-start failure surface is wider than it looks.** `startOrUpdateSequence` can throw on missing migration, partial-index drift, enum mismatch between `sequenceTypeEnum` / `sequenceStatusEnum` and `SEQUENCE_TYPE_BY_STAGE`, transient Neon connection errors, and a race against a concurrent `startSequence` for the same lead. All silently degrade lead capture's nurture coverage. E2E test 1 in `e2e/features/nurture-scheduler.spec.ts` catches the migration / schema cases on every PR; the runtime ones (transient DB, race) are not gated.

## Pros and Cons of the Options

### 1. Swallow with `.catch(console.error)` after canonical row + HubSpot writes

The shipped mechanism: after `db.insert(leads)` and `scoreLead()` and the HubSpot write commit, `startOrUpdateSequence(...)` is invoked and wrapped in `.catch(console.error)` that logs `[leads.create] nurture sequence start failed for lead <id>:` (or the `.update` variant). The mutation returns the scored row regardless.

| Pros | Cons |
| ---- | ---- |
| Lead capture succeeds even when nurture infra is degraded — consultant sees a green path | Failed auto-start is invisible to the consultant and to instrumentation; no PostHog event, no toast |
| No orphan state — HubSpot consistency preserved per [adr003](adr003-hubspot-source-of-truth-for-contacts.md) | Recovery is opportunistic — only re-fires on a future qualifying edit or manual `nurture.startSequence` |
| Site-scoped rule composes with operator-path callers that still surface errors | Failure surface is wide (migration, index, enum, transient, race) and silent on all of them at runtime |
| Cron tick remains the single recovery surface for active sequences — no duplicate retry model | Shares the open observability gap with [adr004](adr004-webhook-swallow-and-always-200.md) and the rest of the swallow family |

### 2. Let `startOrUpdateSequence` throw and propagate as a tRPC error

Remove the `.catch` and let the throw surface as `INTERNAL_SERVER_ERROR` on the mutation.

- Bad, because the lead row is already written by the time `startOrUpdateSequence` is invoked (`leads.ts:142`, after `db.insert(leads)` and `scoreLead()`); HubSpot has been written too. Throwing now means the consultant sees an error toast while state is committed in two systems — worst-of-both: the capture succeeded but the UI says "failed."
- Bad, because the error surface that matters to the consultant is "did the lead capture?", not "did the nurture sequence start?"; coupling them makes the consultant's loop fragile against a back-end concern they cannot diagnose.
- Bad, because it inverts the lead-capture posture: the load-bearing path becomes hostage to nurture-infra availability.

### 3. Wrap lead-create in a transaction that rolls back on nurture failure

Open a Postgres transaction around `db.insert(leads)` → `scoreLead()` → `startOrUpdateSequence`, roll back on any throw.

| Pros | Cons |
| ---- | ---- |
| Atomicity across the three local writes if all stayed local | HubSpot was written in step 2 of `leads.create` — HubSpot is not transactional with the local DB, so the rollback only undoes the local row |
| Conceptually simple — one transaction, one boundary | A rollback leaves the contact in HubSpot with no local row — exactly the orphan state [adr003](adr003-hubspot-source-of-truth-for-contacts.md) calls out |
| | Choosing nurture-infra reliability over HubSpot consistency contradicts [adr003](adr003-hubspot-source-of-truth-for-contacts.md), where HubSpot is the canonical record |
| | Scoring has to be re-run on retry, multiplying the cost surface for a failure mode that is nurture-only |

### 4. Queue the auto-start as a deferred job (Vercel Workflows / DLQ)

Return success from the mutation immediately and push the auto-start onto a durable retry surface (Vercel Workflows, an outbox, or a DLQ).

- Bad, for pilot — building a durable retry surface for a single side effect duplicates the recovery model when the cron tick already re-scans `nurture_sequences` daily.
- Bad, because the next cron tick *is* the queue for active sequences; for missed auto-starts specifically, the recovery is a future qualifying edit re-firing `startOrUpdateSequence`.
- Neutral — Vercel Workflows is open as a spike ([#153](https://github.com/samjmarshall/rekurve/issues/153)) for nurture + dispatch retry. If pilot evidence shows real touch-loss, that's where the investment goes, not a one-off retry path for auto-start.

### 5. Partial-success response shape

Return `{ lead, nurtureSequenceStarted: false }` (or HTTP 207 multi-status) when the auto-start fails so callers can render a partial state.

- Bad, because no client consumes the discriminator — `/dashboard` and the lead-create form treat the mutation as binary success/failure.
- Bad, because surfacing "lead saved but nurture failed" in the UI gives the consultant nothing actionable — they cannot restart a nurture sequence from the consultant-facing surface.
- Bad, because the shape would propagate complexity into every consumer of the mutation contract for a signal nobody acts on.
- Neutral — the `console.error` log plus the audit query in the feature doc (`SELECT count(*) FROM nurture_sequences WHERE status='active' AND next_step_at < now()`) is the operator-facing surface; that is where this signal belongs.

## Links

- Feature doc: [Nurture scheduler](../feature/nurture-scheduler.md) — see `Choice made` and `Edge cases` for the call sites and recovery surfaces.
- Sibling ADR: [adr003 — HubSpot source of truth for contacts](adr003-hubspot-source-of-truth-for-contacts.md) — same swallow posture inside `scoreLead()` for a different reliability concern.
- Sibling ADR: [adr004 — HubSpot webhook swallow and always-200](adr004-webhook-swallow-and-always-200.md) — sibling swallow rule on a different surface.
- Sibling ADR: [adr009 — Nurture scheduler advances `nextStepAt` even on draft failure](adr009-nurture-advances-on-draft-failure.md) — the second nurture-related swallow, async cron tick rather than synchronous write path.
- Superseded by [ADR010](adr010-inngest-source-of-truth-for-followup-plan.md) — Inngest becomes the source of truth for Follow-up plan run state, with an at-least-once contract that replaces the swallow posture.
- Open spike: [#153](https://github.com/samjmarshall/rekurve/issues/153) — Vercel Workflows alternative; revisit deferred-job option if pilot evidence shows real auto-start loss.
