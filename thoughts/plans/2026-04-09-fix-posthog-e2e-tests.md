# Fix PostHog E2E Tests Implementation Plan

## Overview

Unblock 57 of 111 skipped Playwright e2e tests (51% of all skips) that verify PostHog analytics events. Today they are marked `test.fixme()` because PostHog's default `request_batching: true` queues events in memory and only flushes on page unload via `sendBeacon`, so the existing network-interception helper never sees them during a test run.

The fix is a minimal, runtime-only test-mode gate on `posthog.init()` — no build-time env var, no separate production code path beyond a one-flag branch.

## Current State Analysis

**What already works (do not rebuild):**
- `e2e/utils/analytics-helper.ts:85-115` — `AnalyticsHelper` already uses `page.on("request")` to intercept requests to `/rk/`, `/e`, `/capture`, `/batch`, decodes gzip-compressed PostHog payloads with `pako`, and extracts events from batch arrays. API is fluent: `expectEvent(name).withProperty(k, v).toBeFired()`.
- `e2e/utils/analytics-helper.ts:138-153` — `waitForEvent(name, timeoutMs)` already implements an async polling pattern (every-rAF loop, 5s default timeout) that reads from the same `capturedEvents` reference. The fluent `EventAssertion` API, by contrast, is still sync. Phase 2 applies the existing polling pattern to the fluent API rather than inventing anything new.
- `e2e/fixtures/test.ts:14-20` — `analytics` fixture instantiates the helper, calls `startCapturing()` before the test, `stopCapturing()` after. Tests import `test` from this file and destructure `analytics` from the test args.
- All expected event names are instrumented in the app at `src/lib/posthog.ts` — `cta_clicked` (L177), `booking_form_started` (L248), `form_step_completed` (L315), `lead_identified` (L396), `booking_form_submitted` (L468), `faq_expanded` (L555), `faq_searched` (L572), `utm_captured` (L804), `login_otp_requested` (L892), `login_success` (L901).

**What's broken:**
- `src/instrumentation-client.ts:4-9` calls `posthog.init()` with the production default `request_batching: true`. Events are queued in memory; during a Playwright test the page never unloads, so the flush-on-unload path never fires and the listener never sees the POST request.
- All 57 analytics tests are marked `test.fixme()` with top-of-file comments explaining the issue and proposing the fix that was never implemented (`e2e/features/cta-tracking.spec.ts:3-51`, `e2e/features/booking-form.spec.ts:177-203`).
- `EventAssertion.toBeFired()` and `toBeFiredTimes()` at `e2e/utils/analytics-helper.ts:233-279` are sync. They read `this.events` (a reference, not a copy) and assert once. With batching disabled, events will arrive a few ms after the triggering action — the sync call will race and flake unless every test site adds an explicit `waitForTimeout`.

**Key constraint — `safeCapture` readiness gate:**
- `src/lib/posthog.ts:113-116` silently drops events if `posthog.__loaded === false`. This is a separate failure mode from batching. In practice tests navigate via `homePage.goto()` which waits for `load`, by which time the PostHog snippet has finished bootstrapping. But if a test sees flake after the batching fix, this gate is the second suspect.

## Desired End State

- `make test_e2e` reports 145 → **202 passed, 54 skipped, 0 failed** (57 previously-fixmed analytics tests now pass; other legitimately-skipped groups — mobile viewport skips, unimplemented feature stubs, viewport-exclusive dashboard tests, HubSpot inbound webhook tests — stay skipped per the prior skip audit).
- No `test.fixme()` calls or "PostHog batches events and sends them via sendBeacon" comments remain in the 6 analytics spec files.
- Production PostHog config is unchanged unless `window.__E2E_MODE__` is truthy. The flag can only be set via Playwright's `addInitScript` or manually by a developer with devtools — in both cases the only observable effect is reduced batching on that single browser session.

### Key Discoveries:
- `request_batching: boolean` is a valid posthog-js 1.298.0 config option (`node_modules/posthog-js/dist/module.d.ts:1399-1403`), default `true`. Setting it to `false` bypasses the in-memory queue entirely — every `posthog.capture()` fires an immediate HTTP request.
- PostHog's `loaded: (posthog) => void` callback is public API (`node_modules/posthog-js/dist/module.d.ts:1162`). Not needed for this plan, but useful to know if we ever want browser-side event listeners instead of network interception.
- `page.addInitScript()` is Playwright's documented API for injecting scripts before any page script runs on every navigation, so setting `window.__E2E_MODE__` before `goto()` guarantees the flag is visible when `instrumentation-client.ts` executes. This will be the first use of `addInitScript` in the e2e suite — the only existing references are commented-out proposals inside the fixme'd spec files themselves (`e2e/features/cta-tracking.spec.ts:38`, `e2e/features/booking-form.spec.ts:198`). All existing test-time mocking in this suite uses `page.route()` (see `e2e/utils/auth-mock.ts`), which is a different mechanism — it intercepts HTTP traffic, not in-page script state.
- Tests fire `toBeFired()` assertions synchronously today, but since all 57 are `fixme`'d, there are zero live call sites — flipping the signature to `async` is a safe breaking change.

## What We're NOT Doing

- **Not** touching the 29 non-analytics mobile viewport skips (login.spec.ts form submission, booking-form step transitions, faq accordion animation). Those are a separate investigation per the earlier skip audit — likely stale labels referring to "WebKit" when the mobile project actually runs Chromium.
- **Not** mocking `window.posthog` with a stub. Keeping the real SDK means we still test distinct_id propagation, session_id assignment, `$lib` property enrichment, and any middleware added to `posthog.capture`.
- **Not** moving to a build-time env var like `NEXT_PUBLIC_E2E`. That would require a separate test build or a production fallback, and has no advantage over a runtime window flag for this use case.
- **Not** rewriting the app-side instrumentation in `src/lib/posthog.ts`. All expected event names are already emitted.
- **Not** adjusting `safeCapture`'s ready-check drop behavior. If we hit races we'll add a `waitForPostHogReady()` helper in Phase 4, but the baseline change doesn't touch this.
- **Not** making `expectNoEvent` async. Its semantics (assert no event has fired within a caller-controlled window) are incompatible with polling — it must be sync and called after an explicit wait.

## Implementation Approach

Four sequential phases. Phase 1-2 are infrastructure with zero spec-file changes, so they can land and be verified independently. Phase 3 is the mechanical unskip. Phase 4 is the verification and triage of any individual tests that fail for reasons unrelated to batching (e.g., property schema drift between the test's expectation and `src/lib/posthog.ts`).

---

## Phase 1: Test-mode PostHog config and fixture flag

### Overview
Gate a `request_batching: false` override on `window.__E2E_MODE__`, and have the analytics fixture set that flag via `page.addInitScript()` before any page script runs. No test files unskipped yet — this phase only ensures the plumbing works.

### Changes Required:

#### 1. Add test-mode branch to PostHog init
**File**: `src/instrumentation-client.ts`
**Changes**: Detect `window.__E2E_MODE__` at runtime and spread an override object into the init options when true.

```ts
import posthog from "posthog-js";
import { env } from "./env";

declare global {
  interface Window {
    __E2E_MODE__?: boolean;
  }
}

const isE2E =
  typeof window !== "undefined" && window.__E2E_MODE__ === true;

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: "/rk",
  ui_host: "https://us.posthog.com",
  person_profiles: "identified_only",
  defaults: "2025-05-24",
  // Playwright E2E mode: disable batching so captures fire immediately and
  // can be intercepted by AnalyticsHelper. Session recording is also
  // disabled to avoid sending test traffic to the real PostHog project.
  ...(isE2E && {
    request_batching: false,
    disable_session_recording: true,
  }),
});
```

**Tasks**:
- [ ] Open `src/instrumentation-client.ts` and add a `declare global { interface Window { __E2E_MODE__?: boolean; } }` block after the existing imports
- [ ] Add the line `const isE2E = typeof window !== "undefined" && window.__E2E_MODE__ === true;` after the global declaration
- [ ] Inside the existing `posthog.init()` options object, add a conditional spread placeholder: `...(isE2E && { }),`
- [ ] Inside the conditional spread object, add the key `request_batching: false`
- [ ] Inside the same conditional spread object, add the key `disable_session_recording: true`
- [ ] Add an inline comment directly above the conditional spread explaining: "Playwright E2E mode: disable batching so captures fire immediately and can be intercepted by AnalyticsHelper. Session recording is disabled to avoid test traffic leaking to the real PostHog project."

#### 2. Inject the flag in the analytics fixture
**File**: `e2e/fixtures/test.ts`
**Changes**: Call `page.addInitScript()` at the start of the `analytics` fixture so `window.__E2E_MODE__` is set on the next navigation, before any Next.js bundle runs.

```ts
analytics: async ({ page }, use) => {
  // Must run BEFORE any page script — the next goto() will inject this
  // into the fresh document, and instrumentation-client.ts will pick it
  // up in its runtime check and init PostHog with batching disabled.
  await page.addInitScript(() => {
    (window as Window & { __E2E_MODE__?: boolean }).__E2E_MODE__ = true;
  });

  const analytics = new AnalyticsHelper(page);
  await analytics.startCapturing();
  await use(analytics);
  await analytics.stopCapturing();
},
```

**Tasks**:
- [ ] Open `e2e/fixtures/test.ts` and locate the `analytics` fixture body at lines 15-20
- [ ] Before the `const analytics = new AnalyticsHelper(page)` line, add an `await page.addInitScript(() => { ... });` call
- [ ] Inside the `addInitScript` callback, set `(window as Window & { __E2E_MODE__?: boolean }).__E2E_MODE__ = true`
- [ ] Add a comment directly above the `addInitScript` call explaining it must run before any page script so the next `goto()` injects the flag into the fresh document where `instrumentation-client.ts` will read it

#### 3. Smoke test
**File**: `e2e/features/cta-tracking.spec.ts`
**Tests**: Add a single new `test("[phase 1 smoke] hero primary CTA emits cta_clicked", …)` inside the `CTA Click Tracking` describe block. Do NOT modify or unskip any of the existing 6 fixme'd tests — they're unskipped in Phase 3 after the fluent API is async.

Update the import at line 1 from `import { test } from "../fixtures/test"` to `import { expect, test } from "../fixtures/test"` — the current file only imports `test` (verified at `e2e/features/cta-tracking.spec.ts:1`), and the smoke test below needs `expect`.

```ts
test("[phase 1 smoke] hero primary CTA emits cta_clicked", async ({
  homePage,
  analytics,
}) => {
  await homePage.hero.clickPrimaryCta();

  // Use the existing async waitForEvent helper, NOT the fluent toBeFired()
  // API — the fluent API is still sync in Phase 1 and races the event
  // arrival. Phase 2 will upgrade the fluent API; this smoke test will be
  // deleted at the end of Phase 2 once the real tests are unskipped.
  const event = await analytics.waitForEvent("cta_clicked", 5000);
  expect(event).not.toBeNull();
  expect(event?.properties.location).toBe("hero_primary");
});
```

Leave the top-of-file explanatory comment in place for now — it will be removed in Phase 3. This smoke test is a temporary scaffold: it exercises the `__E2E_MODE__` → `request_batching: false` plumbing end-to-end using the already-async `waitForEvent` helper (`e2e/utils/analytics-helper.ts:138-153`), so Phase 1 can be verified independently without depending on Phase 2's async fluent API. Phase 2 deletes this smoke test once its own validation covers the same ground through the fluent API.

**Tasks**:
- [ ] At `e2e/features/cta-tracking.spec.ts:1`, change `import { test } from "../fixtures/test";` to `import { expect, test } from "../fixtures/test";`
- [ ] Inside the `CTA Click Tracking` describe block, add a new `test("[phase 1 smoke] hero primary CTA emits cta_clicked", async ({ homePage, analytics }) => { ... });`
- [ ] Inside the smoke test body, call `await homePage.hero.clickPrimaryCta();`
- [ ] Inside the smoke test body, call `const event = await analytics.waitForEvent("cta_clicked", 5000);`
- [ ] Assert `expect(event).not.toBeNull();`
- [ ] Assert `expect(event?.properties.location).toBe("hero_primary");`
- [ ] Add an inline comment inside the smoke test noting it is a temporary Phase 1 scaffold using `waitForEvent` (not the sync fluent API) and will be replaced in Phase 2
- [ ] Leave the top-of-file "PostHog batches events" JSDoc comment untouched (Phase 3 removes it)

### Success Criteria:

#### Automated Verification:
- [ ] `make check` passes (typecheck + lint)
- [ ] `yarn test:e2e --project=desktop -g "\[phase 1 smoke\] hero primary CTA"` passes on 3 consecutive runs
- [ ] The HTML report shows 1 captured `cta_clicked` event with `location: "hero_primary"`

#### Manual Verification:
- [ ] Open devtools on a production page and confirm `window.__E2E_MODE__` is `undefined` (i.e., the flag is truly test-only and not leaking)
- [ ] In the same session, run `window.__E2E_MODE__ = true; location.reload()` and confirm PostHog still works but network traffic shows one request per event instead of batched payloads (use Network tab filter `/rk/`)

---

## Phase 2: Async polling in EventAssertion

### Overview
Upgrade `toBeFired()` and `toBeFiredTimes()` to async methods that poll `this.events` for up to a configurable timeout (default 5s) before failing. Keeps the existing rich error messages. `expectNoEvent` stays sync.

### Changes Required:

#### 1. Promote toBeFired to async with polling
**File**: `e2e/utils/analytics-helper.ts`
**Changes**: Rewrite `EventAssertion.toBeFired()` and `toBeFiredTimes()` to poll. The `events` array is passed by reference from the helper, so new pushes by the `page.on("request")` listener become visible on each iteration without any rework.

```ts
/** Execute the assertion — polls until the event arrives or timeout. */
async toBeFired(timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const matchingEvents = this.events.filter(
      (e) => e.event === this.eventName,
    );
    if (matchingEvents.length > 0) {
      if (this.propertyMatchers.length === 0) return;
      const fullyMatching = matchingEvents.find((event) =>
        this.propertyMatchers.every(({ key, matcher }) =>
          matcher(event.properties[key]),
        ),
      );
      if (fullyMatching) return;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  // Timeout — raise the same rich error the old sync path produced.
  const matchingEvents = this.events.filter(
    (e) => e.event === this.eventName,
  );
  expect(
    matchingEvents.length,
    `Expected '${this.eventName}' event to be fired within ${timeoutMs}ms, but it wasn't. ` +
      `Captured events: [${this.events.map((e) => e.event).join(", ")}]`,
  ).toBeGreaterThan(0);
  const conditions = this.propertyMatchers
    .map((m) => m.description)
    .join(", ");
  const actualProps = matchingEvents
    .map((e) => JSON.stringify(e.properties))
    .join("\n");
  throw new Error(
    `Expected '${this.eventName}' with [${conditions}] within ${timeoutMs}ms, but no matching event found.\n` +
      `Actual '${this.eventName}' events:\n${actualProps}`,
  );
}

/** Assert event was fired exactly N times — polls until count reached or timeout. */
async toBeFiredTimes(count: number, timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const matching = this.events.filter((e) => {
      if (e.event !== this.eventName) return false;
      if (this.propertyMatchers.length === 0) return true;
      return this.propertyMatchers.every(({ key, matcher }) =>
        matcher(e.properties[key]),
      );
    });
    if (matching.length === count) return;
    if (matching.length > count) break; // Fail fast — we've overshot
    await new Promise((r) => setTimeout(r, 50));
  }
  const matching = this.events.filter((e) => {
    if (e.event !== this.eventName) return false;
    if (this.propertyMatchers.length === 0) return true;
    return this.propertyMatchers.every(({ key, matcher }) =>
      matcher(e.properties[key]),
    );
  });
  expect(matching).toHaveLength(count);
}
```

**Tasks — toBeFired (async polling)**:
- [ ] Change the `toBeFired()` signature at `e2e/utils/analytics-helper.ts:233` from `toBeFired(): void` to `async toBeFired(timeoutMs = 5000): Promise<void>`
- [ ] Inside `toBeFired`, record `const startedAt = Date.now();` as the first line
- [ ] Wrap the existing match logic in a `while (Date.now() - startedAt < timeoutMs) { ... }` polling loop
- [ ] Inside the loop, filter `this.events` into `const matchingEvents = this.events.filter((e) => e.event === this.eventName);`
- [ ] Inside the loop, if `matchingEvents.length > 0 && this.propertyMatchers.length === 0`, `return` immediately (success path, no property matchers)
- [ ] Inside the loop, if `matchingEvents.length > 0` and there ARE property matchers, use `matchingEvents.find((event) => this.propertyMatchers.every(({ key, matcher }) => matcher(event.properties[key])))` and `return` when a fully-matching event is found
- [ ] At the end of each loop iteration, `await new Promise((r) => setTimeout(r, 50));` to yield control
- [ ] After the loop (timeout branch), re-compute `matchingEvents` from the current `this.events` so the failure message reflects the final state
- [ ] Raise the existing `expect(matchingEvents.length, ...).toBeGreaterThan(0)` assertion with a message referencing `this.eventName`, `timeoutMs`, and the captured event names
- [ ] Build a `conditions` string by joining `this.propertyMatchers.map((m) => m.description)` with `", "`
- [ ] Build an `actualProps` string by joining `matchingEvents.map((e) => JSON.stringify(e.properties))` with newlines
- [ ] Throw a final `Error` with message `"Expected '${this.eventName}' with [${conditions}] within ${timeoutMs}ms, but no matching event found.\nActual '${this.eventName}' events:\n${actualProps}"`

**Tasks — toBeFiredTimes (async polling)**:
- [ ] Change the `toBeFiredTimes()` signature at `e2e/utils/analytics-helper.ts:269` from `toBeFiredTimes(count: number): void` to `async toBeFiredTimes(count: number, timeoutMs = 5000): Promise<void>`
- [ ] Inside `toBeFiredTimes`, record `const startedAt = Date.now();` as the first line
- [ ] Wrap the existing match logic in a `while (Date.now() - startedAt < timeoutMs) { ... }` polling loop
- [ ] Inside the loop, compute `const matching = this.events.filter((e) => { if (e.event !== this.eventName) return false; if (this.propertyMatchers.length === 0) return true; return this.propertyMatchers.every(({ key, matcher }) => matcher(e.properties[key])); });`
- [ ] Inside the loop, if `matching.length === count`, `return` immediately (success)
- [ ] Inside the loop, if `matching.length > count`, `break` to fail fast on overshoot
- [ ] At the end of each loop iteration, `await new Promise((r) => setTimeout(r, 50));`
- [ ] After the loop (timeout or overshoot branch), re-compute `matching` from the current `this.events`
- [ ] Raise `expect(matching).toHaveLength(count);` so Playwright surfaces its rich length-diff failure

**Tasks — untouched surfaces**:
- [ ] Verify `expectNoEvent` at `e2e/utils/analytics-helper.ts:161` remains sync — do NOT add `async` or `await` (per "What We're NOT Doing")
- [ ] Verify `waitForEvent` at `e2e/utils/analytics-helper.ts:138-153` is NOT touched — it already polls correctly and is used as-is by the Phase 1 smoke test

#### 2. Replace the Phase 1 smoke test with a fluent-API smoke test
**File**: `e2e/features/cta-tracking.spec.ts`
**Changes**: Delete the `[phase 1 smoke] hero primary CTA emits cta_clicked` test added in Phase 1 and add a new temporary `[phase 2 smoke] hero primary CTA fluent assertion` test in its place. The new test uses the async fluent API so we validate that the assertion chain — not just `waitForEvent` — now works end-to-end. This second smoke test is also temporary and will be deleted in Phase 3 when the real 6 fixme'd tests are unskipped and provide the same coverage.

```ts
test("[phase 2 smoke] hero primary CTA fluent assertion", async ({
  homePage,
  analytics,
}) => {
  await homePage.hero.clickPrimaryCta();

  await analytics
    .expectEvent("cta_clicked")
    .withProperty("location", "hero_primary")
    .toBeFired();
});
```

**Tasks**:
- [ ] In `e2e/features/cta-tracking.spec.ts`, delete the entire `[phase 1 smoke] hero primary CTA emits cta_clicked` test added in Phase 1
- [ ] Add a new `test("[phase 2 smoke] hero primary CTA fluent assertion", async ({ homePage, analytics }) => { ... });` in its place, inside the `CTA Click Tracking` describe block
- [ ] Inside the new smoke test body, call `await homePage.hero.clickPrimaryCta();`
- [ ] Inside the new smoke test body, await the fluent chain: `await analytics.expectEvent("cta_clicked").withProperty("location", "hero_primary").toBeFired();`
- [ ] Add an inline comment noting this smoke test will be deleted in Phase 3 once the real unskipped tests cover the same plumbing

### Success Criteria:

#### Automated Verification:
- [ ] `make check` passes
- [ ] `yarn test:e2e --project=desktop -g "\[phase 2 smoke\] hero primary CTA fluent assertion"` passes on 10 consecutive runs (stability check — polling should make this non-flaky)
- [ ] Intentionally break the app instrumentation (temporarily rename `cta_clicked` to `cta_clicked_xxx` in `src/lib/posthog.ts:177`) and confirm the test fails with the polling timeout message within ~5s, not hanging. Revert the rename before moving on.

#### Manual Verification:
- [ ] Error message on failure lists both the expected event + conditions AND the actual captured events — useful when debugging real failures

---

## Phase 3: Unskip all 57 analytics tests

### Overview
Mechanical change across 6 spec files: remove every `test.fixme` marker on analytics tests, delete the top-of-file "PostHog batches events…" explanatory comments, and prefix every `.toBeFired()` / `.toBeFiredTimes()` call with `await`. Tests stay in their current describe blocks.

### Changes Required:

#### 1. `e2e/features/cta-tracking.spec.ts`
**Tasks — cleanup**:
- [ ] Delete the top-of-file JSDoc comment block at `e2e/features/cta-tracking.spec.ts:3-51` ("CTA CLICK TRACKING TESTS - ALL ANALYTICS TESTS MARKED AS FIXME…")
- [ ] Delete the `[phase 2 smoke] hero primary CTA fluent assertion` test — the unfixme'd "hero primary CTA tracks click event" now covers the same plumbing

**Tasks — unfixme per test**:
- [ ] Change `test.fixme("hero primary CTA tracks click event", …)` at line 57 to `test("hero primary CTA tracks click event", …)`
- [ ] Change `test.fixme("hero secondary CTA tracks click event", …)` at line 69 to `test("hero secondary CTA tracks click event", …)`
- [ ] Change `test.fixme("navbar desktop CTA tracks click event", …)` at line 81 to `test("navbar desktop CTA tracks click event", …)`
- [ ] Change `test.fixme("pricing tier CTAs track click events", …)` at line 93 to `test("pricing tier CTAs track click events", …)`
- [ ] Change `test.fixme("final CTA section tracks click event", …)` at line 119 to `test("final CTA section tracks click event", …)`
- [ ] Change `test.fixme("FAQ bottom CTA tracks click event", …)` at line 132 to `test("FAQ bottom CTA tracks click event", …)`

**Tasks — await every assertion**:
- [ ] Prefix the `.toBeFired()` call inside "hero primary CTA tracks click event" with `await`
- [ ] Prefix the `.toBeFired()` call inside "hero secondary CTA tracks click event" with `await`
- [ ] Prefix the `.toBeFired()` call inside "navbar desktop CTA tracks click event" with `await`
- [ ] Prefix the first `.toBeFired()` call (pricing_foundation, before `analytics.clearEvents()`) inside "pricing tier CTAs track click events" with `await`
- [ ] Prefix the second `.toBeFired()` call (pricing_growth, after `analytics.clearEvents()`) inside "pricing tier CTAs track click events" with `await`
- [ ] Prefix the `.toBeFired()` call inside "final CTA section tracks click event" with `await`
- [ ] Prefix the `.toBeFired()` call inside "FAQ bottom CTA tracks click event" with `await`

#### 2. `e2e/features/booking-form.spec.ts`
**Tasks — cleanup**:
- [ ] Delete the mid-file JSDoc comment block at `e2e/features/booking-form.spec.ts:177-203` ("ANALYTICS TESTS - ALL MARKED AS FIXME…") — note this is mid-file, not top-of-file, because two other describe blocks precede it

**Tasks — unfixme per test**:
- [ ] Change `test.fixme("form interaction fires form_started event", …)` at line 210 to `test("form interaction fires form_started event", …)`
- [ ] Change `test.fixme("step completion fires step_completed event", …)` at line 219 to `test("step completion fires step_completed event", …)`
- [ ] Change `test.fixme("lead identification happens after step 1", …)` at line 235 to `test("lead identification happens after step 1", …)`
- [ ] Change `test.fixme("successful submission fires form_submitted event", …)` at line 311 to `test("successful submission fires form_submitted event", …)`

**Tasks — await every assertion**:
- [ ] Prefix the `.toBeFired()` call inside "form interaction fires form_started event" with `await`
- [ ] Prefix the `.toBeFired()` call inside "step completion fires step_completed event" with `await`
- [ ] Prefix the `.toBeFired()` call inside "lead identification happens after step 1" with `await`
- [ ] Prefix the `.toBeFired()` call inside "successful submission fires form_submitted event" with `await`

#### 3. `e2e/features/login.spec.ts`
**Tasks — cleanup**:
- [ ] Delete the pre-describe JSDoc comment block at `e2e/features/login.spec.ts:256-263` ("POSTHOG EVENT TESTS — MARKED AS FIXME…")
- [ ] Delete the describe-level `test.fixme(true, "PostHog events are batched…")` call at lines 265-268 that currently blocks the entire "Login Page — PostHog Events" describe

**Tasks — await every assertion**:
- [ ] Prefix the `.toBeFired()` call inside "fires login_otp_requested on email submit" (starts at line 270) with `await`
- [ ] Prefix the `.toBeFired()` call inside "fires login_success on successful OTP verify" (starts at line 289) with `await`

**Tasks — do-not-touch guardrails**:
- [ ] Verify the `analytics.expectNoEvent("login_success")` call at line 329 remains **sync** (do NOT add `await`) — `expectNoEvent` stays sync per "What We're NOT Doing"
- [ ] Leave all `loginPage.page.waitForTimeout(500)` calls in this file untouched — they are belt-and-braces on top of polling and genuinely needed for the sync `expectNoEvent` assertion

#### 4. `e2e/features/faq-interactions.spec.ts`
**Tasks — cleanup**:
- [ ] Delete the inline JSDoc comment at `e2e/features/faq-interactions.spec.ts:88-90` ("ANALYTICS TEST - See booking-form.spec.ts…")
- [ ] Delete the inline JSDoc comment at `e2e/features/faq-interactions.spec.ts:110-112` ("ANALYTICS TEST - See booking-form.spec.ts…")

**Tasks — unfixme per test**:
- [ ] Change `test.fixme("search tracks analytics event after debounce", …)` at line 91 to `test("search tracks analytics event after debounce", …)`
- [ ] Change `test.fixme("expanding FAQ tracks analytics event", …)` at line 113 to `test("expanding FAQ tracks analytics event", …)`

**Tasks — await every assertion**:
- [ ] Prefix the `.toBeFired()` call inside "search tracks analytics event after debounce" with `await`
- [ ] Prefix the `.toBeFired()` call inside "expanding FAQ tracks analytics event" with `await`

#### 5. `e2e/journeys/form-abandonment.spec.ts`
**Tasks — cleanup**:
- [ ] Delete the top-of-file JSDoc comment block at `e2e/journeys/form-abandonment.spec.ts:4-10` ("ANALYTICS TESTS - ALL MARKED AS FIXME…")

**Tasks — unfixme per test**:
- [ ] Change `test.fixme("abandonment tracked when leaving after step 1", …)` at line 12 to `test("abandonment tracked when leaving after step 1", …)`
- [ ] Change `test.fixme("partial lead data is captured at each step", …)` at line 40 to `test("partial lead data is captured at each step", …)`

**Tasks — await every assertion**:
- [ ] Prefix the `analytics.expectEvent("form_step_completed").withProperty("step", 1).toBeFired()` call inside "abandonment tracked when leaving after step 1" with `await`
- [ ] Prefix the `analytics.expectEvent("lead_identified").toBeFired()` call inside "partial lead data is captured at each step" with `await`
- [ ] Prefix the `analytics.expectEvent("form_step_completed").withProperty("step", 2).toBeFired()` call inside "partial lead data is captured at each step" with `await`

#### 6. `e2e/journeys/lead-conversion.spec.ts`
**Tasks — cleanup**:
- [ ] Delete the pre-test JSDoc comment block at `e2e/journeys/lead-conversion.spec.ts:5-20` ("ANALYTICS TEST - MARKED AS FIXME…")
- [ ] Delete the pre-test JSDoc comment block at `e2e/journeys/lead-conversion.spec.ts:116-121` ("ANALYTICS TEST - MARKED AS FIXME…")

**Tasks — unfixme per test**:
- [ ] Change `test.fixme("complete journey from landing to form submission with analytics", …)` at line 21 to `test("complete journey from landing to form submission with analytics", …)`
- [ ] Change `test.fixme("UTM parameters are tracked", …)` at line 122 to `test("UTM parameters are tracked", …)`

**Tasks — await every assertion in the complete-journey test**:
- [ ] Prefix the `analytics.expectEvent("cta_clicked").withProperty("location", "hero_primary").toBeFired()` call with `await`
- [ ] Prefix the `analytics.expectEvent("booking_form_started").toBeFired()` call with `await`
- [ ] Prefix the `analytics.expectEvent("form_step_completed").withProperty("step", 1).toBeFired()` call with `await`
- [ ] Prefix the `analytics.expectEvent("booking_form_submitted").withPropertyPresent("lead_email").toBeFired()` call with `await`

**Tasks — await every assertion in the UTM test**:
- [ ] Prefix the `analytics.expectEvent("utm_captured").withProperty("utm_source", "google").toBeFired()` call with `await`

### Success Criteria:

#### Automated Verification:
- [ ] `make check` passes (typecheck — note: biome 2.4.9's `noFloatingPromises` rule is in nursery and NOT enabled in this project's `biome.json`, and TypeScript `strict` doesn't catch unawaited promises either. Static analysis will NOT catch a missed `await` on `.toBeFired()` — the checks below are the real safety net.)
- [ ] Grep confirms zero `test.fixme` calls remain in the 6 analytics spec files: `rg "test\.fixme" e2e/features/cta-tracking.spec.ts e2e/features/booking-form.spec.ts e2e/features/login.spec.ts e2e/features/faq-interactions.spec.ts e2e/journeys/form-abandonment.spec.ts e2e/journeys/lead-conversion.spec.ts` returns nothing
- [ ] Grep confirms every `.toBeFired(` or `.toBeFiredTimes(` call is preceded by `await`: `rg --multiline --multiline-dotall "^\s*analytics\b(?:(?!await).)*?\.toBeFired" e2e/features e2e/journeys` returns nothing. (The pattern matches statements beginning with `analytics` that chain into `.toBeFired` without an `await` on the same statement.)
- [ ] `make test_e2e` shows ≥ 200 passed (up from 145), ≤ 55 skipped (down from 111), 0 failed on the first run. If a test silently passed due to a missed `await` on an assertion, Playwright's unhandled-rejection handler surfaces it as a failure here — rerun after fixing.

#### Manual Verification:
- [ ] Spot-check HTML report: click into 2-3 of the newly-passing tests and confirm the "events captured" count matches expectations (e.g., the `pricing tier CTAs` test should show both `pricing_foundation` and `pricing_growth` captures)

---

## Phase 4: Verify full suite and triage real failures

### Overview
Run the full suite, expect most tests to pass, and triage any that fail for reasons unrelated to batching. These should be rare but likely include property-name drift (the test expects a property the app doesn't set), or the `safeCapture` ready-gate race if a test fires before PostHog finishes bootstrapping.

### Changes Required:

#### 1. Run the full suite and collect failures
**Command**: `make test_e2e` → capture the JSON reporter output with the same parsing approach used in the skip audit earlier in this branch.

**Tasks**:
- [ ] Confirm the working tree is clean (no unrelated diffs that could skew failures)
- [ ] Run `make test_e2e` end-to-end against a clean worktree
- [ ] Capture the JSON reporter output to a scratch file (e.g. `/tmp/posthog-triage.json`) for parsing
- [ ] Parse the JSON into a list of `(test title, source file, error message)` tuples for the failures
- [ ] Save the parsed failure list to a scratch file for use during triage

#### 2. Triage bucket
For each failure:
- **Property mismatch** (e.g., test asserts `withProperty("step_name", "basic_info")` but the app doesn't set that key) — inspect `src/lib/posthog.ts` to see what's actually captured, fix whichever side is wrong. Prefer fixing the test if the app's shape is a deliberate schema, prefer fixing the app if it's a clear oversight.
- **Event never fires** — check whether the user action in the test actually reaches the app instrumentation. `hero.clickPrimaryCta()` should route through whatever handler calls `trackCtaClicked("hero_primary")`. If the call site is missing, add it.
- **Race with `safeCapture` ready-gate** — if a test fires an action immediately after `goto()` and the `[PostHog] Not ready, event queued` log appears in the page console, add a `waitForPostHogReady()` helper to the analytics fixture that does `await page.waitForFunction(() => (window as any).posthog?.__loaded === true, { timeout: 5000 })` and call it at the top of affected tests.

**Tasks — classify**:
- [ ] For each failure in the parsed list, label it `property-mismatch`, `event-never-fires`, or `safeCapture-race`
- [ ] Note any failure that doesn't fit cleanly into one of those three buckets — surface it before continuing

**Tasks — property-mismatch failures**:
- [ ] For each property-mismatch failure, open `src/lib/posthog.ts` and locate the `trackX()` call site that emits the event
- [ ] Compare the test's `withProperty(...)` keys/values against the app's actual capture payload and identify which side diverges
- [ ] Decide per failure whether to fix the test or the app — prefer fixing the test when the app shape is a deliberate schema, prefer fixing the app when it's a clear oversight
- [ ] Apply the chosen fix
- [ ] Re-run just that single test (e.g. `yarn test:e2e -g "<test title>"`) to confirm it passes

**Tasks — event-never-fires failures**:
- [ ] For each "event never fires" failure, identify the user action in the test that should have triggered the event
- [ ] Trace that user action back to the corresponding handler in the app source
- [ ] Verify the handler calls the expected `trackX()` function from `src/lib/posthog.ts`
- [ ] If the `trackX()` call site is missing, add it
- [ ] Re-run that single test to confirm it passes

**Tasks — safeCapture-race failures**:
- [ ] For each suspected `safeCapture` race, look for `[PostHog] Not ready, event queued` in the test's page console output to confirm the diagnosis
- [ ] If confirmed, add a `waitForPostHogReady()` helper to `e2e/fixtures/test.ts` that calls `await page.waitForFunction(() => (window as any).posthog?.__loaded === true, { timeout: 5000 })`
- [ ] Export `waitForPostHogReady` (or expose it through the analytics fixture API) so tests can call it
- [ ] Call `waitForPostHogReady()` at the top of each test that hit the race
- [ ] Re-run each affected test to confirm it passes

#### 3. Handle out-of-scope app gaps
If triage uncovers a missing instrumentation site that requires non-trivial app-side work (e.g., "we never fire `utm_captured` on first load, only on re-visit"), **do not fix inline**. File a follow-up issue and mark that specific test with `test.fixme("TODO: #<issue-number> — app-side instrumentation missing")`. The current branch's goal is the batching fix; deferring correctness work to its own ticket keeps the diff reviewable.

**Tasks**:
- [ ] For each failure that requires non-trivial app-side instrumentation, draft a GitHub issue title and body describing the failing test, the missing event/property, and the proposed fix
- [ ] File the follow-up issues via `gh issue create`, capturing the returned issue numbers
- [ ] For each filed issue, re-apply `test.fixme("TODO: #<issue-number> — app-side instrumentation missing")` on the corresponding test (only — leave all other newly-unskipped tests untouched)
- [ ] After re-applying the targeted fixmes, re-run `make test_e2e` and confirm 0 failures (the deferred tests now skip, the rest pass)
- [ ] Run `make check` one more time to confirm typecheck and lint still pass with the targeted fixmes in place

### Success Criteria:

#### Automated Verification:
- [ ] `make test_e2e` reports 0 failed across all 3 viewport projects
- [ ] Passed count is ≥ 200 (allowing for 2-3 Phase 4 follow-up fixmes if genuinely blocked on app work)
- [ ] `make check` still passes

#### Manual Verification:
- [ ] Visual inspection of the HTML report shows the formerly-skipped tests now in the "passed" column
- [ ] Spot check one newly-passing test in each file to confirm the assertions are meaningful (not just passing because the capture array is empty and `expectNoEvent` is being used)
- [ ] Open the PostHog project in the browser and confirm the test run did NOT create a flood of session recordings (validates that `disable_session_recording: true` kicked in)

---

## Performance Considerations

- `request_batching: false` in E2E mode means one HTTP POST per `capture()` call instead of one batched POST per ~10s. A typical analytics test fires 1-4 events, so at most ~4 extra requests per test × ~20 unskipped tests = ~80 additional small POSTs per full run. Negligible against the 256 existing test instances. No impact on production.
- `toBeFired()` polls every 50ms. Even a worst-case 5s timeout is bounded and only kicks in on failure. In the happy path, events arrive within ~100ms of the triggering action, so the polling overhead is ~2 iterations per assertion.
- `disable_session_recording: true` in E2E mode means test runs do not stream rrweb snapshots to the real PostHog project. This removes a meaningful amount of cross-run noise on the production PostHog account.

## Migration Notes

- No database changes, no schema migrations.
- No production config change — the PostHog dashboard, project key, and proxy path are untouched.
- The one line added to `instrumentation-client.ts` is a runtime branch on a window flag that is `undefined` in production. Rollback is a single revert.

## References

- Original skip audit: see the "Category table" message earlier on branch `feat/102-hubspot-contact-sync` (showed Group 1 — PostHog events — as 51% of all skips).
- Existing analytics helper: `e2e/utils/analytics-helper.ts`
- Existing fixture: `e2e/fixtures/test.ts`
- PostHog init: `src/instrumentation-client.ts`
- PostHog instrumentation sites: `src/lib/posthog.ts:177,248,315,396,468,555,572,804,892,901`
- `request_batching` type definition: `node_modules/posthog-js/dist/module.d.ts:1399-1403`
- Related prior plan: `thoughts/plans/2025-11-25-posthog-analytics-integration.md`
- Top-of-file fixme rationale (what we're replacing): `e2e/features/cta-tracking.spec.ts:3-51`, `e2e/features/booking-form.spec.ts:177-203`
