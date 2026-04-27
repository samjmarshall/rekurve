# Rekurve WWW

AI sales assistant for new home builders.

## Getting started

```bash
make install     # install deps
make env_pull    # pull env vars from Vercel (run make vercel_link first on a new clone)
make start       # dev server at https://www.localhost
```

## Commands

| Command | What it does |
|---|---|
| `make build` | Clean build (`rm -rf .next` + `yarn build`) |
| `make check` | Lint + typecheck |
| `make test` | Rstest unit tests |
| `make test_e2e` | Playwright E2E tests |
| `make start` | Local dev server (Vercel Portless) |

## Database migrations

Never use `drizzle-kit push`. Always use the two-step process:

```bash
yarn db:generate   # generate migration SQL in drizzle/
yarn db:migrate    # apply pending migrations
```

## Microsoft Graph setup

Email dispatch routes through each consultant's Microsoft 365 mailbox via the Microsoft Graph API. This requires a multi-tenant Azure AD app registration.

### Azure AD app registration

1. Go to [portal.azure.com](https://portal.azure.com) → Azure Active Directory → App registrations → New registration
2. Set **Supported account types** to `Accounts in any organizational directory (Any Azure AD directory - Multitenant)`
3. Add a Redirect URI: `https://www.localhost/api/auth/ms-graph/callback` (Web platform)
4. Under **Certificates & secrets**, create a client secret
5. Under **API permissions**, add delegated permissions: `Mail.Send`, `User.Read`, `offline_access`

### Environment variables

Add these to Vercel (use `--sensitive` for secrets):

```bash
vercel env add MS_GRAPH_CLIENT_ID
vercel env add MS_GRAPH_CLIENT_SECRET   # --sensitive
vercel env add MS_GRAPH_REDIRECT_URI    # e.g. https://www.localhost/api/auth/ms-graph/callback
vercel env add HUBSPOT_BCC_ADDRESS      # e.g. 12345678@bcc.hubspot.com (from HubSpot Settings → Integrations → Email)
```

### Connecting a consultant's mailbox

Navigate to `/api/auth/ms-graph/start` while logged in. This redirects to Microsoft's OAuth consent screen. After consent, the user lands at `/dashboard?ms_connected=1` and email dispatch is enabled.

The connect banner on the dashboard also appears when no token row exists for the current user.

### E2E testing with a real mailbox

Set `MS_GRAPH_TEST_ACCESS_TOKEN` in your local `.env.local` (not committed, not pushed to Vercel) to a valid Graph access token for a test mailbox. The `email-dispatch.spec.ts` E2E spec uses this token to seed the `ms_graph_tokens` table for the test user.

## HubSpot integrations

### Webhook subscriptions

The webhook endpoint at `/api/hubspot/webhook` handles:

| Subscription type | Behaviour |
|---|---|
| `contact.creation` | Upserts local lead from HubSpot contact |
| `contact.propertyChange` | Syncs mapped property changes to local lead |
| `contact.deletion` | Deletes local lead |
| `email.creation` | Reconciles `conversations.hubspotActivityId` for outbound emails sent via Graph + BCC |

To add the `email.creation` subscription: HubSpot Settings → Integrations → Private Apps → your app → Webhooks → Add subscription → `email.creation`.

### BCC ingestion address

`HUBSPOT_BCC_ADDRESS` is your portal-specific BCC address (format: `<portalId>@bcc.hubspot.com`). Find it in HubSpot Settings → Integrations → Email → BCC address. Every outbound email sent via Graph includes this address in BCC so HubSpot auto-ingests it as an email engagement on the contact's timeline.
