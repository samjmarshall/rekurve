import posthog from "posthog-js";
import { env } from "./env";

declare global {
  interface Window {
    __E2E_MODE__?: boolean;
  }
}

const isE2E = typeof window !== "undefined" && window.__E2E_MODE__ === true;

// Playwright E2E mode: tap into PostHog's `before_send` hook to record every
// captured event via `console.info("[E2E:captured]..." )`. The test harness
// (e2e/utils/analytics-helper.ts) listens to page console messages and
// accumulates events in a Node-side array that survives page navigations.
//
// Why not network interception: Playwright can't read fetch() Blob bodies
// for PostHog's gzip-js payloads, so intercepting `/rk/e/` POSTs yields
// null bodies.
//
// Why not a window-scoped array: any `router.push(...)` after a capture
// (e.g. `login_success` → `/dashboard`) throws away the document and
// clears any window-scoped storage before the test can read it. Emitting
// via console.info pushes events to the Playwright process, which outlives
// individual documents.
//
// `opt_out_useragent_filter` bypasses PostHog's bot detection (which would
// otherwise silently drop every event because Playwright sets
// navigator.webdriver = true). Session recording is disabled to keep test
// traffic out of the real PostHog project.
posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: "/rk",
  ui_host: "https://us.posthog.com",
  person_profiles: "identified_only",
  defaults: "2025-05-24",
  ...(isE2E && {
    disable_session_recording: true,
    opt_out_useragent_filter: true,
    before_send: (captureResult) => {
      if (captureResult) {
        try {
          console.info(
            `[E2E:captured]${JSON.stringify({
              event: captureResult.event,
              properties: captureResult.properties,
            })}`,
          );
        } catch {
          // JSON.stringify can fail on circular refs in properties — ignore.
        }
      }
      return captureResult;
    },
  }),
});

// Stamp every E2E-originated event with an `is_e2e` super property. register()
// persists this client-side and auto-attaches it to ALL subsequent captures, so
// a PostHog alert destination can exclude test traffic with a single
// `is_e2e is not true` filter — keeping events ingesting (the console bridge
// above still asserts them) while preventing sales/support alerts from firing
// for Playwright runs against the production host. Must run AFTER posthog.init()
// or it is a no-op (persistence isn't initialized yet).
if (isE2E) {
  posthog.register({ is_e2e: true });
}
