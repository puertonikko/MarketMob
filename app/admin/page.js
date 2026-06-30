'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { nanoid } from 'nanoid';

export default function AdminPage() {
  const sb = createClient();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [apps, setApps] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) { window.location.href = '/login'; return; }
    const { data: profile } = await sb.from('profiles').select('role').eq('id', u.id).single();
    if (profile?.role !== 'admin') { window.location.href = '/dashboard'; return; }
    setUser(u);

    const { data: r } = await sb.from('app_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setRequests(r || []);

    const { data: a } = await sb.from('partner_apps').select('*, app_tiers(*)').order('created_at', { ascending: false });
    setApps(a || []);

    const { data: c } = await sb.from('referral_conversions').select('*, partner_apps(name), promo_codes(code, profiles(email))').eq('status', 'pending').order('created_at', { ascending: false });
    setConversions(c || []);

    setLoading(false);
  }

  async function approveApp(req) {
    const slug = req.app_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const apiKey = 'pk_' + nanoid(24);
    const webhookSecret = 'whsec_' + nanoid(32);

    const { error } = await sb.from('partner_apps').insert({
      name: req.app_name,
      slug,
      website_url: req.website_url,
      status: 'approved',
      api_key: apiKey,
      webhook_secret: webhookSecret,
      requested_by_email: req.contact_email,
    });
    if (error) { alert(error.message); return; }
    await sb.from('app_requests').update({ status: 'approved' }).eq('id', req.id);
    alert(`Approved! API Key: ${apiKey}\nSend this to ${req.contact_email} along with integration docs.`);
    load();
  }

  async function rejectRequest(id) {
    await sb.from('app_requests').update({ status: 'rejected' }).eq('id', id);
    load();
  }

  async function addTier(appId) {
    const tierName = prompt('Tier name (e.g. Pro):');
    if (!tierName) return;
    const price = parseFloat(prompt('User price ($/mo):') || '0');
    const payout = parseFloat(prompt('Affiliate payout per conversion ($):') || '0');
    await sb.from('app_tiers').insert({
      app_id: appId,
      tier_name: tierName,
      tier_price_cents: Math.round(price * 100),
      payout_cents: Math.round(payout * 100),
    });
    load();
  }

  async function approveConversion(id) {
    await sb.from('referral_conversions').update({ status: 'approved' }).eq('id', id);
    load();
  }

  if (loading) return <div style={{ padding: 40, color: '#999' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32 }}>Admin Panel</h1>

      {/* Pending app requests */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Pending App Requests ({requests.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {requests.map(r => (
          <div key={r.id} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14 }}>
            <div style={{ fontWeight: 700 }}>{r.app_name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{r.website_url} — {r.contact_email}</div>
            <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>{r.description}</p>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={() => approveApp(r)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>Approve</button>
              <button onClick={() => rejectRequest(r.id)} style={{ background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>Reject</button>
            </div>
          </div>
        ))}
        {!requests.length && <div style={{ color: '#999', fontSize: 13 }}>No pending requests.</div>}
      </div>

      {/* Approved apps + tiers */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Partner Apps</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {apps.map(a => (
          <div key={a.id} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700 }}>{a.name} <span style={{ fontSize: 11, color: '#999' }}>({a.status})</span></div>
              <button onClick={() => addTier(a.id)} style={{ fontSize: 12, color: '#111', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Tier</button>
            </div>
            <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace', marginTop: 4 }}>API Key: {a.api_key}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(a.app_tiers || []).map(t => (
                <span key={t.id} style={{ fontSize: 11, background: '#f3f3f3', padding: '4px 10px', borderRadius: 12 }}>
                  {t.tier_name}: pay ${(t.payout_cents/100).toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pending conversions to approve */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Pending Conversions to Approve ({conversions.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conversions.map(c => (
          <div key={c.id} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{c.partner_apps?.name} — {c.promo_codes?.code}</div>
              <div style={{ fontSize: 12, color: '#666' }}>Affiliate: {c.promo_codes?.profiles?.email} — Owes ${(c.payout_owed_cents/100).toFixed(2)}</div>
            </div>
            <button onClick={() => approveConversion(c.id)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>Approve</button>
          </div>
        ))}
        {!conversions.length && <div style={{ color: '#999', fontSize: 13 }}>Nothing pending.</div>}
      </div>
    </div>
  );
}
