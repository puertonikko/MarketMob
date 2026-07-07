import { createServiceClient } from '@/lib/supabase-server';

// POST /api/promo — rename an affiliate's own promo code.
// Body: { user_id, promo_code_id, new_code }
// RLS blocks UPDATE on promo_codes from the browser client, so this runs
// server-side with the service role after verifying the code belongs to the
// caller. Codes are globally unique.
export async function POST(req) {
  try {
    const { user_id, promo_code_id, new_code } = await req.json();
    if (!user_id || !promo_code_id || !new_code) {
      return Response.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }

    const code = String(new_code).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 3 || code.length > 24) {
      return Response.json({ ok: false, error: 'Code must be 3–24 letters or numbers' }, { status: 400 });
    }

    const sb = createServiceClient();

    // Ownership check
    const { data: promo } = await sb.from('promo_codes').select('id, affiliate_id').eq('id', promo_code_id).maybeSingle();
    if (!promo || promo.affiliate_id !== user_id) {
      return Response.json({ ok: false, error: 'Not authorized' }, { status: 403 });
    }

    // Uniqueness check (friendly error before the constraint fires)
    const { data: taken } = await sb.from('promo_codes').select('id').eq('code', code).maybeSingle();
    if (taken && taken.id !== promo_code_id) {
      return Response.json({ ok: false, error: 'That code is already taken' }, { status: 409 });
    }

    const { data, error } = await sb.from('promo_codes').update({ code }).eq('id', promo_code_id).select().single();
    if (error) {
      if (error.code === '23505') return Response.json({ ok: false, error: 'That code is already taken' }, { status: 409 });
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }

    return Response.json({ ok: true, code: data.code });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
