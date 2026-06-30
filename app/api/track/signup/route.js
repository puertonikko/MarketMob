import { createServiceClient } from '@/lib/supabase-server';
import crypto from 'crypto';

// POST /api/track/signup
// Partner app calls this when a user signs up using a referral code.
//
// Body: {
//   api_key: string,           // the app's API key (from partner_apps.api_key)
//   promo_code: string,        // the code the user entered/came in with
//   external_user_id: string,  // partner app's own user id, for de-duping
//   user_email: string         // will be hashed before storage
// }
export async function POST(req) {
  try {
    const body = await req.json();
    const { api_key, promo_code, external_user_id, user_email } = body;

    if (!api_key || !promo_code || !external_user_id) {
      return Response.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sb = createServiceClient();

    // Verify the app via api_key
    const { data: app } = await sb
      .from('partner_apps')
      .select('id, status')
      .eq('api_key', api_key)
      .maybeSingle();

    if (!app) return Response.json({ ok: false, error: 'Invalid API key' }, { status: 401 });
    if (app.status !== 'approved') return Response.json({ ok: false, error: 'App not approved' }, { status: 403 });

    // Find the promo code for this app
    const { data: promo } = await sb
      .from('promo_codes')
      .select('id')
      .eq('app_id', app.id)
      .eq('code', promo_code)
      .maybeSingle();

    if (!promo) return Response.json({ ok: false, error: 'Unknown promo code' }, { status: 404 });

    const emailHash = user_email
      ? crypto.createHash('sha256').update(user_email.toLowerCase().trim()).digest('hex')
      : null;

    const { error } = await sb.from('referral_signups').insert({
      promo_code_id: promo.id,
      app_id: app.id,
      external_user_id,
      user_email_hash: emailHash,
    });

    // Duplicate signup (same external_user_id) is fine — unique constraint catches it
    if (error && !error.message.includes('duplicate')) {
      console.error('Signup insert error:', error);
      return Response.json({ ok: false, error: 'Could not record signup' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('Webhook signup error:', e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
