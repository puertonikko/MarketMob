'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

// Generate a candidate promo code from the marketer's email + random digits.
function genCode(email) {
  const base = (email || 'user').split('@')[0];
  return (base + Math.floor(Math.random() * 9000 + 1000)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
}

export default function DashboardPage() {
  const sb = createClient();
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [myCodes, setMyCodes] = useState([]);
  const [tiersByApp, setTiersByApp] = useState({});
  const [stats, setStats] = useState({ clicks: 0, signups: 0, conversions: 0, earned: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function fetchCodes(uid) {
    const { data } = await sb
      .from('promo_codes')
      .select('id, code, app_id, clicks, partner_apps(name, slug)')
      .eq('affiliate_id', uid);
    return data || [];
  }

  async function load() {
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) { window.location.href = '/login'; return; }
    setUser(u);

    const { data: appsData } = await sb
      .from('partner_apps')
      .select('id, name, slug, logo_url, website_url')
      .eq('status', 'approved');
    setApps(appsData || []);

    // Payout tiers for the approved apps, so marketers can see what they earn.
    const appIds = (appsData || []).map(a => a.id);
    if (appIds.length) {
      const { data: tiers } = await sb.from('app_tiers').select('app_id, tier_name, payout_cents, active').in('app_id', appIds);
      const grouped = {};
      (tiers || []).filter(t => t.active).forEach(t => { (grouped[t.app_id] ||= []).push(t); });
      setTiersByApp(grouped);
    }

    let codes = await fetchCodes(u.id);

    // Every marketer gets a unique code automatically for each approved app
    // they don't already have one for.
    const missing = (appsData || []).filter(a => !codes.some(c => c.app_id === a.id));
    if (missing.length) {
      await Promise.all(missing.map(a =>
        sb.from('promo_codes').insert({ affiliate_id: u.id, app_id: a.id, code: genCode(u.email) })
      ));
      codes = await fetchCodes(u.id);
    }
    setMyCodes(codes);

    const codeIds = codes.map(c => c.id);
    if (codeIds.length) {
      const { data: signups } = await sb.from('referral_signups').select('id').in('promo_code_id', codeIds);
      const { data: conversions } = await sb.from('referral_conversions').select('payout_owed_cents, status').in('promo_code_id', codeIds);

      const earned = (conversions || []).filter(c => c.status === 'paid').reduce((s, c) => s + c.payout_owed_cents, 0);
      const pending = (conversions || []).filter(c => c.status !== 'paid').reduce((s, c) => s + c.payout_owed_cents, 0);
      const totalClicks = codes.reduce((s, c) => s + (c.clicks || 0), 0);

      setStats({
        clicks: totalClicks,
        signups: signups?.length || 0,
        conversions: conversions?.length || 0,
        earned: earned / 100,
        pending: pending / 100,
      });
    }
    setLoading(false);
  }

  async function renameCode(promo) {
    const next = prompt('Choose your promo code (3–24 letters/numbers):', promo.code);
    if (!next || next.toUpperCase() === promo.code) return;
    const res = await fetch('/api/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, promo_code_id: promo.id, new_code: next }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) { alert(json.error || 'Could not update code'); return; }
    load();
  }

  function payoutLabel(appId) {
    const tiers = tiersByApp[appId] || [];
    if (!tiers.length) return null;
    const amounts = tiers.map(t => t.payout_cents).sort((a, b) => a - b);
    const lo = amounts[0] / 100, hi = amounts[amounts.length - 1] / 100;
    return lo === hi ? `Earn $${lo.toFixed(2)} per subscription` : `Earn $${lo.toFixed(2)}–$${hi.toFixed(2)} per subscription`;
  }

  if (loading) return <div style={{ padding: 40, color: '#999' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>My Dashboard</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>{user?.email}</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 40 }}>
        <StatCard label="Total Clicks" value={stats.clicks} />
        <StatCard label="Signups" value={stats.signups} />
        <StatCard label="Conversions" value={stats.conversions} />
        <StatCard label="Earned (Paid)" value={`$${stats.earned.toFixed(2)}`} accent="#16a34a" />
        <StatCard label="Pending Payout" value={`$${stats.pending.toFixed(2)}`} accent="#ea580c" />
      </div>

      {/* My promo codes */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>My Promo Codes</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {myCodes.map(c => (
          <div key={c.id} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{c.partner_apps?.name}</div>
              <div style={{ fontSize: 13, color: '#666', fontFamily: 'monospace' }}>
                {c.code}
                <button onClick={() => renameCode(c)} style={{ marginLeft: 8, fontSize: 11, color: '#111', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui' }}>edit</button>
              </div>
              {payoutLabel(c.app_id) && <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>{payoutLabel(c.app_id)}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: '#999' }}>{c.clicks || 0} clicks</span>
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/go/${c.partner_apps?.slug}-${c.code}`)}
                style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}
              >
                Copy Link
              </button>
            </div>
          </div>
        ))}
        {!myCodes.length && <div style={{ color: '#999', fontSize: 13 }}>No apps are available to market yet — check back soon.</div>}
      </div>

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #eee' }}>
        <a href="/dashboard/payouts" style={{ color: '#111', fontSize: 13, textDecoration: 'underline' }}>View payout history & connect bank account →</a>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent || '#111' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{label}</div>
    </div>
  );
}
