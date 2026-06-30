import { createServiceClient } from '@/lib/supabase-server';
import { nanoid } from 'nanoid';

// Returns a service-role Supabase client ONLY if admin_user_id belongs to an
// admin profile, otherwise null. Admin write routes call this first so the
// service-role key (which bypasses RLS) is never used for a non-admin caller.
export async function adminClient(adminUserId) {
  if (!adminUserId) return null;
  const sb = createServiceClient();
  const { data } = await sb.from('profiles').select('role').eq('id', adminUserId).maybeSingle();
  if (data?.role !== 'admin') return null;
  return sb;
}

export function slugify(name) {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Inserts a partner app with generated API key + webhook secret and a unique
// slug, retrying with a short suffix if the slug collides. Returns the row.
export async function createPartnerApp(sb, { name, website_url, description, logo_url, requested_by_email }) {
  const base = slugify(name);
  if (!base) throw new Error('Invalid app name');

  const creds = { api_key: 'pk_' + nanoid(24), webhook_secret: 'whsec_' + nanoid(32) };
  const candidates = [base, `${base}-${nanoid(4).toLowerCase()}`, `${base}-${nanoid(6).toLowerCase()}`];

  let lastErr;
  for (const slug of candidates) {
    const { data, error } = await sb
      .from('partner_apps')
      .insert({
        name,
        slug,
        website_url,
        description: description || null,
        logo_url: logo_url || null,
        requested_by_email: requested_by_email || null,
        status: 'approved',
        ...creds,
      })
      .select()
      .single();
    if (!error) return data;
    lastErr = error;
    if (error.code !== '23505') break; // only retry on unique-violation (slug collision)
  }
  throw new Error(lastErr?.message || 'Could not create app');
}
