import { adminClient } from '@/lib/admin';

// POST /api/admin/conversions
// Body: { admin_user_id, conversion_id }
// Approves a pending conversion so it becomes payable to the affiliate.
// ADMIN ONLY.
export async function POST(req) {
  try {
    const { admin_user_id, conversion_id } = await req.json();
    if (!conversion_id) return Response.json({ ok: false, error: 'conversion_id is required' }, { status: 400 });

    const sb = await adminClient(admin_user_id);
    if (!sb) return Response.json({ ok: false, error: 'Not authorized' }, { status: 403 });

    const { error } = await sb.from('referral_conversions').update({ status: 'approved' }).eq('id', conversion_id);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
