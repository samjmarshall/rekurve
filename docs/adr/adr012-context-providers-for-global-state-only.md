# Context Providers are reserved for genuinely global state

**Status:** proposed (2026-05-04)

React Context Providers widen the read/write surface of a piece of state to their entire subtree. State that is actually local to one page or modal becomes accessible — and mutable — by anything underneath that subtree, coupling the owning component to consumers it cannot see. The rule: use Context only for state that is genuinely global (cross-route, cross-page, or cross-cutting); for page- or modal-local state, inline `useState` in the owning component and pass values down as explicit named props.

### What counts as "genuinely global"

- Auth session (cross-route identity)
- Theme / appearance
- Feature flags
- API / transport clients (tRPC, React Query `QueryClient`)
- Routing (provided by the framework)

### What does NOT count, regardless of how convenient Context feels

- Form state (multi-step or otherwise)
- Filter / selection / "what's selected on this screen" state
- Open/close state for a single component
- Anything whose lifetime is bounded by a single page or modal

### Current allowlist

| File | Concern | Justification |
|---|---|---|
| `src/trpc/react.tsx` (`TRPCReactProvider`) | tRPC client + React Query `QueryClient` | API/transport client. Mounted at root. |
| `src/providers/ThemeProvider.tsx` | Theme (wraps `next-themes`) | Theme/appearance. Mounted at root. |
| `src/providers/AnalyticsProvider.tsx` | PostHog session init (side-effect mounter, not a state container) | Cross-cutting telemetry. No `createContext` — fires `useEffect` once. Acceptable. |
| `src/components/ui/toast.tsx` | Toast UI primitive (third-party) | UI primitive providing render slot. Acceptable. |

### The pattern when the temptation arises

Inline `useState` directly in the owning component — no extracted custom hook (a custom hook is callable by any component anywhere, which invites someone to instantiate "the modal's state" outside the modal). Children receive exact named props (`value: string; onChange: (s: string) => void`), never a fat `state` object. Default to `useState`; escalate to `useReducer` only when state has real transitions (named actions, "reset all", inter-field invariants) — and inline the reducer too. When in doubt, follow the React docs ordering: pass props → extract components and pass `children` → only then consider Context.

## Considered options

- **Compound-component carve-out as general policy** (Context as a private implementation detail of a single composable component, e.g. internal `<Tabs>` plumbing): rejected. "Private implementation detail" tends to be invoked to justify the next page-local Context. If a genuine compound-component case appears, write a follow-up ADR to amend this rule rather than relying on case-by-case judgement.

- **ESLint rule banning `createContext` outside an allowlist**: rejected as premature. Custom rules drift, the allowlist needs maintenance, and there is no offending code in the codebase today. Escalate to a lint rule only if drift appears.

## Consequences

- **Conformance is enforced by code review, not by lint.** Future PRs that introduce a `createContext` outside the allowlist are caught in review. If drift becomes frequent, revisit the ESLint option.

- **A genuine compound-component need triggers a follow-up ADR.** No silent exceptions — amend this rule explicitly when a real case appears.

- **Server Component boundaries stay narrow.** Context Providers force a `"use client"` boundary; lifting state to a client component and passing props down is App-Router-native. Per the Next.js docs, providers should be rendered as deep as possible in the tree so static parts of Server Components remain optimisable. Keeping Providers narrow upholds that.

- **Codebase already conforms.** A scan of `src/` on 2026-05-04 shows zero `createContext` calls and zero `useContext` calls (the one `createContext` in `src/app/api/trpc/[trpc]/route.ts:8` is the tRPC server-context factory, unrelated to React Context). This ADR captures the rule going forward; it does not describe a refactor.

## Links

- Design: `thoughts/designs/2026-05-04-context-providers-for-global-state-only.md`
- React docs: https://react.dev/learn/passing-data-deeply-with-context
- Next.js docs: https://nextjs.org/docs/app/getting-started/server-and-client-components
