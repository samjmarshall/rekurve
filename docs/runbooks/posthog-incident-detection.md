# PostHog Incident Detection Runbook

This runbook covers the PostHog detection layer for AI-Enabled Incident Response (epic #199, issue #200). It documents the existing wiring, env-var key semantics, and a "Verify install" checklist so the setup is reproducible without rediscovery.

See the design doc at `thoughts/designs/2026-04-30-ai-incident-response.md` §5.1 for the broader detection pipeline context.

---

## Architecture Map

### Client SDK

| File | What it does |
|------|-------------|
| `src/instrumentation-client.ts:31` | `posthog.init()` — project token, `api_host: "/rk"` (CDN rewrite), `person_profiles: "identified_only"`, E2E `before_send` hook |
| `src/providers/AnalyticsProvider.tsx:6` | React provider that wraps each route group and calls `analytics.session.initialize()` |
| `src/app/(login)/layout.tsx` | Mounts `AnalyticsProvider` for the login route group |
| `src/app/(website)/layout.tsx` | Mounts `AnalyticsProvider` for the website route group |
| `src/app/(application)/layout.tsx` | Mounts `AnalyticsProvider` for the app route group |
| `src/lib/posthog.ts` | ~950-line analytics wrapper — all event capture calls go through here |

### Server SDK

| File | What it does |
|------|-------------|
| `src/lib/posthog-server.ts:6` | `getPostHogServer()` — lazy PostHog Node singleton, `flushAt: 1` / `flushInterval: 0` so every capture flushes immediately |
| `src/instrumentation.ts:7` | `onRequestError` hook — runs on every unhandled server exception, extracts `distinct_id` from the `ph_phc_*_posthog` cookie, calls `posthog.captureException()` |

### Build-time source-map upload

| File | What it does |
|------|-------------|
| `next.config.ts:92` | `withPostHogConfig()` wrapper — uploads source maps to PostHog Error Tracking, gated on `CI=true`, deletes maps after upload |

### CDN rewrites (`next.config.ts:74-87`)

All PostHog ingestion traffic is proxied through the app's own domain to avoid ad-blocker drops:

| Rewrite source | Destination |
|----------------|-------------|
| `/rk/static/:path*` | `https://us-assets.i.posthog.com/static/:path*` |
| `/rk/:path*` | `https://us.i.posthog.com/:path*` |
| `/rk/decide` | `https://us.i.posthog.com/decide` |

---

## Env-Var Key Distinction

The four PostHog env vars split into two groups with different security classifications:

### Public-safe (embed in browser bundle)

| Var | Source | Used by |
|-----|--------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog dashboard → Project Settings → Project API Key | Client SDK init (`src/instrumentation-client.ts:31`), server SDK singleton (`src/lib/posthog-server.ts:7`) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Fixed to `https://us.i.posthog.com` for US region | Client init `api_host` resolves via CDN rewrite; server SDK `host` |

`NEXT_PUBLIC_POSTHOG_KEY` is a **project ingestion token**, not an API key. PostHog's canonical design treats it as public-safe — it is intentionally embedded in the browser bundle so the JS SDK can send events. It cannot be used to read data from PostHog.

### Server-only secrets (add with `--sensitive` in Vercel)

| Var | Source | Used by |
|-----|--------|---------|
| `POSTHOG_ERROR_TRACKING_API_KEY` | PostHog → Settings → Personal API Keys → create with "write source maps" scope | `withPostHogConfig` at build time (`next.config.ts:93`) — source-map upload only |
| `POSTHOG_PROJECT_ID` | PostHog dashboard → Project Settings → Project ID (numeric) | `withPostHogConfig` at build time (`next.config.ts:94`) — identifies the target project for upload |

`POSTHOG_ERROR_TRACKING_API_KEY` is a **personal API key** scoped to a single human account. It is only read at build time (`CI=true`) by `withPostHogConfig`; it is never sent to the browser or included in the runtime bundle.

---

## Verify Install Checklist

Walk through these steps on a fresh clone to confirm the detection pipe is healthy end-to-end.

### 1. Clone and bootstrap

```sh
git clone <repo>
cd rekurve
make vercel_link    # link to the Vercel project
make env_pull       # pull env vars from Vercel into .env.local
make install        # install node_modules
```

Confirm the four PostHog vars are present in `.env.local`:

```sh
grep POSTHOG .env.local
# Expected output: all four vars with non-empty values
```

### 2. Run checks

```sh
make check    # lint + typecheck — must pass before proceeding
```

### 3. Start the dev server

```sh
make start    # Vercel Portless dev server
```

The app is available at `https://rekurve.localhost`.

### 4. Verify client-side event capture

1. Open `https://rekurve.localhost` in a browser.
2. Log in with a real account (or the dev seed account).
3. Open PostHog dashboard → **Activity** (left nav).
4. Within ~30 seconds you should see events from your session with:
   - **`distinct_id`** matching your user ID (not `anon_*`) — confirms `AnalyticsProvider` called `identify` after login
   - **Project** = Rekurve (or your local project name)

If you see only anonymous events, `AnalyticsProvider` is not calling `identify`. Check that you are logged in and the relevant route group layout mounts the provider.

### 5. Verify server-side error capture

Add a deliberate exception to any route handler — for example, a tRPC procedure or API route — and call it from the browser:

```ts
// Temporary — remove after verifying
throw new Error("posthog-smoke-test");
```

1. Trigger the endpoint from the browser.
2. Open PostHog dashboard → **Error Tracking**.
3. Within ~10 seconds a new issue "posthog-smoke-test" should appear with:
   - **`distinct_id`** matching your user ID (not `anon_*`) — confirms `onRequestError` extracted the cookie correctly
   - **Properties** showing the request path

Remove the synthetic throw before committing.

### 6. Confirm source-map gate

Source maps are only uploaded during CI builds (`CI=true`). In local dev, `withPostHogConfig` is a no-op pass-through — this is intentional. Phase 2 of this runbook covers verifying the upload in CI.

---

## Out-of-Scope Alignment Notes

The original issue #200 text contained language suggesting `POSTHOG_KEY` should be server-only. This is resolved: the project token (`NEXT_PUBLIC_POSTHOG_KEY`) is public-safe by PostHog's canonical design and must remain `NEXT_PUBLIC_*` so the browser bundle can use it. The actual secret is `POSTHOG_ERROR_TRACKING_API_KEY` (personal API key), which is already server-only. No code change is needed.

Other items explicitly out of scope for this ticket:
- Provisioning the Better Stack incoming webhook URL (separate W1 ticket)
- Cross-pipe smoke test (issue #202, depends on this ticket)
- `POSTHOG_PROJECT_API_KEY` for the triage agent (Phase B Week 2)
- Alert threshold tuning (review scheduled 2026-06-10 per design §15)
- Vercel Log Drain → Better Stack (separate W1 ticket)
- Adding a single root `src/app/layout.tsx` (per-route-group is canonical App Router pattern)
- Moving `src/lib/posthog-server.ts` to `src/server/` (current location is fine)
