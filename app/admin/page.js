'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import AppShell from '@/components/AppShell';

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

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
    const payout = parseFloat(prompt('Marketer payout per conversion ($):') || '0');
    try {
      await post('/api/admin/tiers', { app_id: appId, tier_name: tierName, tier_price_cents: Math.round(price * 100), payout_cents: Math.round(payout * 100) });
      load();
    } catch (err) { alert(err.message); }
  }
  async function approveConversion(id) {
    try { await post('/api/admin/conversions', { conversion_id: id }); load(); }
    catch (err) { alert(err.message); }
  }

  if (loading) return <AppShell active="admin"><div className="loading">Loading…</div></AppShell>;

  return (
    <AppShell active="admin" email={user?.email} isAdmin>
      <div className="topbar"><div className="greet"><h1>Admin</h1><p>Add apps, approve requests, set payouts, and approve conversions.</p></div></div>

      {/* Add app */}
      <div className="sec-title"><h2>Add an app to market</h2></div>
      <section className="card" style={{ marginBottom: 8 }}>
        <div className="card-b">
          <form className="form" onSubmit={addApp}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: '1 1 220px' }} placeholder="App name *" value={newApp.name} onChange={e => setNewApp({ ...newApp, name: e.target.value })} required />
              <input className="input" style={{ flex: '1 1 220px' }} placeholder="Website URL *" type="url" value={newApp.website_url} onChange={e => setNewApp({ ...newApp, website_url: e.target.value })} required />
            </div>
            <textarea className="textarea" placeholder="Description (optional)" rows={2} value={newApp.description} onChange={e => setNewApp({ ...newApp, description: e.target.value })} />
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ alignSelf: 'flex-start' }}>{creating ? 'Adding…' : 'Add app'}</button>
          </form>
        </div>
      </section>

      {/* Requests */}
      <div className="sec-title"><h2>Pending app requests</h2><span className="eyebrow">{requests.length}</span></div>
      <div className="stack">
        {requests.map(r => (
          <section className="card" key={r.id}>
            <div className="card-b">
              <div style={{ fontWeight: 700 }}>{r.app_name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{r.website_url} — {r.contact_email}</div>
              {r.description && <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{r.description}</p>}
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button onClick={() => approveRequest(r)} className="btn btn-primary btn-sm">Approve</button>
                <button onClick={() => rejectRequest(r.id)} className="btn btn-danger btn-sm">Reject</button>
              </div>
            </div>
          </section>
        ))}
        {!requests.length && <section className="card"><div className="card-b"><div className="empty">No pending requests.</div></div></section>}
      </div>

      {/* Apps */}
      <div className="sec-title"><h2>Partner apps</h2></div>
      <div className="stack">
        {apps.map(a => (
          <section className="card" key={a.id}>
            <div className="card-b">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 700 }}>{a.name}{' '}
                  <span className={`pill ${a.status === 'approved' ? 'pill-good' : 'pill-warn'}`} style={{ marginLeft: 4 }}>{a.status}</span>
                </div>
                <button onClick={() => addTier(a.id)} className="linklike">+ Add tier</button>
              </div>
              <div className="num" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>API Key: {a.api_key}</div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(a.app_tiers || []).map(t => (
                  <span key={t.id} className="pill" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)', border: '1px solid var(--line)', textTransform: 'none' }}>
                    <span style={{ textTransform: 'capitalize' }}>{t.tier_name}</span>: pay {money(t.payout_cents)}
                  </span>
                ))}
                {!(a.app_tiers || []).length && <span className="empty" style={{ padding: 0 }}>No tiers yet.</span>}
              </div>
            </div>
          </section>
        ))}
        {!apps.length && <section className="card"><div className="card-b"><div className="empty">No apps yet. Add one above.</div></div></section>}
      </div>

      {/* Conversions */}
      <div className="sec-title"><h2>Pending conversions</h2><span className="eyebrow">{conversions.length}</span></div>
      <div className="stack">
        {conversions.map(c => (
          <section className="card" key={c.id}>
            <div className="card-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{c.partner_apps?.name} — <span className="num">{c.promo_codes?.code}</span></div>
                <div className="muted" style={{ fontSize: 12 }}>Marketer: {c.promo_codes?.profiles?.email} — owes {money(c.payout_owed_cents)}</div>
              </div>
              <button onClick={() => approveConversion(c.id)} className="btn btn-primary btn-sm">Approve</button>
            </div>
          </section>
        ))}
        {!conversions.length && <section className="card"><div className="card-b"><div className="empty">Nothing pending.</div></div></section>}
      </div>
    </AppShell>
  );
}
