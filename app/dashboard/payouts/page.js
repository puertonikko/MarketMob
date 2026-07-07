'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import AppShell from '@/components/AppShell';

const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

export default function PayoutsPage() {
  const sb = createClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) { window.location.href = '/login'; return; }
    setUser(u);

    const { data: p } = await sb.from('profiles').select('*').eq('id', u.id).single();
    setProfile(p);

    const { data: po } = await sb.from('payouts').select('*').eq('affiliate_id', u.id).order('created_at', { ascending: false });
    setPayouts(po || []);
    setLoading(false);
  }

  async function connectAccount() {
    const r = await fetch('/api/stripe/connect-onboard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, email: user.email }),
    });
    const data = await r.json();
    if (data.ok) window.location.href = data.url;
    else alert('Error: ' + data.error);
  }

  const isAdmin = profile?.role === 'admin';
  const connected = !!profile?.stripe_connect_account_id;

  if (loading) return <AppShell active="payouts"><div className="loading">Loading…</div></AppShell>;

  return (
    <AppShell active="payouts" email={user?.email} isAdmin={isAdmin}>
      <div className="topbar"><div className="greet"><h1>Payouts</h1><p>Connect a bank account and track what you've been paid.</p></div></div>

      <section className="card" style={{ marginBottom: 26 }}>
        <div className="card-b">
          {connected ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--accent)' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5" /></svg>
                  Payout account connected
                </div>
                <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>You're all set to receive payouts via Stripe.</p>
              </div>
              <button onClick={connectAccount} className="btn btn-ghost btn-sm">Update details</button>
            </div>
          ) : (
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>Connect a payout account</h3>
              <p className="muted" style={{ fontSize: 13.5, margin: '0 0 16px', maxWidth: 460 }}>
                Connect a bank account through Stripe so we can pay out your earnings. It takes about two minutes and is required before your first withdrawal.
              </p>
              <button onClick={connectAccount} className="btn btn-primary">
                <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                Connect with Stripe
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="sec-title"><h2>Payout history</h2></div>
      <div className="stack">
        {payouts.map(p => (
          <div className="card" key={p.id}>
            <div className="card-b" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
              <div>
                <div className="num" style={{ fontWeight: 750, fontSize: 17 }}>{money(p.amount_cents)}</div>
                <div className="muted" style={{ fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              </div>
              <span className={`pill ${p.status === 'paid' ? 'pill-good' : p.status === 'failed' ? 'pill-warn' : 'pill-info'}`}>{p.status}</span>
            </div>
          </div>
        ))}
        {!payouts.length && (
          <section className="card"><div className="card-b"><div className="empty">No payouts yet. Earnings appear here once conversions are approved and paid out.</div></div></section>
        )}
      </div>
    </AppShell>
  );
}
