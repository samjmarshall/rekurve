import { serve } from "inngest/next";

import { inngest } from "~/inngest/client";
import { functions } from "~/inngest/functions";

export const dynamic = "force-dynamic";

// Give Inngest steps headroom. Without this the route ran on Vercel's ~15s
// default, so a slow-but-completing step (e.g. a Neon cold-resume after the
// compute had autosuspended) was killed mid-flight and surfaced as `504 Vercel
// Runtime Timeout` bursts — which Inngest then retried, amplifying the burst.
// 300s is Inngest's recommended value for Vercel and the Pro-plan ceiling.
// https://www.inngest.com/docs/deploy/vercel
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions });
