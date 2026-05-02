import { Client } from "@hubspot/api-client";
import { env } from "~/env";

if (env.HUBSPOT_MOCK === "true" && env.NODE_ENV === "production") {
  throw new Error("HUBSPOT_MOCK must not be set in production");
}

// keep eager init — @hubspot/api-client constructor does no I/O
export const hubspot = new Client({
  accessToken: env.HUBSPOT_ACCESS_TOKEN,
  numberOfApiCallRetries: 3,
});
