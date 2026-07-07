# ADR architecture diagrams — how-to & house style

Icon-rich **solution-architecture** diagrams for our in-depth ADRs. Authored as `.d2`
text (the diffable source of truth), compiled to a committed `.svg` (what GitHub
renders). Flow-shaped diagrams — sequence, state, ER, request paths — stay inline in
the ADR as fenced ` ```mermaid ` blocks and do **not** live here.

The split is deliberate: **D2 for architecture** (topology, vendor boundaries, stores),
**Mermaid for flow** (ordering, state transitions, request lifecycles). This file is the
operating manual for the D2 half.

## What lives in this folder

| Artifact | Role | Committed? |
| --- | --- | --- |
| `adrNNN-optionN-<slug>.d2` | Source of truth — text, line-diffs cleanly, reviewed in PRs | Yes |
| `adrNNN-optionN-<slug>.svg` | Rendered output — what GitHub actually displays, reviewed as an image | Yes |
| `icons/` | Vendored local icon set (`vercel.svg`, `neon.svg`, `inngest.svg`, `hubspot.svg`, `outlook.svg`, …) — the shared visual vocabulary | Yes |

Every `.d2` has a sibling `.svg` of the same basename. **Commit both**, always in the
same change — a `.d2` without its freshly-rendered `.svg` fails CI (see
`make diagrams-check`).

### Naming

```
adrNNN-optionN-<slug>.d2      # source
adrNNN-optionN-<slug>.svg     # render (same basename)
```

- `NNN` — zero-padded ADR number (`014`, `017`).
- `optionN` — the option number under "Pros and Cons of the Options"; the chosen
  option's diagram doubles as the Decision Outcome visual.
- `<slug>` — a short kebab-case handle for the option (`outbox`, `http-batch`,
  `always-200`).

Reference a diagram from the ADR by relative path (the only form GitHub renders for a
committed SVG), placed under that option's `### N.` heading, above its pros/cons table:

```markdown
![Option 1 — transactional outbox + Inngest fan-out](diagrams/adr014-option1-outbox.svg)
```

Not every option earns a canvas. Skip degenerate options ("status quo", "direct send")
where a one-line prose delta says everything — forcing a canvas there is diagram-theatre.

## Installing d2 — pin v0.7.1

`d2` is a Go binary used only as a dev/CI tool — never a runtime dependency.

```sh
brew install d2
```

**Pin to v0.7.1.** CI installs this exact version, and layout/render output drifts
between d2 releases. If your local version differs, `make diagrams-check` can flag SVGs
as stale that CI considers fresh (and vice versa), so the diff stays reproducible only
when local and CI match. Check and, if needed, align your version:

```sh
d2 --version                 # expect: 0.7.1
brew install d2@0.7.1        # or pin via your version manager if a newer d2 is already linked
```

## Commands

Two Makefile targets:

- **`make diagrams`** — renders every `.d2` under this folder to a sibling `.svg` with
  the ELK layout engine. Run it after editing **any** `.d2`, then commit **both** the
  `.d2` and its regenerated `.svg`. This is a codegen target (no network fetch), so it's
  fine to run inline.
- **`make diagrams-check`** — the CI freshness gate. Re-renders to a temp location and
  diffs against the committed SVGs; a **stale or missing** SVG fails the build. This is
  the verification surface — it runs in CI so "the diagram on GitHub matches its source"
  is enforced, not trusted to memory.

Typical loop: edit `.d2` → `make diagrams` → eyeball the `.svg` → commit both.

## The local-icon rule

**Reference icons by relative path only:**

```d2
vercel: Vercel { icon: ./icons/vercel.svg }
neon: Neon Postgres { icon: ./icons/neon.svg; shape: cylinder }
```

**Never hot-link `icons.terrastruct.com` (or any external) URLs.** GitHub's SVG
sanitizer / CSP blocks external `<image href="https://…">` references inside a committed
SVG, so a hot-linked icon renders as a broken box on GitHub even when it looks correct
locally.

D2 embeds **local-file** icons as base64 at render time, so the committed `.svg` is
fully self-contained and renders anywhere, GitHub included. Two bonus wins: `make
diagrams` does no network fetch (deterministic CI — `diagrams-check` can't go flaky when
an upstream icon changes), and every ADR draws the same Vercel/Neon/Inngest glyph.

To add a vendor to the vocabulary, drop its SVG into `icons/` and reference it by
relative path — don't reach for a URL.

## Vendored icon vocabulary

The shared `icons/` set. Prefer one of these glyphs over a bare labelled box for any
recognised service, so the same component looks the same across every ADR.

| Icon | Represents |
| --- | --- |
| `vercel.svg` | Vercel — hosting / deployment target |
| `neon.svg` | Neon — serverless Postgres |
| `postgres.svg` | Postgres — the local/canonical relational store |
| `nextjs.svg` | Next.js — the app framework |
| `trpc.svg` | tRPC — typed API layer |
| `drizzle.svg` | Drizzle — ORM / schema + migrations |
| `inngest.svg` | Inngest — durable workflow / event delivery |
| `hubspot.svg` | HubSpot — CRM source of truth for contacts |
| `outlook.svg` | Outlook / Microsoft 365 — outbound mail |
| `anthropic.svg` | Anthropic / Claude — LLM provider |
| `twilio.svg` | Twilio — SMS |
| `posthog.svg` | PostHog — product analytics |

## House style

Keep it light and consistent — this is polished vendor topology, not a napkin sketch.

- **Theme:** a single neutral **light** theme, `--theme 0`. Not dark, not
  per-color-scheme — the self-contained SVG must stay legible against GitHub's dark mode.
- **No sketch mode.** Clean geometry, not hand-drawn.
- **Direction:** `direction: right` (left-to-right) is the architecture default,
  overridable per diagram when a top-down flow reads better.
- **Animated edges = live data flow.** Add `style.animated: true` (dot-notation, same shape
  as `style.stroke-dash`) to a connection to make it flow, e.g.
  `inngest.workers -> sinks.hubspot: 5 · fan-out { style.animated: true }`. Reserve it for the
  primary ingress/egress data path; keep control-plane and backstop edges static so the motion
  reads as signal, not decoration. Valid on **connections only**, never shapes. It compiles to
  CSS `@keyframes`, which animates on GitHub through the `![](…svg)` image embed and stays
  byte-deterministic — so `make diagrams-check` still passes.
- **Cylinders = data stores.** Give any persistent store (`shape: cylinder`) — Postgres,
  Neon, an outbox table, a queue's durable log.
- **Containers = vendor / trust boundaries.** Nest services inside a container to show a
  deployment target or trust zone (e.g. everything running on Vercel, everything inside
  the Neon project).
- **Icons are the shared vocabulary.** Prefer a vendored `icons/` glyph over a bare
  labelled box for any recognised service, so the same component looks the same across
  every ADR.

## Worked reference

The canonical exemplar — copy its structure when authoring a new diagram:

- **`adr014-option1-outbox`** — [`.d2`](adr014-option1-outbox.d2) /
  [`.svg`](adr014-option1-outbox.svg) — the transactional-outbox + Inngest fan-out
  topology for durable delivery ([ADR-014](../adr014-outbox-pattern-for-inngest-delivery.md)):
  cylinders for the canonical store + outbox table, an Inngest container fanning out to
  the downstream vendors (HubSpot, Outlook, Twilio).
