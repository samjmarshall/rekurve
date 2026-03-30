import posthog from "posthog-js";
import { env } from "./env";

posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
  person_profiles: "identified_only", // Only create profiles when identify() is called
  defaults: "2025-05-24",
});
