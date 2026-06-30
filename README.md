# MarketMob

An affiliate / referral marketing platform for a portfolio of apps. Affiliates
generate promo codes for approved partner apps, share referral links, and get
paid via Stripe Connect when their referrals sign up and subscribe.

Built with **Next.js 14 (App Router)**, **Supabase** (Postgres + Auth + RLS),
and **Stripe Connect** (Express payouts). Deploys to **Vercel**.

---

## How it works (end to end)

1. **App owners** submit a request at `/request-app`.
2. **You (admin)** approve them in `/admin`, which auto-generates an API key and
   webhook secret for that app, and lets you define subscription tiers + the
   payout rate per tier.
3. **Affiliates** sign up at `/login`, then generate a promo code per app at
   `/dashboard`. Each code produces a referral link: `/go/<app-slug>-<CODE>`.
4. The referral link **logs the click**, then redirects to the partner's site
   with `?promo=CODE&ref=marketmob` appended.
5. The partner app fires **two webhooks** (see `INTEGRATION_GUIDE.md`) — one on
   signup, one on paid conversion. No need to share their signup endpoint.
6. You **approve conversions** in `/admin`, then trigger a **Stripe payout** to
   the affiliate. Affiliates connect their bank via Stripe Connect at
   `/dashboard/payouts`.

This is the same webhook + API-key pattern used by Rewardful, FirstPromoter,
and PartnerStack — partners add two outbound calls, nothing in their codebase
is exposed to you.

---

## Setup

### 1. Supabase
- Create a project at supabase.com.
- Open the **SQL Editor** and run the entire contents of `supabase/schema.sql`.
  This creates all tables, RLS policies, the `increment_clicks` RPC, the
  conversion-idempotency index, and the auto-profile trigger.

### 2. Environment variables
Copy `.env.example` to `.env.local` and fill in:

| Var | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (keep secret — server only) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_PUBLISHABLE_KEY` | same page |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks (after step 4) |
| `NEXT_PUBLIC_APP_URL` | your deployed URL, e.g. `https://marketmob.com` |

### 3. Run locally
```bash
npm install
npm run dev
```

### 4. Stripe Connect + webhooks
- In Stripe, enable **Connect** (Settings → Connect) and use **Express** accounts.
- Add a webhook endpoint pointing to `https://yourdomain.com/api/stripe/webhook`,
  subscribed to `account.updated` and `transfer.failed`. Copy its signing secret
  into `STRIPE_WEBHOOK_SECRET`.

### 5. Make yourself admin
After your first signup, set your row's role in the Supabase table editor:
```sql
update profiles set role = 'admin' where email = 'you@example.com';
```

### 6. Deploy
Push to GitHub, import into Vercel, add the same env vars in the Vercel project
settings, deploy.

---

## Routes

| Path | What it is |
|---|---|
| `/` | Landing page |
| `/login` | Affiliate signup / signin |
| `/request-app` | Public form for app owners to request joining |
| `/dashboard` | Affiliate dashboard — codes, stats, earnings |
| `/dashboard/payouts` | Connect bank account, payout history |
| `/admin` | Approve requests, set tiers, approve conversions, pay out |
| `/go/[ref]` | Click-tracking redirect (`appslug-CODE`) |
| `/api/track/signup` | Partner webhook: referred user signed up |
| `/api/track/conversion` | Partner webhook: referred user subscribed |
| `/api/stripe/connect-onboard` | Starts affiliate Stripe onboarding |
| `/api/stripe/webhook` | Stripe events (onboarding status, failed transfers) |
| `/api/admin/payout` | Admin triggers a payout to an affiliate |

---

## What was fixed during assembly

This repo was assembled from a partial build. The following were repaired/added:
- Added `app/layout.js`, `app/globals.css`, `next.config.js`, `jsconfig.json`
  (path alias `@/`), `.gitignore` — the app could not boot without these.
- Moved `app/dashboard/page.js` and `app/api/track/signup/route.js` from the
  package root into their correct App Router locations.
- **Fixed the click counter**: the redirect route was writing `clicks: undefined`
  (a no-op). Now calls an atomic `increment_clicks` RPC and awaits the writes
  before redirecting (serverless functions freeze on redirect otherwise).
- **Added conversion idempotency**: a unique index on `(app_id, external_user_id)`
  plus graceful duplicate handling, so a partner retrying the webhook can't
  create duplicate payouts.
- **Added the auto-profile trigger** so signup no longer depends on a
  client-side insert that RLS could block; removed that insert from `/login`.
- **Added the Stripe webhook handler** to mark affiliates onboarded and to roll
  failed transfers back to a retryable state.

---

## Known limitations / next steps

- **Admin write security**: most admin mutations in `/admin` currently run
  through the browser Supabase client. The role check is enforced client-side
  and by RLS on reads, but app approval / tier creation / conversion approval
  should be moved behind server API routes with a service-role admin check
  (the `/api/admin/payout` route already does this correctly — use it as the
  pattern). Tighten before going live.
- **Next.js version**: pinned to 14.2.33. There is an open advisory affecting
  the 14.x line; the patched track is 15.x. Upgrading to 15 is recommended but
  involves breaking changes worth testing separately.
- **Webhook auth**: partner webhooks authenticate by `api_key` in the body. For
  stronger security, add HMAC signing using the per-app `webhook_secret` already
  stored in the schema.
- **Recurring payouts**: `app_tiers.payout_type` supports `recurring_*` values
  but only `one_time` is wired up. Recurring attribution would need the partner
  to fire a conversion webhook on each renewal.
- No automated tests yet.
