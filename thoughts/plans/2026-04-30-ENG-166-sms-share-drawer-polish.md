# ENG-166 SMS Share Drawer — Design Polish

## Context

The `/design_review` run on `feat/166-sms-share-sheet-pivot` surfaced 11 findings against `SmsShareDrawer` and the `drawer.tsx` primitive. Four were rated Blocker (overlay opacity, monospace font, no close affordance, missing focus management); the rest Needs Work or Nit. This plan resolves all findings before the PR is opened.

## Current State

- `src/components/ui/drawer.tsx:40` — `DrawerOverlay` uses `bg-black/10 backdrop-blur-xs`; app's `DialogBackdrop` uses `bg-black/50 backdrop-blur-sm`.
- `src/components/ui/drawer.tsx:101` — `DrawerTitle` uses `font-medium` (14 px/500); `DialogTitle` (`src/components/ui/dialog.tsx:74`) uses `font-semibold text-lg leading-tight`.
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:76` — message body rendered in `<pre>` (JetBrains Mono); SMS message is prose, not code.
- `sms-share-drawer.tsx` — no visible close affordance on desktop; relies on Escape / drag-down only.
- `sms-share-drawer.tsx:85` — Copy button has no `autoFocus`; focus lands outside the drawer on open.
- `sms-share-drawer.tsx:69` — title "Forward draft to lead" is impersonal and ambiguous; lead name is available at `ListPendingRow.lead.firstName` (`src/server/api/routers/messages.ts:112`).
- `sms-share-drawer.tsx:45` — clipboard failure silently swallows the error with no user feedback.
- `sms-share-drawer.tsx:35–48` — no in-drawer confirmation of successful copy; drawer closes immediately.
- `sms-share-drawer.tsx:91–101` — "Open in Messages" link renders on all platforms; `sms:` is a no-op on Windows/Linux desktop.
- `src/app/(application)/dashboard/_components/use-sms-share.ts` — `openDrawer(body, messageId)` has no `leadName` param; no `canUseSmsLink` helper.
- `src/app/(application)/dashboard/_components/use-queue-actions.ts` — `SmsShareState` type has no `pendingLeadName`; `handleApprove` / `editAndShareApprove` don't pass lead name.

## Desired End State

- Overlay backdrop matches `DialogBackdrop` (`bg-black/50 backdrop-blur-sm`).
- `DrawerTitle` typography matches `DialogTitle` (`font-semibold text-lg leading-tight`).
- Message body rendered in body font (no monospace).
- A visible "Cancel" button appears at the footer bottom; Escape / drag still also work.
- Focus lands on the Copy button when the drawer opens (`autoFocus`).
- Drawer title reads "Send message to [First Name]" when a name is available.
- Clipboard failure surfaces a toast: "Could not copy to clipboard. Try another option."
- Copy button shows a "Copied" state (Check icon) for 1.2 s before `onApprove` fires.
- "Open in Messages" link is hidden at `≥768 px` on non-macOS, non-mobile platforms via `canUseSmsLink(ua)` detection; macOS and iOS/Android always show it.
- `make check`, `make test`, `make build` pass.

## Out of Scope

- Native share path changes (Phase 3 of the original plan).
- E2E tests (Phase 4 of the original plan).
- Toast focus-ring WCAG audit (separate a11y pass).
- `sms:` deep-testing on macOS (visual QA only).

## Approach

Two phases. Phase 1 is localized to the drawer primitive and the static parts of `SmsShareDrawer` — no hook-signature changes. Phase 2 threads `leadName` through the hook chain, adds clipboard feedback, and introduces the platform-detection helper. Each phase ships its tests.

---

## Phase 1: Drawer chrome — backdrop, typography, close, focus, labels

### Changes

- `src/components/ui/drawer.tsx:40` — overlay: `bg-black/10` → `bg-black/50`; `backdrop-blur-xs` → `backdrop-blur-sm`.
- `src/components/ui/drawer.tsx:101` — `DrawerTitle` className: `"font-medium text-foreground"` → `"font-semibold text-lg leading-tight text-foreground"`.
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:76` — replace `<pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">` with `<div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">` (`font-sans` is inherited from the body; no explicit class needed).
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx` — add `data-testid="sms-share-title"` to `<DrawerTitle>` and `data-testid="sms-share-cancel"` to the new Cancel button (needed for test locators per CLAUDE.md gate).
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:81` — at the bottom of `<DrawerFooter>`, add:
  ```tsx
  <DrawerClose asChild>
    <Button variant="ghost" size="md" data-testid="sms-share-cancel">
      Cancel
    </Button>
  </DrawerClose>
  ```
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:85` — add `autoFocus` to the Copy button.
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:71` — remove `<DrawerDescription>` (redundant; buttons communicate the choices directly).
- `src/app/(application)/dashboard/_components/sms-share-drawer.tsx:89` — shorten button label: `"Copy to clipboard"` → `"Copy"`.
- `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx` — add two tests:
  - `"Cancel button renders with correct testid"` — find `sms-share-cancel` in the JSX tree, assert it is not null.
  - `"Cancel button's onOpenChange(false) fires onCancel"` — existing dismiss test already covers this; update its description to reference the explicit Cancel button path for clarity.

### Success

**Automated**
- [x] `make check` passes
- [x] `make test` passes (new cancel-button tests green; no regressions)

**Manual**
- [ ] Open drawer on desktop: overlay is visibly dark (`bg-black/50`), title is semibold/18px, body text is in sans-serif font, "Cancel" button is visible at the footer bottom, first Tab press lands on "Copy".
- [ ] `/design_review` snapshot confirms visual parity with dialog backdrop.

---

## Phase 2: Personalisation, clipboard feedback, platform detection

### Changes

**`src/app/(application)/dashboard/_components/use-sms-share.ts`**
- Add `pendingLeadName: string` state (initial `""`).
- Update `openDrawer` signature to `openDrawer(body: string, messageId: string, leadName: string)`.
- Store `leadName` in `pendingLeadName` on open; clear to `""` on close.
- Export `canUseSmsLink(userAgent: string): boolean`:
  ```ts
  export function canUseSmsLink(userAgent: string): boolean {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
    const isMac = /Macintosh/i.test(userAgent) && !/iPhone|iPad|iPod/i.test(userAgent);
    return isMobile || isMac;
  }
  ```
- Return `pendingLeadName` from the hook.

**`src/app/(application)/dashboard/_components/use-queue-actions.ts`**
- `SmsShareState` type (`line 92`): add `pendingLeadName: string`.
- `useApproveAction`:
  - Destructure `pendingLeadName` from `useSmsShare()`.
  - `handleApprove` (`line 132`): `openDrawer(row.body, row.id, row.lead.firstName)`.
  - Include `pendingLeadName` in returned `smsShareState`.
- `useEditAndApproveAction`:
  - Destructure `pendingLeadName` from `useSmsShare()`.
  - `editAndShareApprove(id, editedBody, leadFirstName: string)` — pass `leadFirstName` to `openDrawer`.
  - Include `pendingLeadName` in returned `smsShareState`.

**`src/app/(application)/dashboard/_components/draft-action-bar.tsx`**
- `editDialogMutate` closure (`line 40–43`): pass `row.lead.firstName` as third arg:
  ```ts
  editAndApprove.editAndShareApprove(vars.id, vars.body, row.lead.firstName);
  ```
- `<SmsShareDrawer>` props (`line 119`): add `leadName={smsShareState.pendingLeadName}`.

**`src/app/(application)/dashboard/_components/sms-share-drawer.tsx`**
- Props: add `leadName?: string`.
- Title: `{leadName ? `Send message to ${leadName}` : "Send message to lead"}`.
- Import `useToastManager` from `~/components/ui/toast`, `useState`, `useEffect` from `react`, `Check` from `lucide-react`.
- Clipboard failure toast in `.catch()`:
  ```ts
  .catch(() => {
    toast.add({
      type: "error",
      title: "Copy failed",
      description: "Could not copy to clipboard. Try another option.",
    });
  });
  ```
- "Copied!" state:
  ```ts
  const [copied, setCopied] = useState(false);
  // in handleCopy .then():
  setCopied(true);
  setTimeout(() => {
    analytics.queue.smsShared({ method: "clipboard", message_id: messageId });
    onApprove();
    setCopied(false);
  }, 1200);
  ```
  - Copy button icon: `copied ? <Check className="mr-2 size-4" /> : <ClipboardCopy className="mr-2 size-4" />`.
  - Copy button label: `copied ? "Copied" : "Copy"`.
  - Copy button `disabled={copied}` during the 1.2 s window to prevent double-fire.
- Platform detection for Messages link:
  ```ts
  const [hideOnDesktop, setHideOnDesktop] = useState(false);
  useEffect(() => {
    setHideOnDesktop(!canUseSmsLink(navigator.userAgent));
  }, []);
  ```
  - Messages link: add `className={cn(buttonVariants({ variant: "outline", size: "md" }), hideOnDesktop && "md:hidden")}`.

**`src/app/(application)/dashboard/_components/__tests__/use-sms-share.test.ts`**
- Add `canUseSmsLink` unit tests:
  - macOS UA string → `true`
  - iOS UA string → `true`
  - Android UA string → `true`
  - Windows Chrome UA string → `false`
  - Linux Chrome UA string → `false`
- Add `openDrawer` tests:
  - `openDrawer("body", "id", "Jane")` → `pendingLeadName === "Jane"`.
  - `closeDrawer()` → `pendingLeadName === ""`.

**`src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx`**
- Add to `beforeEach`: mock `~/components/ui/toast` → `{ useToastManager: () => ({ add: mockToastAdd }) }` where `mockToastAdd = rs.fn()`.
- Add test: `"title includes leadName when provided"` — render with `leadName: "Jane"`, find `data-testid="sms-share-title"`, assert `props.children === "Send message to Jane"`.
- Add test: `"title falls back to 'lead' when leadName omitted"` — render without `leadName`, assert title text ends with `"lead"`.
- Add test: `"clipboard failure calls toast.add with error"` — mock `mockClipboardWrite.mockRejectedValue(new DOMException(...))`, click copy, flush microtask, assert `mockToastAdd` called with `{ type: 'error', title: 'Copy failed', ... }`.
- Update existing copy-success test to account for the 1200 ms delay:
  ```ts
  rs.useFakeTimers();
  // ... click copy, flush clipboard promise ...
  await Promise.resolve();
  expect(onApprove).not.toHaveBeenCalled(); // not yet
  rs.advanceTimersByTime(1200);
  expect(onApprove).toHaveBeenCalledOnce();
  rs.useRealTimers();
  ```

**`src/app/(application)/dashboard/_components/__tests__/use-queue-actions.test.tsx`**
- Update any `openDrawer` call-site assertions to include the `leadName` third argument.
- Add test: `handleApprove` for SMS row passes `row.lead.firstName` to `openDrawer`.
- Add test: `editAndShareApprove` passes the `leadFirstName` param to `openDrawer`.

### Success

**Automated**
- [x] `make check` passes
- [x] `make test` passes (all new tests green; existing copy-success test updated for 1200 ms delay)

**Manual**
- [ ] Open share drawer for a lead named "Jane Smith" → title reads "Send message to Jane".
- [ ] On Windows Chrome ≥768 px viewport: "Open in Messages" is not visible.
- [ ] On macOS Chrome ≥768 px viewport: "Open in Messages" is visible.
- [ ] On iOS Safari: "Open in Messages" is visible.
- [ ] Clipboard failure (revoke permission in browser settings): error toast appears, drawer stays open.
- [ ] Clipboard success: "Copied" label with Check icon shows for ~1.2 s, then drawer closes and row leaves queue.
- [ ] `/design_review` on updated drawer.

---

## References

- Ticket: https://github.com/samjmarshall/www/issues/166
- Design review (this session) — 11 findings, 4 Blockers
- Original ENG-166 plan: `thoughts/plans/2026-04-29-ENG-166-sms-share-sheet-pivot.md`
- Drawer primitive: `src/components/ui/drawer.tsx`
- Dialog backdrop (reference): `src/components/ui/dialog.tsx:17–28`
- Dialog title (reference): `src/components/ui/dialog.tsx:70–78`
- Share drawer: `src/app/(application)/dashboard/_components/sms-share-drawer.tsx`
- Share hook: `src/app/(application)/dashboard/_components/use-sms-share.ts`
- Queue actions: `src/app/(application)/dashboard/_components/use-queue-actions.ts`
- Action bar: `src/app/(application)/dashboard/_components/draft-action-bar.tsx`
- `SmsShareState` type: `src/app/(application)/dashboard/_components/use-queue-actions.ts:92`
- `lead.firstName` in `listPending`: `src/server/api/routers/messages.ts:112`
- Toast pattern: `src/app/(application)/dashboard/_components/use-queue-actions.ts:183–190`
- Drawer tests: `src/app/(application)/dashboard/_components/__tests__/sms-share-drawer.test.tsx`
- Share hook tests: `src/app/(application)/dashboard/_components/__tests__/use-sms-share.test.ts`
- Queue actions tests: `src/app/(application)/dashboard/_components/__tests__/use-queue-actions.test.tsx`
