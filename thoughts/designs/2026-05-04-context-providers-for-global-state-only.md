# Context Providers for Global State Only

**Date:** 2026-05-04
**Status:** Codified principle, no refactor required today
**Scope:** React Context Provider usage across `src/`

---

## The principle

React Context Providers are reserved for genuinely **global** state. Page-local UI state lives in the component that owns it, lifted to the nearest common ancestor of the components that use it, and passed down explicitly via props.

### What counts as "genuinely global"

- Auth session (cross-route, cross-page identity)
- Theme / appearance
- Feature flags
- API / transport clients (tRPC, React Query `QueryClient`)
- Routing (provided by the framework)

### What does NOT count, regardless of how convenient Context feels

- Form state (multi-step or otherwise)
- Filter / selection / "what's selected on this screen" state
- Open/close state for a single component
- Anything whose lifetime is bounded by a single page or modal

### Why the rule

A Context Provider widens the surface area of a piece of state to its entire subtree. State that's actually local to one page or modal becomes readable (and writable) by anything anywhere under that subtree, and the owning component's implementation becomes coupled to consumers it can't see. Lifted state plus explicit props makes the data flow visible at every step, surfaces accidental coupling at compile time, and lets each consumer be tested with mock props instead of a Provider harness.

The compound-component carve-out (Context as a private implementation detail of a single composable component, e.g. internal `<Tabs>` plumbing) is **rejected** as a general policy. "Private implementation detail" tends to be invoked to justify the next page-local Context. If a genuine compound-component case appears (e.g. building a `<Tabs>` primitive from scratch), revisit the rule explicitly via a follow-up ADR rather than relying on case-by-case judgement.

---

## Current codebase state

A scan of `src/` on 2026-05-04 shows zero `createContext` calls and zero `useContext` calls. The codebase already conforms to the principle; this design captures the rule going forward, it does not describe a refactor.

### Legitimate global providers in use today

| File | Concern | Justification |
|---|---|---|
| `src/trpc/react.tsx` (`TRPCReactProvider`) | tRPC client + React Query `QueryClient` | API/transport client. Mounted at root. |
| `src/providers/ThemeProvider.tsx` | Theme (wraps `next-themes`) | Theme/appearance. Mounted at root. |
| `src/providers/AnalyticsProvider.tsx` | PostHog session init (side-effect mounter, not a state container) | Cross-cutting telemetry. No `createContext` — fires `useEffect` once. Acceptable. |
| `src/components/ui/toast.tsx` | Toast UI primitive (third-party) | UI primitive providing render slot. Acceptable. |

No page-local Context Providers exist today. No refactor candidates.

---

## The pattern when the temptation arises

When future work would otherwise reach for Context to share UI state between sibling components on a page or in a modal, follow this shape instead.

### Inline `useState` in the owning component

State lives directly inside the component function. **No extracted custom hook** (e.g. `useFooModalState`) — a custom hook is callable by any component anywhere, which invites someone to instantiate "the modal's state" outside the modal. Inlining `useState` makes that structurally impossible.

```tsx
export function SettingsModal() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  return (
    <Dialog>
      <NameField value={name} onChange={setName} />
      <EmailField value={email} onChange={setEmail} />
    </Dialog>
  )
}
```

### Children receive explicit named props, not a state blob

A field component receives exactly `value: string; onChange: (s: string) => void` — never a fat `state` object. Dependency surface is visible at the prop-type level; accidental over-reach surfaces at compile time.

### Default to `useState`, escalate to `useReducer` only for genuine transitions

`useReducer` earns its keep when state has real *transitions* — named actions, "reset all", invariants between fields. Not when it merely has *fields*. The reducer, when used, is also inlined inside the component (no extracted hook).

### The React docs' explicit ordering

When in doubt, follow [the React docs](https://react.dev/learn/passing-data-deeply-with-context):

1. **Start by passing props.**
2. **Extract components and pass JSX as `children`** if intermediate layers don't use the data.
3. **Only then consider Context** — and only for the genuinely global cases listed above.

---

## Next.js App Router note

Context Providers force a `"use client"` boundary; props can stay on the server. Per the [Next.js docs](https://nextjs.org/docs/app/getting-started/server-and-client-components), providers should be "rendered as deep as possible in the tree" so the static parts of Server Components remain optimisable. Lifting state to a client component and passing props down is App-Router-native; a Provider at the root that wraps everything is a smell.

---

## Implementation

Two artefacts to add. Both are documentation; no code changes.

1. **ADR** — `docs/adr/adrNNN-context-providers-for-global-state-only.md` capturing the rule, the rationale, and the categorisation table above. Use the next available ADR number.
2. **`CLAUDE.md` note** — short bullet under a new or existing section, e.g.:

   > **Context Providers**: reserved for genuinely global state (auth, theme, feature flags, transport clients, routing). For page- or modal-local state, inline `useState` in the owning component and pass values down as explicit named props — never extract into a custom hook (callable elsewhere) or a Context Provider (widens the read/write surface to the whole subtree). See ADR-NNN.

### Verification

Not applicable — no code changes. The ADR + `CLAUDE.md` note are reviewed in the same PR that adds them.

### Regression prevention

ADR + `CLAUDE.md` only. ESLint enforcement (e.g. flagging `createContext` outside an allowlist) was considered and rejected as premature: custom rules drift, the allowlist needs maintenance, and there is no offending code today. Escalate to a lint rule only if drift appears.

---

## Out of scope

- Any refactor of existing code. The codebase already conforms.
- The compound-component carve-out (deferred; revisit via follow-up ADR if a real case appears).
- The four current providers (`TRPCReactProvider`, `ThemeProvider`, `AnalyticsProvider`, toast) — all justified.

---

## Follow-ups

- Open an ADR PR with the rule + categorisation table.
- Add the `CLAUDE.md` bullet in the same PR.
- If a future feature genuinely needs a compound-component-style internal Context, write a follow-up ADR to amend this rule rather than adopting the carve-out implicitly.
