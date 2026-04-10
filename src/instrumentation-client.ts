import posthog from "posthog-js";
import { env } from "./env";

declare global {
  interface Window {
    __E2E_MODE__?: boolean;
  }
}

const isE2E = typeof window !== "undefined" && window.__E2E_MODE__ === true;

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: "/rk",
  ui_host: "https://us.posthog.com",
  person_profiles: "identified_only",
  defaults: "2025-05-24",
  // Playwright E2E mode: disable batching so captures fire immediately and can be intercepted by AnalyticsHelper. Session recording is disabled to avoid test traffic leaking to the real PostHog project.
  ...(isE2E && { request_batching: false, disable_session_recording: true }),
});
