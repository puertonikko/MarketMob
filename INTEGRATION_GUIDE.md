# Crowd Marketing Platform — Integration Guide

You've been approved as a partner app. Here's how to integrate with our affiliate tracking system. This is two small webhook calls — no need to share your signup endpoint or change your existing flow.

## Your credentials
- **API Key**: `pk_xxxxxxxxxxxx` (provided by admin)
- These go in the request body of every call below.

## How it works
1. We give each affiliate a unique referral link, e.g. `https://crowdmarket.com/go/yourapp-JOHN50`
2. When someone clicks it, they land on YOUR website with `?promo=JOHN50&ref=crowdmarket` appended to the URL.
3. Capture that `promo` param when they land (store it in a cookie or hidden form field) and carry it through your signup flow.
4. When they complete signup, call our **signup webhook** (below).
5. When they convert to a paid plan, call our **conversion webhook** (below).

## Step 1 — Capture the promo code
On page load, check the URL for `?promo=CODE` and store it (cookie, localStorage, or session) so it's available when the user actually signs up — they may browse for a while first.

```javascript
const params = new URLSearchParams(window.location.search);
const promo = params.get('promo');
if (promo) localStorage.setItem('referral_promo', promo);
```

## Step 2 — Report the signup
Call this from your backend right after a new user account is created (in your existing signup handler — add one fetch call):

```
POST https://crowdmarket.com/api/track/signup
Content-Type: application/json

{
  "api_key": "pk_xxxxxxxxxxxx",
  "promo_code": "JOHN50",
  "external_user_id": "your-internal-user-id-123",
  "user_email": "user@example.com"
}
```

`external_user_id` should be your own database ID for this user — we use it to link signup and conversion events for the same person without storing extra PII.

## Step 3 — Report the conversion
Call this from your backend right after a successful subscription payment (e.g. inside your Stripe webhook handler for `checkout.session.completed`):

```
POST https://crowdmarket.com/api/track/conversion
Content-Type: application/json

{
  "api_key": "pk_xxxxxxxxxxxx",
  "promo_code": "JOHN50",
  "external_user_id": "your-internal-user-id-123",
  "tier_name": "Pro",
  "amount_paid_cents": 2000
}
```

`tier_name` must match exactly what we have configured on our end for your app's pricing tiers (e.g. "Pro", "Elite"). Let us know your tier names and prices and we'll set the affiliate payout rate for each.

## That's it
No other integration needed. We handle the dashboard, affiliate payouts, and click tracking on our side.

## Notes
- If a user signs up without a promo code, just don't call the webhook — only call it when `promo` is present.
- Failed/duplicate webhook calls are safe — we de-dupe by `external_user_id`.
- Reach out if you want a refund/chargeback to reverse a conversion — we'll mark it voided.
