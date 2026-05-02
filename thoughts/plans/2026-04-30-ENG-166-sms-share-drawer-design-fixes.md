# ENG-166 SMS Share Drawer — Design Review Fixes

## Context

The `/design_review` run on the polished SMS share drawer surfaced two High-Priority and three Medium-Priority findings. None are blockers, but the desktop drawer stretches edge-to-edge at 1440 px and the mobile Cancel button falls below the WCAG 2.5.5 44 px touch-target minimum. This plan resolves all five findings before the PR is opened.

## Current State

- `src/components/ui/drawer.tsx:59` — `DrawerContent` has `data-[vaul-drawer-direction=bottom]:inset-x-0` with no `md:max-w-*` counterpart; the bottom sheet spans the full viewport on every desktop width.
- `src/components/ui/drawer.tsx:71–82` — `DrawerHeader` applies `md:text-left`; combined with the unconstrained width above, the title sits flush-left against ~1408 px of action buttons at 1440 px.
- `src/components/ui/button-variants.ts:14–19` — the `ghost` variant has no `border-b-3` (the +3 px the other variants get); paired with `size="md"`'s `py-2`, the rendered Cancel button is 37 px tall on mobile.
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:96–98` — message body uses `max-h-40 overflow-y-auto` with no visible scroll indicator. macOS overlay scrollbars hide until scrolled, so consultants reading a long draft get no signal that content is clipped.
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:39–43` — `hideOnDesktop` defaults to `false` and only flips to `true` inside a `useEffect` that runs after first paint. On Windows/Linux this means the "Open in Messages" link is briefly visible before being hidden — a one-render flash. Imperceptible in practice (the drawer doesn't open until after the effect runs on the dashboard mount), but worth eliminating.
- `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx:48–53` — the React mock returns `[initial, rs.fn()]` and treats `initial` as a value. A `useState` lazy-initializer (function) would be returned verbatim and break the test.

## Desired End State

- On `≥768 px` viewports the drawer surface is constrained to `max-w-md` (28 rem) and centered horizontally; the title left-alignment now sits inside that constrained column and looks intentional.
- On all viewports the Cancel button has `min-height: 44px`, matching the WCAG 2.5.5 minimum touch target.
- Long message bodies (>~10 lines) get a visible bottom-fade gradient that signals more content exists below; short messages render without any visual residue.
- On Windows/Linux, the "Open in Messages" link is hidden from first render — no useEffect-driven toggle, no transient visibility.
- `make check`, `make test`, `make build` pass.

## Out of Scope

- Aria-live announcement for the "Copied" state (separate a11y pass — the design review nitpick #7).
- Restoring `<DrawerDescription>` for `aria-describedby` (nitpick #6).
- `calc()` whitespace fix (nitpick #8 — Tailwind v3 arbitrary value, requires underscore-escape and is purely cosmetic; deferred).
- Vaul `shouldScaleBackground` desktop polish (medium #4 — out of scope per design intent).
- Changes to other drawer consumers — the desktop max-width is applied only to `SmsShareDrawer`'s `DrawerContent`, not the primitive.

## Approach

Three small phases, all touching the same component. Phase 1 fixes the layout (width + touch target). Phase 2 adds a JS-driven overflow fade following the established `draft-row.tsx` pattern (`useLayoutEffect` + `ResizeObserver`). Phase 3 collapses the `useState`/`useEffect` platform-detection pair into a single lazy initializer and updates the React mock to call function initializers.

---

## Phase 1: Desktop layout — width constraint + Cancel touch target

### Changes

- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:88` — add `className="md:right-auto md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2"` to `<DrawerContent>` so it overrides the primitive's `data-[vaul-drawer-direction=bottom]:inset-x-0` at `md:` and centers in a 28 rem column.
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:130` — replace the Cancel `<Button variant="ghost" size="md" data-testid="sms-share-cancel">` with `<Button variant="ghost" size="md" data-testid="sms-share-cancel" className="min-h-11">`.
- `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx` — no new test required; the existing "Cancel button renders with correct testid" test still covers presence. Visual constraints are verified manually via `/design_review`.

### Success

**Automated**
- [x] `make check` passes
- [x] `make test` passes (no regressions)

**Manual**
- [ ] At 1440 px viewport, drawer surface is centered with ~28 rem max width; title left-alignment now reads as intentional.
- [ ] At 375 px viewport, Cancel button measures ≥44 px tall via DevTools.
- [ ] `/design_review` snapshot confirms parity with `DialogPopup` desktop layout for findings #1 and #3.

---

## Phase 2: Message body overflow affordance

### Changes

- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:94–98` — wrap the scrollable message body in a `relative` container and add a conditional bottom-fade overlay driven by `ResizeObserver` overflow detection:
  ```tsx
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      setHasOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [body]);
  ```
  Render:
  ```tsx
  <div className="relative px-4 pb-2">
    <div
      ref={bodyRef}
      className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm"
    >
      {body}
    </div>
    {hasOverflow ? (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 bottom-2 h-6 rounded-b-md bg-gradient-to-t from-muted/40 to-transparent"
      />
    ) : null}
  </div>
  ```
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx` — add `useLayoutEffect`, `useRef` to the React imports.
- `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx:50–53` — extend the React mock to also stub `useLayoutEffect` and `useRef`:
  ```ts
  rs.doMock("react", () => ({
    useState: rs.fn().mockImplementation((initial: unknown) => {
      const value =
        typeof initial === "function"
          ? (initial as () => unknown)()
          : initial;
      return [value, rs.fn()];
    }),
    useEffect: rs.fn(),
    useLayoutEffect: rs.fn(),
    useRef: rs.fn().mockImplementation((initial: unknown) => ({ current: initial })),
  }));
  ```
  (The lazy-initializer handling is also needed for Phase 3 — adding it now keeps Phase 3 a one-line component change.)

### Success

**Automated**
- [x] `make check` passes
- [x] `make test` passes (existing tests green; React mock now handles lazy initializers and `useRef`/`useLayoutEffect`)

**Manual**
- [ ] Pass a 280-char SMS to the drawer → bottom-fade gradient is visible over the last ~24 px of the message body.
- [ ] Pass a 60-char SMS to the drawer → no fade overlay; container shrinks to fit the content cleanly.

---

## Phase 3: Eliminate "Open in Messages" render flash

### Changes

- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:38–43` — collapse the `useState(false) + useEffect(...)` pair into a single lazy `useState` initializer:
  ```tsx
  const [hideOnDesktop] = useState(
    () =>
      typeof navigator !== "undefined" &&
      !canUseSmsLink(navigator.userAgent),
  );
  ```
  Remove the now-unused `useEffect` import (keep `useLayoutEffect` from Phase 2).
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx` — drop `useEffect` from the `react` import.
- `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx` — the React mock from Phase 2 already calls function initializers, so `useState(() => ...)` resolves correctly. The existing `rs.doMock("./use-sms-share", () => ({ canUseSmsLink: rs.fn().mockReturnValue(false) }))` keeps `hideOnDesktop` deterministic in tests (`!false` → `true` regardless of `navigator.userAgent`).
- `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx` — add one test:
  - `"hideOnDesktop initialises from canUseSmsLink without useEffect"` — render the component, assert `mockCanUseSmsLink` (newly captured via `rs.fn()` in the mock factory) was called once during the synchronous render path.

### Success

**Automated**
- [x] `make check` passes
- [x] `make test` passes (new initializer test green; `useEffect` mock no longer required for this path)

**Manual**
- [ ] On Windows Chrome ≥768 px: open the drawer, watch the network/render timeline — the "Open in Messages" link is never visible.
- [ ] On macOS Chrome ≥768 px: open the drawer — the link is visible from the first paint.
- [ ] `/design_review` confirms no transient flash on Windows.

---

## References

- Ticket: https://github.com/samjmarshall/www/issues/166
- Design review session — 2 High-Priority, 3 Medium-Priority findings
- Prior plan: `thoughts/plans/2026-04-30-ENG-166-sms-share-drawer-polish.md`
- Drawer primitive: `src/components/ui/drawer.tsx:32–69`
- Dialog reference (desktop centering): `src/components/ui/dialog.tsx:43–48`
- Button variants (ghost height): `src/components/ui/button-variants.ts:14–25`
- Share drawer: `src/app/(application)/dashboard/_components/sms-share-drawer.tsx`
- Overflow-detection precedent (`useLayoutEffect` + `ResizeObserver`): `src/app/(application)/dashboard/_components/draft-row.tsx:19–33`
- Drawer tests: `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx`
