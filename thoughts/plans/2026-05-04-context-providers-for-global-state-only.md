# Context Providers for Global State Only — Implementation Plan

## Context

The architecture review (branch `refactor/architecture-review`) audited React Context Provider usage across `src/` and produced a codified rule: Context is reserved for genuinely global state (auth, theme, feature flags, transport clients, routing); page- and modal-local state lives in the owning component with explicit prop drilling. The codebase already conforms — zero `createContext`/`useContext` calls in `src/` on 2026-05-04 — so this work is purely documentation: capture the rule before drift sets in. See `thoughts/designs/2026-05-04-context-providers-for-global-state-only.md`.

## Current State

- No React `createContext` or `useContext` calls anywhere in `src/`. (The one `createContext` match in `src/app/api/trpc/[trpc]/route.ts:8` is the tRPC server-context factory, unrelated to React Context.)
- Four legitimate global providers in use, all justified by the rule: `src/trpc/react.tsx` (tRPC + React Query), `src/providers/ThemeProvider.tsx` (theme), `src/providers/AnalyticsProvider.tsx` (PostHog mounter, not a state container), `src/components/ui/toast.tsx` (third-party UI primitive).
- Latest ADR is `docs/adr/adr011-followup-drafts-retry-then-pause.md`; next available number is **012**.
- `CLAUDE.md` has no React/Frontend section today. Existing sections: Build & Test Commands, Database Migrations, Vercel CLI, Testing, E2E Testing, GitHub Actions, Workflows.
- Recent ADRs (008–011) use a narrative style — short title, `**Status:**` line, then `## Considered options`, `## Consequences`, `## Links`. Not the formal template in `docs/adr/adr000-template-simple.md`. The new ADR should match the recent narrative style for consistency.

## Desired End State

Two new files exist in the repo, both reviewed and merged in the same PR:

1. `docs/adr/adr012-context-providers-for-global-state-only.md` — captures the rule, rationale, the genuinely-global-vs-not categorisation, the rejection of the compound-component carve-out as general policy, and the lint-rule decision (deferred).
2. A new `## Frontend Architecture` section in `CLAUDE.md` containing the one-paragraph Context Provider rule with a pointer to ADR-012.

No code is changed. No tests are added. Future PRs that introduce a `createContext` outside the allowlist are caught by reviewers (or by a follow-up linter, if drift appears).

## Out of Scope

- Any refactor of `src/`. The codebase already conforms.
- ESLint enforcement. Considered and rejected in the design as premature; revisit only if drift appears.
- The compound-component carve-out (e.g. internal `<Tabs>` plumbing). Rejected as general policy; if a real case appears, write a follow-up ADR amending ADR-012 rather than adopting the carve-out implicitly.
- Re-justifying the four current providers — all already justified in the design's table.

## Approach

Single-phase, documentation-only PR. Add the ADR with the categorisation table and rationale lifted from the design doc; add a short bullet to `CLAUDE.md` under a new `## Frontend Architecture` section that points to the ADR. Ship both in one PR so the rule and its in-tree pointer land together — the `CLAUDE.md` bullet is the load-bearing surface for everyday Claude/Cursor sessions; the ADR is the deep-link for the rationale.

## Phase 1: ADR + CLAUDE.md note

### Changes

- `docs/adr/adr012-context-providers-for-global-state-only.md` — new file. Match the narrative style of `docs/adr/adr011-followup-drafts-retry-then-pause.md:1` (title, `**Status:** proposed (2026-05-04)`, opening rule paragraph, `## Considered options`, `## Consequences`, `## Links`). Sections to include:
  - **Opening paragraph** — the rule itself, drawn from the design's "The principle" section.
  - **What counts as genuinely global** — bulleted list (auth, theme, feature flags, transport clients, routing), drawn from design lines 16–20.
  - **What does NOT count** — bulleted list (form state, filter/selection, open/close, page-or-modal-bounded lifetime), drawn from design lines 22–26.
  - **Current allowlist table** — the four-row table (`TRPCReactProvider`, `ThemeProvider`, `AnalyticsProvider`, toast) from design lines 41–48 with file paths and justifications.
  - **The pattern when temptation arises** — inline `useState` in the owning component, no extracted custom hook, explicit named props (not state blob), `useState` over `useReducer` unless real transitions exist. Drawn from design lines 56–83.
  - **Considered options** — (a) compound-component carve-out as general policy: rejected, with reason from design line 32; (b) ESLint rule banning `createContext` outside an allowlist: rejected as premature, with reason from design line 114.
  - **Consequences** — codebase remains conformant by review, not by lint; future compound-component need triggers a follow-up ADR rather than a silent exception; Server Component boundaries stay narrow because Providers stay narrow (Next.js note from design line 95).
  - **Links** — `thoughts/designs/2026-05-04-context-providers-for-global-state-only.md`; React docs `https://react.dev/learn/passing-data-deeply-with-context`; Next.js docs `https://nextjs.org/docs/app/getting-started/server-and-client-components`.

- `CLAUDE.md` — add a new top-level section after the existing `## Workflows` section (so it appears at the end, alongside other concept-based sections). The section:

  ```markdown
  ---

  ## Frontend Architecture

  **Context Providers**: reserved for genuinely global state (auth, theme, feature flags, transport clients, routing). For page- or modal-local state, inline `useState` in the owning component and pass values down as explicit named props — never extract into a custom hook (callable elsewhere) or a Context Provider (widens the read/write surface to the whole subtree). See [ADR-012](docs/adr/adr012-context-providers-for-global-state-only.md).
  ```

  Placement rationale: a new section rather than a sub-bullet under `## Workflows` because future frontend rules (component design, data-fetching patterns, the eventual compound-component carve-out if it arrives) will want the same home.

### Success

**Automated**

- [x] `make check` passes (no code change, but lint may parse `CLAUDE.md` as part of the workspace; sanity check).
- [x] `make build` passes (sanity check that nothing in the build pipeline regressed).

**Manual**

- [x] `docs/adr/adr012-context-providers-for-global-state-only.md` exists, follows the narrative style of ADR-011, and includes the four-row allowlist table.
- [x] `CLAUDE.md` has a `## Frontend Architecture` section whose Context Provider bullet links to ADR-012 with a working relative path.
- [x] Re-run the design's claim: `rg -n 'createContext|useContext' src/` returns zero React-Context matches (only the unrelated tRPC server `createContext` in `src/app/api/trpc/[trpc]/route.ts:8`).
- [ ] PR description references the design doc at `thoughts/designs/2026-05-04-context-providers-for-global-state-only.md` and lists the two artefacts.

## References

- Design: `thoughts/designs/2026-05-04-context-providers-for-global-state-only.md`
- Style precedent: `docs/adr/adr011-followup-drafts-retry-then-pause.md:1`
- ADR template (formal version, not used by recent ADRs): `docs/adr/adr000-template-simple.md`
- Existing CLAUDE.md to extend: `CLAUDE.md:88` (end of `## Workflows` section)
- Current Provider allowlist: `src/trpc/react.tsx`, `src/providers/ThemeProvider.tsx`, `src/providers/AnalyticsProvider.tsx`, `src/components/ui/toast.tsx`
- React docs cited by the design: https://react.dev/learn/passing-data-deeply-with-context
- Next.js docs cited by the design: https://nextjs.org/docs/app/getting-started/server-and-client-components
