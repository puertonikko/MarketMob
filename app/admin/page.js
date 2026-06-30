'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function AdminPage() {
  const sb = createClient();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [apps, setApps] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newApp, setNewApp] = useState({ name: '', website_url: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  // POST helper — all admin writes go through server routes that use the
  // service-role key (RLS blocks these tables from the browser client) and
  // re-check that the caller is an admin.
  async function post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, admin_user_id: user?.id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
  }

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

  async function addApp(e) {
    e.preventDefault();
    if (!newApp.name || !newApp.website_url) return;
    setCreating(true);
    try {
      const { app } = await post('/api/admin/apps', newApp);
      setNewApp({ name: '', website_url: '', description: '' });
      alert(`App "${app.name}" added.\n\nAPI Key: ${app.api_key}\nWebhook Secret: ${app.webhook_secret}\n\nSend the API key to the partner with the integration guide.`);
      load();
    } catch (err) { alert(err.message); }
    finally { setCreating(false); }
  }

  async function approveRequest(req) {
    try {
      const { app } = await post('/api/admin/requests', { request_id: req.id, action: 'approve' });
      alert(`Approved! API Key: ${app.api_key}\nSend this to ${req.contact_email} along with integration docs.`);
      load();
    } catch (err) { alert(err.message); }
  }

  async function rejectRequest(id) {
    try { await post('/api/admin/requests', { request_id: id, action: 'reject' }); load(); }
    catch (err) { alert(err.message); }
  }

  async function addTier(appId) {
    const tierName = prompt('Tier name (e.g. Pro):');
    if (!tierName) return;
    const price = parseFloat(prompt('User price ($/mo):') || '0');
    const payout = parseFloat(prompt('Affiliate payout per conversion ($):') || '0');
    try {
      await post('/api/admin/tiers', {
        app_id: appId,
        tier_name: tierName,
        tier_price_cents: Math.round(price * 100),
        payout_cents: Math.round(payout * 100),
      });
      load();
    } catch (err) { alert(err.message); }
  }

  async function approveConversion(id) {
    try { await post('/api/admin/conversions', { conversion_id: id }); load(); }
    catch (err) { alert(err.message); }
  }

  if (loading) return <div style={{ padding: 40, color: '#999' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 32 }}>Admin Panel</h1>

      {/* Add a partner app directly */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Add App to Market</h2>
      <form onSubmit={addApp} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="App name *"
            value={newApp.name}
            onChange={e => setNewApp({ ...newApp, name: e.target.value })}
            required
            style={{ flex: '1 1 220px', padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
          />
          <input
            placeholder="Website URL *"
            type="url"
            value={newApp.website_url}
            onChange={e => setNewApp({ ...newApp, website_url: e.target.value })}
            required
            style={{ flex: '1 1 220px', padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
          />
        </div>
        <textarea
          placeholder="Description (optional)"
          value={newApp.description}
          onChange={e => setNewApp({ ...newApp, description: e.target.value })}
          rows={2}
          style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6, fontFamily: 'inherit', fontSize: 13 }}
        />
        <button type="submit" disabled={creating} style={{ alignSelf: 'flex-start', background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.6 : 1 }}>
          {creating ? 'Adding…' : 'Add App'}
        </button>
      </form>

      {/* Pending app requests */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Pending App Requests ({requests.length})</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {requests.map(r => (
          <div key={r.id} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14 }}>
            <div style={{ fontWeight: 700 }}>{r.app_name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{r.website_url} — {r.contact_email}</div>
            <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>{r.description}</p>
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={() => approveRequest(r)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>Approve</button>
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
        {!apps.length && <div style={{ color: '#999', fontSize: 13 }}>No apps yet. Add one above.</div>}
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
