import { createServiceClient } from '@/lib/supabase-server';

// POST /api/track/conversion
// Partner app calls this when a referred user subscribes/pays.
//
// Body: {
//   api_key: string,
//   external_user_id: string,   // the app's user id — must match /api/track/signup
//   tier_name: string,          // matches app_tiers.tier_name for this app
//   promo_code?: string,        // optional; recovered from the signup if absent
//   amount_paid_cents?: number  // optional, for record-keeping
// }
//
// Attribution is anchored to external_user_id, not the browser: if promo_code
// is missing or unknown (e.g. the buyer paid on a different device than they
// signed up on), we recover it from the user's original signup record.
export async function POST(req) {
  try {
    const body = await req.json();
    const { api_key, promo_code, external_user_id, tier_name, amount_paid_cents } = body;

    if (!api_key || !external_user_id || !tier_name) {
      return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sb = createServiceClient();

    const { data: app } = await sb
      .from('partner_apps')
      .select('id, status')
      .eq('api_key', api_key)
      .maybeSingle();

    if (!app) return Response.json({ ok: false, error: 'Invalid API key' }, { status: 401 });
    if (app.status !== 'approved') return Response.json({ ok: false, error: 'App not approved' }, { status: 403 });

    // The original signup: used to link the funnel AND to recover the promo
    // code if the app didn't send one this time.
    const { data: signup } = await sb
      .from('referral_signups')
      .select('id, promo_code_id')
      .eq('app_id', app.id)
      .eq('external_user_id', external_user_id)
      .maybeSingle();

    // Resolve the promo code: prefer what the app sent, else fall back to the
    // signup's code.
    let promoId = null;
    if (promo_code) {
      const { data: promo } = await sb
        .from('promo_codes')
        .select('id')
        .eq('app_id', app.id)
        .eq('code', promo_code)
        .maybeSingle();
      promoId = promo?.id || null;
    }
    if (!promoId && signup?.promo_code_id) promoId = signup.promo_code_id;

    if (!promoId) {
      return Response.json({ ok: false, error: 'No promo code and no referred signup to attribute to' }, { status: 404 });
    }

    // Find payout rate for this tier
    const { data: tier } = await sb
      .from('app_tiers')
      .select('id, payout_cents, active')
      .eq('app_id', app.id)
      .eq('tier_name', tier_name)
      .maybeSingle();

    if (!tier || !tier.active) {
      return Response.json({ ok: false, error: 'Unknown or inactive tier' }, { status: 404 });
    }

    const { error } = await sb.from('referral_conversions').insert({
      referral_signup_id: signup?.id || null,
      promo_code_id: promoId,
      app_id: app.id,
      app_tier_id: tier.id,
      external_user_id,
      amount_paid_cents: amount_paid_cents || null,
      payout_owed_cents: tier.payout_cents,
      status: 'pending', // admin approves before it's eligible for payout
    });

    if (error) {
      // Idempotent: a retry for the same (app, external_user_id) hits the
      // unique index — treat as already-recorded success, not an error.
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        return Response.json({ ok: true, duplicate: true });
      }
      console.error('Conversion insert error:', error);
      return Response.json({ ok: false, error: 'Could not record conversion' }, { status: 500 });
    }

    return Response.json({ ok: true, payout_owed_cents: tier.payout_cents });
  } catch (e) {
    console.error('Webhook conversion error:', e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
