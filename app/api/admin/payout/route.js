import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/admin/payout
// Body: { affiliate_id, admin_user_id }
// Sums all 'approved' (not yet paid) conversions for this affiliate,
// sends a Stripe transfer, and marks them paid.
// ADMIN ONLY — checks admin_user_id has role='admin' before proceeding.
export async function POST(req) {
  try {
    const { affiliate_id, admin_user_id } = await req.json();
    const sb = createServiceClient();

    const { data: admin } = await sb.from('profiles').select('role').eq('id', admin_user_id).maybeSingle();
    if (admin?.role !== 'admin') {
      return Response.json({ ok: false, error: 'Not authorized' }, { status: 403 });
    }

    const { data: affiliate } = await sb.from('profiles').select('stripe_connect_account_id, stripe_connect_onboarded').eq('id', affiliate_id).maybeSingle();
    if (!affiliate?.stripe_connect_account_id) {
      return Response.json({ ok: false, error: 'Affiliate has not connected a payout account' }, { status: 400 });
    }

    // Get all approved, unpaid conversions for this affiliate's codes
    const { data: codes } = await sb.from('promo_codes').select('id').eq('affiliate_id', affiliate_id);
    const codeIds = (codes || []).map(c => c.id);

    const { data: conversions } = await sb
      .from('referral_conversions')
      .select('id, payout_owed_cents')
      .in('promo_code_id', codeIds)
      .eq('status', 'approved');

    if (!conversions?.length) {
      return Response.json({ ok: false, error: 'No approved conversions to pay out' }, { status: 400 });
    }

    const totalCents = conversions.reduce((s, c) => s + c.payout_owed_cents, 0);
    const conversionIds = conversions.map(c => c.id);

    const transfer = await stripe.transfers.create({
      amount: totalCents,
      currency: 'usd',
      destination: affiliate.stripe_connect_account_id,
    });

    const { data: payout } = await sb.from('payouts').insert({
      affiliate_id,
      amount_cents: totalCents,
      stripe_transfer_id: transfer.id,
      status: 'paid',
      conversion_ids: conversionIds,
      paid_at: new Date().toISOString(),
    }).select().single();

    await sb.from('referral_conversions').update({ status: 'paid' }).in('id', conversionIds);

    return Response.json({ ok: true, payout, amount: totalCents / 100 });
  } catch (e) {
    console.error('Payout error:', e);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
