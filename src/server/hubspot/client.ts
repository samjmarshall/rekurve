import { Client } from "@hubspot/api-client";
import { env } from "~/env";

export const hubspot = new Client({
  accessToken: env.HUBSPOT_ACCESS_TOKEN,
  numberOfApiCallRetries: 3,
});
