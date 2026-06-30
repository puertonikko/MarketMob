'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function DashboardPage() {
  const sb = createClient();
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [myCodes, setMyCodes] = useState([]);
  const [stats, setStats] = useState({ clicks: 0, signups: 0, conversions: 0, earned: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) { window.location.href = '/login'; return; }
    setUser(u);

    const { data: appsData } = await sb
      .from('partner_apps')
      .select('id, name, slug, logo_url, website_url')
      .eq('status', 'approved');
    setApps(appsData || []);

    const { data: codes } = await sb
      .from('promo_codes')
      .select('id, code, app_id, clicks, partner_apps(name, slug)')
      .eq('affiliate_id', u.id);
    setMyCodes(codes || []);

    const codeIds = (codes || []).map(c => c.id);
    if (codeIds.length) {
      const { data: signups } = await sb.from('referral_signups').select('id').in('promo_code_id', codeIds);
      const { data: conversions } = await sb.from('referral_conversions').select('payout_owed_cents, status').in('promo_code_id', codeIds);

      const earned = (conversions || []).filter(c => c.status === 'paid').reduce((s, c) => s + c.payout_owed_cents, 0);
      const pending = (conversions || []).filter(c => c.status !== 'paid').reduce((s, c) => s + c.payout_owed_cents, 0);
      const totalClicks = (codes || []).reduce((s, c) => s + (c.clicks || 0), 0);

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

  async function generateCode(appId) {
    const codeWord = (user.email.split('@')[0] + Math.floor(Math.random() * 9000 + 1000)).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const { error } = await sb.from('promo_codes').insert({ affiliate_id: user.id, app_id: appId, code: codeWord });
    if (error) { alert('Could not generate code: ' + error.message); return; }
    load();
  }

  if (loading) return <div style={{ padding: 40, color: '#999' }}>Loading...</div>;

  const appsWithoutCode = apps.filter(a => !myCodes.some(c => c.app_id === a.id));

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
              <div style={{ fontSize: 13, color: '#666', fontFamily: 'monospace' }}>{c.code}</div>
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
        {!myCodes.length && <div style={{ color: '#999', fontSize: 13 }}>You haven't generated any codes yet — pick an app below.</div>}
      </div>

      {/* Apps you can generate codes for */}
      {appsWithoutCode.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Generate a Code</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {appsWithoutCode.map(a => (
              <div key={a.id} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700 }}>{a.name}</div>
                <button
                  onClick={() => generateCode(a.id)}
                  style={{ background: '#fff', color: '#111', border: '1px solid #111', borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}
                >
                  Generate Code
                </button>
              </div>
            ))}
          </div>
        </>
      )}

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
