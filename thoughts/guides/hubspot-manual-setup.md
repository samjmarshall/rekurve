# HubSpot Manual Setup Guide

One-time setup steps for the HubSpot integration. These must be completed
before the contact sync features will work correctly.

## Prerequisites

- Admin access to the HubSpot account
- The Rekurve app's HubSpot private app already created (Epic 1)
- `HUBSPOT_ACCESS_TOKEN` and `HUBSPOT_CLIENT_SECRET` set in the environment
- The private app must have the following scopes enabled (under
  **Settings** -> **Integrations** -> **Private Apps** -> **Rekurve** -> **Scopes**):
  - `crm.objects.contacts.read`
  - `crm.objects.contacts.write`
  - `crm.schemas.contacts.write` (required by `make hubspot_setup` to create
    the Rekurve property group and custom properties)

---

## Step 1: Provision Custom Properties

Run the automated setup script. This creates the "Rekurve" property group and
all 7 custom contact properties. The script is idempotent -- safe to run
multiple times.

```bash
make hubspot_setup
```

This provisions:

| Property | Type | Options |
|----------|------|---------|
| `preferred_contact_time` | Dropdown select | weekdays, weekends, anytime |
| `land_width` | Single-line text | -- |
| `land_depth` | Single-line text | -- |
| `lead_score` | Number | -- |
| `lead_stage` | Dropdown select | unqualified, nurture, warm, hot |
| `notes` | Multi-line text | -- |
| `lead_source` | Dropdown select | walk_in, referral, social, web, other |

### Verify Existing Properties

The following custom properties should already exist from Epic 1. If any are
missing, create them manually in the HubSpot UI under the **Rekurve** group:

- `has_land` -- Dropdown select: `true` / `false`
- `land_registered` -- Dropdown select: `true` / `false`
- `land_address` -- Single-line text
- `land_size_sqm` -- Single-line text
- `property_type` -- Dropdown select: `single_storey`, `double_storey`, `investment`, `upsize`, `downsize`, `first_home_buyer`
- `budget` -- Single-line text
- `seen_broker` -- Dropdown select: `true` / `false`
- `construction_timeline` -- Dropdown select: `ready_now`, `3_6_months`, `12_months_plus`
- `resolve_finance_opted_in` -- Dropdown select: `true` / `false`

---

## Step 2: Configure Webhook Subscriptions

1. Go to **Settings** -> **Integrations** -> **Private Apps**
2. Select the Rekurve private app
3. Go to the **Webhooks** tab
4. Set the **Target URL** to: `https://<your-domain>/api/hubspot/webhook`

### 2.1 Subscribe to Contact Creation

1. Click **Create subscription**
2. Object: **Contact**
3. Event type: **Created**
4. Click **Save**

### 2.2 Subscribe to Contact Property Changes

1. Click **Create subscription**
2. Object: **Contact**
3. Event type: **Property changed**
4. Leave the property filter empty (subscribes to ALL property changes -- the
   webhook handler filters to mapped properties server-side)
5. Click **Save**

### 2.3 Subscribe to Contact Deletion

1. Click **Create subscription**
2. Object: **Contact**
3. Event type: **Deleted**
4. Click **Save**

### 2.4 Activate Subscriptions

1. Ensure all three subscriptions show status **Active**
2. If using a staging environment, verify the target URL is reachable from
   the internet (HubSpot cannot reach localhost)

---

## Step 3: Verify the Integration

### Outbound (App -> HubSpot)

1. Create a new lead in the app with all fields filled
2. Open HubSpot -> Contacts -> find the contact by name
3. Verify all Rekurve properties are populated
4. Check the lead record in the app has a `hubspotContactId`

### Inbound (HubSpot -> App)

1. Edit the contact's phone number directly in HubSpot
2. Wait ~30 seconds for the webhook to fire
3. Refresh the lead in the app -- phone number should be updated
4. Delete the contact in HubSpot
5. Verify the lead is removed from the app

---

## Troubleshooting

- **Webhook not firing**: Check the subscription is Active, and the target URL
  is publicly reachable. HubSpot shows delivery logs under the Webhooks tab.
- **401 on webhook**: Verify `HUBSPOT_CLIENT_SECRET` matches the app's client
  secret (not the access token).
- **Properties not syncing**: Verify the internal names match exactly (case-
  sensitive). Use the HubSpot API to check:
  `GET /crm/v3/properties/contacts/<property_name>`
- **Duplicate contacts**: The dedup check searches by email first, then phone.
  If a contact has neither, a duplicate may be created. Add email or phone to
  avoid this.
