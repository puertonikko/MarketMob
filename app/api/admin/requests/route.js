import { adminClient, createPartnerApp } from '@/lib/admin';

// POST /api/admin/requests
// Body: { admin_user_id, request_id, action: 'approve' | 'reject' }
// Approves an app request (creating the partner app) or rejects it.
// ADMIN ONLY.
export async function POST(req) {
  try {
    const { admin_user_id, request_id, action } = await req.json();
    if (!request_id) return Response.json({ ok: false, error: 'request_id is required' }, { status: 400 });

    const sb = await adminClient(admin_user_id);
    if (!sb) return Response.json({ ok: false, error: 'Not authorized' }, { status: 403 });

    if (action === 'reject') {
      const { error } = await sb.from('app_requests').update({ status: 'rejected' }).eq('id', request_id);
      if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });
      return Response.json({ ok: true });
    }

    const { data: r } = await sb.from('app_requests').select('*').eq('id', request_id).maybeSingle();
    if (!r) return Response.json({ ok: false, error: 'Request not found' }, { status: 404 });

    const app = await createPartnerApp(sb, {
      name: r.app_name,
      website_url: r.website_url,
      description: r.description,
      requested_by_email: r.contact_email,
    });
    await sb.from('app_requests').update({ status: 'approved' }).eq('id', request_id);

    return Response.json({ ok: true, app });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
