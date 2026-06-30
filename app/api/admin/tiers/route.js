import { adminClient } from '@/lib/admin';

// POST /api/admin/tiers
// Body: { admin_user_id, app_id, tier_name, tier_price_cents, payout_cents, payout_type? }
// Adds a subscription tier + affiliate payout rate to a partner app.
// ADMIN ONLY.
export async function POST(req) {
  try {
    const { admin_user_id, app_id, tier_name, tier_price_cents, payout_cents, payout_type } = await req.json();
    if (!app_id || !tier_name) {
      return Response.json({ ok: false, error: 'app_id and tier_name are required' }, { status: 400 });
    }

    const sb = await adminClient(admin_user_id);
    if (!sb) return Response.json({ ok: false, error: 'Not authorized' }, { status: 403 });

    const { data, error } = await sb
      .from('app_tiers')
      .insert({
        app_id,
        tier_name,
        tier_price_cents: Math.round(tier_price_cents || 0),
        payout_cents: Math.round(payout_cents || 0),
        payout_type: payout_type || 'one_time',
      })
      .select()
      .single();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });

    return Response.json({ ok: true, tier: data });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
