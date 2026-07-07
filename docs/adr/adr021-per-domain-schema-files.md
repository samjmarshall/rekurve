---
Status: 'Accepted'
Deciders: 'Sam Marshall'
Date: '2026-07-07'
# prettier-ignore
---

# Co-locate Drizzle table definitions per-domain with a shared bucket and a merge barrel

## Context and Problem Statement

[adr020](adr020-domain-oriented-3-tier-server-architecture.md) organizes `src/server/` as vertical domain modules; the Drizzle schema is the remaining central exception. But unlike the sibling project's starting point (one 221-line central `schema.ts`), rekurve is already **per-entity**: nine entity files under `src/server/db/schema/` (`auth.ts`, `leads.ts`, `message-queue.ts`, `conversations.ts`, `lots.ts`, `lot-matches.ts`, `ms-graph-tokens.ts`, `outbox.ts`, `enums.ts`) merged by a barrel `index.ts`, with **all FKs already lazy thunks** (`references(() => …)`) and no `relations()` graph. `drizzle.config.ts` points at the barrel; the 10-migration history is journal-keyed (reorg-safe); CI `post-deploy.yml` runs `db:check` via the config path (no hardcoded schema paths).

So this is a **move + merge** decision, not a split decision — the technically risky halves (multi-file authoring, cross-file FK resolution) are already done and proven. Cross-file FKs that must keep resolving: `ms_graph_tokens.userId → user`, `lot_matches.{lotId,leadId}`, `conversations.{leadId,messageQueueId}`, `message_queue.leadId`. The one enum with two consumers (`channelEnum`, used by `message_queue` and `conversations`) needs exactly one `pgEnum` definition wherever those tables land.

Do table definitions move into their domain folders (`leads/leads.schema.ts` beside `leads.repository.ts`), or stay centrally grouped?

## Decision Drivers

- **Verticality consistency with adr020.** The central schema folder is the last standing exception to "opening a domain folder shows everything about the domain."
- **Migration-tooling integrity.** `make db_generate`, the single `drizzle/` history + `__drizzle_migrations` journal, the typesafe seeder, and CI `db:check` must all keep working with zero migration diff — the layout is an authoring concern, not a database concern.
- **FK/import safety across files.** Already proven by the lazy thunks; the move must keep the schema-level import graph one-directional.
- **Glob hygiene.** `src/server/ai/schema.ts` and `src/server/scoring/schema.ts` are **Zod** files that a careless `*.schema.ts` glob must never sweep into drizzle-kit.

## Considered Options

1. One `*.schema.ts` file per domain, co-located in the domain module + auth-only shared bucket + drizzle-kit glob + spread-merge barrel
2. Status quo — keep the central `db/schema/` per-entity folder + barrel

## Decision Outcome

Chosen option: "1. One `*.schema.ts` file per domain, co-located in the domain module + auth-only shared bucket + drizzle-kit glob + spread-merge barrel", because rekurve's head start (per-entity files, lazy-thunk FKs, journal-keyed history) makes co-location a cheap move rather than a risky split, and it removes the last central exception to adr020's one-folder-per-domain rule.

Accepted rather than Proposed: same committed-direction posture as adr020 — the glob + barrel wiring lands in the epic's enabling-infra PR (#325) before any domain schema file moves, so the decision-outruns-the-code window is one PR.

No architecture diagram for this ADR: the decision is a file-layout delta with no runtime topology — D2 is reserved for architecture topology (and there is no flow to chart either), and the sibling's equivalent ADR shipped diagram-free for the same reason. The layout tree below is the whole picture.

```text
src/server/
├── leads/
│   └── leads.schema.ts       # leads table + lead enums
├── messaging/
│   └── messaging.schema.ts   # message_queue + conversations + channelEnum + message/conversation enums
├── lots/
│   └── lots.schema.ts        # lots + lot_matches + their enums
├── ms-graph/
│   └── ms-graph.schema.ts    # ms_graph_tokens (thin adapter owns its table)
├── outbox/
│   └── outbox.schema.ts      # outbox table (module-vertical; delivery contract is adr019's)
└── db/
    ├── shared.schema.ts      # auth tables ONLY: user · session · account · verification
    └── index.ts              # spread-merge barrel → drizzle(sql, { schema })
```

Specifics that bind:

1. **One schema file per domain, not per entity**, moved beside the domain's repository: `leads/leads.schema.ts` (the `leads` table + the lead enums), `messaging/messaging.schema.ts` (`message_queue` + `conversations` + `channelEnum` and the other message/conversation enums — co-locating both of `channelEnum`'s consumers in one file dissolves the shared-enum question), `lots/lots.schema.ts` (`lots` + `lot_matches` + their enums). The central `enums.ts` dissolves entirely: every enum it holds is domain-owned and moves with its owner.
2. **Thin adapters may own a schema file.** `ms-graph/ms-graph.schema.ts` holds `ms_graph_tokens` — recorded explicitly so adr020's adapter collapse rule is not misread as "adapter modules carry no schema."
3. **The `outbox` table lands module-vertical: `src/server/outbox/outbox.schema.ts`.** Recorded deviation from the sibling prior art, which parked outbox in its shared bucket. Rationale: `~/lib/auth.ts` imports `* as authSchema` for better-auth's `drizzleAdapter` — an auth-only shared bucket keeps that import exactly the auth set — and outbox is a real (collapsed worker→repo) module under adr020, so its table belongs beside it. Nothing about the table's contract changes; that contract is [adr019](adr019-system-wide-transactional-outbox-posture.md)'s.
4. **Shared bucket `db/shared.schema.ts` holds the auth tables only** (`user`, `session`, `account`, `verification`) — "per-domain plus one honest auth-only bucket," not a junk drawer.
5. **Glob + merge barrel.** `drizzle.config.ts`'s schema path becomes the glob `./src/server/**/*.schema.ts`; `db/index.ts` spread-merges the per-domain modules into the `schema` object passed to `drizzle(sql, { schema })` and remains the single import surface during the migration (23 files import the barrel today; the deep importers — six seed fixtures, `~/lib/auth.ts`, the outbox module and workers, one dev route, and a type-only hubspot import — are repointed as their domain moves).
6. **Sequencing hazard that binds:** the glob + merge barrel must be wired (epic #323's enabling-infra PR, #325) **before** the first per-domain schema file moves, or `make db_generate` and CI `db:check` generate from a partial graph.
7. **Rename first — `*.schema.ts` is reserved for Drizzle table definitions.** `src/server/ai/schema.ts` → `ai/draft-schemas.ts` and `src/server/scoring/schema.ts` → `scoring/score-schemas.ts`. Neither matches `*.schema.ts` today, but the near-miss naming is a standing trap once the glob is live — recorded as a binding rename. (Not `prompts.ts`: `src/server/ai/prompts.ts` already exists.)
8. **Cross-file FKs keep resolving unchanged** via the existing lazy `references(() => …)` thunks; after the move the schema-level import graph is `messaging → leads`, `lots → leads`, `ms-graph → shared` — one-directional and acyclic.
9. **Migration history untouched.** One `drizzle/` directory, one journal-keyed `__drizzle_migrations` history, regardless of authoring layout. The `db.query.*` client surface is also unchanged: its keys come from export variable names, which the moves do not alter.

### Positive Consequences

- **Opening a domain folder shows everything, including table shapes** — adr020's thesis with no central exception left.
- **Cheap because of the head start.** These are file moves and merges, not splits: the FKs are already lazy thunks, the migration history is journal-keyed, and CI reads the schema through the config path.
- **The shared-enum problem dissolves.** `channelEnum`'s only two consumers co-locate in `messaging.schema.ts`; no shared-enums home is needed, and `enums.ts` retires without residue.
- **Mirror of the proven sibling wiring.** The `drizzle.config.ts` glob + spread-merge barrel is running in production in the sibling project.

### Negative Consequences

- **Glob-before-move sequencing hazard** — one-time, gated by the enabling-infra PR (#325).
- **Two standing conventions to enforce in review:** new domain-less tables land in `db/shared.schema.ts`, never a stray file; and `*.schema.ts` stays Drizzle-only — Zod schema modules must take other names (per the binding renames above).
- **The physical schema is no longer one folder.** Mitigated by the barrel merge — the logical schema surface (`db/index.ts`, `drizzle.config.ts`) is still singular.
- **Barrel-import churn is spread across the domain PRs** rather than paid once — the compat barrel keeps the 23 barrel importers stable, but each domain PR repoints its own deep importers.

## Pros and Cons of the Options

### 1. One `*.schema.ts` file per domain + auth-only shared bucket + glob + spread-merge barrel

| Pros                                                                                                                       | Cons                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Verticality complete — repository and table definitions in the same folder, adr020's rule with no exception               | Glob-before-move sequencing hazard (one-time, gated by the enabling-infra PR)                           |
| Head start makes it cheap — moves and merges, not splits; lazy-thunk FKs and journal-keyed history already proven          | Two conventions to hold in review: shared bucket stays auth-only; `*.schema.ts` stays Drizzle-only      |
| Single migration history and `db.query.*` surface unaffected                                                               | Whole physical schema no longer browsable as one folder (barrel merge mitigates)                        |
| Shared-enum question dissolves — both `channelEnum` consumers co-locate in `messaging.schema.ts`                           | Import churn spread across the domain PRs                                                               |
| Proven sibling wiring (glob + spread-merge) running in production there                                                    |                                                                                                         |

### 2. Status quo — central `db/schema/` per-entity folder + barrel

- Good, because it is zero change, and the per-entity files are already readable and FK-safe.
- Bad, because it is a permanent exception to adr020's one-folder-per-domain rule — the schema would be the only concern a domain folder does not show.
- Bad, because the repository and its table definitions stay in different trees, which is exactly the navigability driver unmet.

## Links

- Refines: [adr020](adr020-domain-oriented-3-tier-server-architecture.md) — the schema-location sub-decision within the domain-module architecture
- Relates to: [adr019](adr019-system-wide-transactional-outbox-posture.md) — the `outbox` table co-locates with its module (`outbox/outbox.schema.ts`); its delivery contract is adr019's, unchanged by any file move
- Prior art (sibling ai-insurance-claims project, Accepted there — named for provenance, deliberately not cross-repo linked): its adr011 made the same decision on a harder starting point (one central schema file); rekurve starts from per-entity files with lazy-thunk FKs, so only the co-location half remained to decide. Deviation recorded above: the `outbox` table lands module-vertical rather than in the shared bucket.
