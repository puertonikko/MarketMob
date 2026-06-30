import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/stripe/connect-onboard
// Body: { user_id }
// Creates (or reuses) a Stripe Connect Express account for the affiliate
// and returns an onboarding link.
export async function POST(req) {
  try {
    const { user_id, email } = await req.json();
    if (!user_id) return Response.json({ ok: false, error: 'Missing user_id' }, { status: 400 });

    const sb = createServiceClient();
    const { data: profile } = await sb.from('profiles').select('stripe_connect_account_id').eq('id', user_id).maybeSingle();

    let accountId = profile?.stripe_connect_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: { transfers: { requested: true } },
      });
      accountId = account.id;
      await sb.from('profiles').update({ stripe_connect_account_id: accountId }).eq('id', user_id);
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/payouts?refresh=true`,
      return_url: `${origin}/dashboard/payouts?onboarded=true`,
      type: 'account_onboarding',
    });

    return Response.json({ ok: true, url: link.url });
  } catch (e) {
    console.error('Connect onboarding error:', e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
