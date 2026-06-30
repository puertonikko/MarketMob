import { createServiceClient } from '@/lib/supabase-server';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

// GET /go/[ref]
// ref format: "APPSLUG-PROMOCODE" e.g. "synapticquant-JOHN50"
// Logs the click, increments the counter, then redirects to the partner
// app's website with the promo code appended so their signup form can read it.
export async function GET(req, { params }) {
  const { ref } = await params;
  const lastDash = ref.lastIndexOf('-');

  // Malformed ref (no dash) -> homepage
  if (lastDash === -1) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const slug = ref.slice(0, lastDash);
  const code = ref.slice(lastDash + 1);

  const sb = createServiceClient();

  const { data: app } = await sb
    .from('partner_apps')
    .select('id, website_url, status')
    .eq('slug', slug)
    .maybeSingle();

  if (!app || app.status !== 'approved') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const { data: promo } = await sb
    .from('promo_codes')
    .select('id')
    .eq('app_id', app.id)
    .eq('code', code)
    .maybeSingle();

  if (promo) {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // Log the click row and atomically bump the counter. Awaited so the
    // writes complete before the serverless function is frozen on redirect.
    await Promise.all([
      sb.from('referral_clicks').insert({
        promo_code_id: promo.id,
        ip_hash: ipHash,
        user_agent: req.headers.get('user-agent') || '',
      }),
      sb.rpc('increment_clicks', { p_promo_code_id: promo.id }),
    ]);
  }

  // Build destination safely
  let dest;
  try {
    dest = new URL(app.website_url);
  } catch {
    return NextResponse.redirect(new URL('/', req.url));
  }
  dest.searchParams.set('promo', code);
  dest.searchParams.set('ref', 'marketmob');

  return NextResponse.redirect(dest.toString());
}
