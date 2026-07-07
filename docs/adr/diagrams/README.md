# ADR architecture diagrams — how-to & house style

Icon-rich **solution-architecture** diagrams. Two classes live here:

- **Per-ADR** (`adrNNN-optionN-<slug>`) — the topology for one option in one in-depth ADR.
- **Aggregate** (`architecture-<slug>`) — a high-level roll-up of the whole ADR set, not
  tied to any single ADR (e.g. the solution-architecture diagram embedded in the repo
  [`README`](../../README.md)). Same house style, same tooling.

Both are authored as `.d2` text (the diffable source of truth), compiled to a committed
`.svg` (what GitHub renders). Flow-shaped diagrams — sequence, state, ER, request paths —
stay inline as fenced ` ```mermaid ` blocks and do **not** live here.

The split is deliberate: **D2 for architecture** (topology, vendor boundaries, stores),
**Mermaid for flow** (ordering, state transitions, request lifecycles). This file is the
operating manual for the D2 half.

## What lives in this folder

| Artifact | Role | Committed? |
| --- | --- | --- |
| `adrNNN-optionN-<slug>.d2` / `architecture-<slug>.d2` | Source of truth — text, line-diffs cleanly, reviewed in PRs | Yes |
| `adrNNN-optionN-<slug>.svg` (+ `-dark.svg`) / `architecture-<slug>.svg` (+ `-dark.svg`) | Rendered output — the light + dark pair GitHub displays via `<picture>`, reviewed as images | Yes |
| `icons/` | Vendored local icon set (`vercel.svg`, `neon.svg`, `inngest.svg`, `hubspot.svg`, `outlook.svg`, …) — the shared visual vocabulary | Yes |

Every `.d2` renders to **two** siblings of the same basename — `<basename>.svg` (light) and
`<basename>-dark.svg` (dark). **Commit all three**, always in the same change — a `.d2`
without both freshly-rendered SVGs fails CI (see `make diagrams-check`).

### Naming

```
adrNNN-optionN-<slug>.d2        # per-ADR source
adrNNN-optionN-<slug>.svg       # light render (same basename)
adrNNN-optionN-<slug>-dark.svg  # dark render (--theme 200)

architecture-<slug>.d2          # aggregate source (not tied to one ADR)
architecture-<slug>.svg         # light render (same basename)
architecture-<slug>-dark.svg    # dark render (--theme 200)
```

- `NNN` — zero-padded ADR number (`014`, `017`).
- `optionN` — the option number under "Pros and Cons of the Options"; the chosen
  option's diagram doubles as the Decision Outcome visual.
- `<slug>` — a short kebab-case handle for the option (`outbox`, `http-batch`,
  `always-200`) or, for aggregates, for the view (`solution`).

Reference a diagram from the ADR with a `<picture>` block (relative paths — the only form
GitHub renders for a committed SVG), placed under that option's `### N.` heading, above its
pros/cons table. The `<source>` serves the dark render in dark mode; the `<img>` is the
light default and the universal fallback:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="diagrams/adr014-option1-outbox-dark.svg">
  <img alt="Option 1 — transactional outbox + Inngest fan-out" src="diagrams/adr014-option1-outbox.svg">
</picture>
```

A single `--dark-theme` adaptive SVG **won't** work here: GitHub sandboxes embedded SVGs and
strips the internal `prefers-color-scheme` media query, so it always renders light. Two files
selected by an outer `<picture>` is the pattern that actually adapts on GitHub.

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

- **`make diagrams`** — renders every `.d2` under this folder to its light `.svg`
  (`--theme 0`) and dark `-dark.svg` (`--theme 200`) siblings with the ELK layout engine.
  Run it after editing **any** `.d2`, then commit the `.d2` and **both** regenerated SVGs.
  This is a codegen target (no network fetch), so it's fine to run inline.
- **`make diagrams-check`** — the CI freshness gate. Re-renders to a temp location and
  diffs against the committed SVGs; a **stale or missing** SVG fails the build. This is
  the verification surface — it runs in CI so "the diagram on GitHub matches its source"
  is enforced, not trusted to memory.

Typical loop: edit `.d2` → `make diagrams` → eyeball **both** SVGs (light + dark) → commit all three.

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

**Mode-specific icons.** Because icons are baked in as base64, they **don't** recolour with
the D2 theme, so a mark tuned for the light canvas can vanish (or invert) on the dark one.
`currentColor`/`currentFill` tricks don't help — a base64-embedded icon has no host `color`
to inherit, so it just falls back to black. Two ways to make one legible in both modes:

- **One brand-colour file** — if a single saturated fill reads on both canvases, use it and
  ship one file. `drizzle` does this with its brand lime `#c5f74f`.
- **A `-dark` variant + swap** — commit `icons/<name>-dark.svg` and let the `diagrams` recipe
  `sed`-swap the path in the **dark** render only; the light render keeps the original.
  `inngest` and `vercel` do this with a white (`#FFFFFF`) `-dark` glyph. Add a `-dark` file +
  a swap clause in the `Makefile` when a new mode-specific icon lands.

Colourful icons (HubSpot, Anthropic, PostHog, Twilio, Neon, tRPC) and self-contained marks
(Next.js's badge) read in both modes and need neither treatment.

## Vendored icon vocabulary

The shared `icons/` set. Prefer one of these glyphs over a bare labelled box for any
recognised service, so the same component looks the same across every ADR.

| Icon | Represents |
| --- | --- |
| `vercel.svg` (+ `-dark`) | Vercel — hosting / deployment target |
| `neon.svg` | Neon — serverless Postgres |
| `postgres.svg` | Postgres — the local/canonical relational store |
| `nextjs.svg` | Next.js — the app framework |
| `trpc.svg` | tRPC — typed API layer |
| `drizzle.svg` | Drizzle — ORM / schema + migrations (brand lime, one file) |
| `inngest.svg` (+ `-dark`) | Inngest — durable workflow / event delivery |
| `hubspot.svg` | HubSpot — CRM source of truth for contacts |
| `outlook.svg` | Outlook / Microsoft 365 — outbound mail |
| `anthropic.svg` | Anthropic / Claude — LLM provider |
| `twilio.svg` | Twilio — SMS |
| `posthog.svg` | PostHog — product analytics |
| `pagerduty.svg` | PagerDuty — on-call paging / incident dedup |

## House style

Keep it light and consistent — this is polished vendor topology, not a napkin sketch.

- **Theme:** a light + dark pair — `--theme 0` (Neutral Default) → `<basename>.svg` and
  `--theme 200` (Dark Mauve) → `<basename>-dark.svg` — selected per reader via the ADR's
  `<picture>` block. `make diagrams` renders both from one `.d2`; never hand-edit either
  SVG. Vendored brand icons are baked in as base64 and **don't** recolour with the theme, so
  a mode-specific glyph needs either one brand-colour file that reads on both canvases or a
  white `-dark` variant swapped in for the dark render (see
  [the local-icon rule](#the-local-icon-rule)); eyeball a new icon on the dark canvas and
  add a variant if it disappears.
- **No sketch mode.** Clean geometry, not hand-drawn.
- **Direction:** `direction: right` (left-to-right) is the architecture default,
  overridable per diagram when a top-down flow reads better.
- **Animated green edges = live data flow.** A live-data-flow connection gets **both**
  `animated: true` and `stroke: green`, authored as a `style { }` block, e.g.
  ```d2
  inngest.workers -> sinks.hubspot: 5 · fan-out {
    style: {
      animated: true
      stroke: green
    }
  }
  ```
  Green + motion is the single treatment for a live path — don't animate without the green, and
  don't paint a static edge green. Reserve it for the primary ingress/egress data path; keep
  control-plane and backstop edges static (and uncoloured) so the flow reads as signal, not
  decoration. Valid on **connections only**, never shapes. It compiles to CSS `@keyframes`,
  which animates on GitHub through the `<picture>`/`<img>` embed and stays byte-deterministic — so
  `make diagrams-check` still passes.
- **Cylinders = data stores.** Give any persistent store (`shape: cylinder`) — Postgres,
  Neon, an outbox table, a queue's durable log.
- **Containers = vendor / trust boundaries.** Nest services inside a container to show a
  deployment target or trust zone (e.g. everything running on Vercel, everything inside
  the Neon project).
- **Faded (`style.opacity`) = planned / not-live.** A built-but-inactive or proposed
  component (e.g. an env-gated worker, a not-yet-provisioned vendor) renders at reduced
  opacity with a `· planned` / `· proposed` label suffix; live components stay
  full-opacity. Lets one aggregate diagram show current state and roadmap without two files.
- **Icons are the shared vocabulary.** Prefer a vendored `icons/` glyph over a bare
  labelled box for any recognised service, so the same component looks the same across
  every ADR.

## Worked reference

The canonical exemplar — copy its structure when authoring a new diagram:

- **`adr014-option1-outbox`** — [`.d2`](adr014-option1-outbox.d2) /
  [`.svg`](adr014-option1-outbox.svg) / [`-dark.svg`](adr014-option1-outbox-dark.svg) — the transactional-outbox + Inngest fan-out
  topology for durable delivery ([ADR-014](../adr014-outbox-pattern-for-inngest-delivery.md)):
  cylinders for the canonical store + outbox table, an Inngest container fanning out to
  the downstream vendors (HubSpot, Outlook, Twilio).
