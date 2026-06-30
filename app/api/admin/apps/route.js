import { adminClient, createPartnerApp } from '@/lib/admin';

// POST /api/admin/apps
// Body: { admin_user_id, name, website_url, description?, logo_url? }
// Lets the admin add an app to be marketed directly (no request form needed).
// Generates the API key + webhook secret and marks it approved immediately.
// ADMIN ONLY.
export async function POST(req) {
  try {
    const { admin_user_id, name, website_url, description, logo_url } = await req.json();
    if (!name || !website_url) {
      return Response.json({ ok: false, error: 'App name and website URL are required' }, { status: 400 });
    }

    const sb = await adminClient(admin_user_id);
    if (!sb) return Response.json({ ok: false, error: 'Not authorized' }, { status: 403 });

    const app = await createPartnerApp(sb, { name, website_url, description, logo_url });
    return Response.json({ ok: true, app });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
