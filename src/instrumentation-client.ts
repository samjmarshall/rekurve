import posthog from "posthog-js";
import { env } from "./env";

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: "/rk",
  ui_host: "https://us.posthog.com",
  person_profiles: "identified_only",
  defaults: "2025-05-24",
});
