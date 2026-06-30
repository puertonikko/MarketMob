import { createServiceClient } from '@/lib/supabase-server';

// POST /api/track/conversion
// Partner app calls this when a referred user subscribes/pays.
//
// Body: {
//   api_key: string,
//   promo_code: string,
//   external_user_id: string,   // must match what was sent in /api/track/signup
//   tier_name: string,          // matches app_tiers.tier_name for this app
//   amount_paid_cents: number   // optional, for record-keeping
// }
export async function POST(req) {
  try {
    const body = await req.json();
    const { api_key, promo_code, external_user_id, tier_name, amount_paid_cents } = body;

    if (!api_key || !promo_code || !external_user_id || !tier_name) {
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

    const { data: promo } = await sb
      .from('promo_codes')
      .select('id')
      .eq('app_id', app.id)
      .eq('code', promo_code)
      .maybeSingle();

    if (!promo) return Response.json({ ok: false, error: 'Unknown promo code' }, { status: 404 });

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

    // Link to the original signup if it exists (for funnel tracking)
    const { data: signup } = await sb
      .from('referral_signups')
      .select('id')
      .eq('app_id', app.id)
      .eq('external_user_id', external_user_id)
      .maybeSingle();

    const { error } = await sb.from('referral_conversions').insert({
      referral_signup_id: signup?.id || null,
      promo_code_id: promo.id,
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
