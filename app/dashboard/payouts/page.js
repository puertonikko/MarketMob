'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, email: user.email }),
    });
    const data = await r.json();
    if (data.ok) window.location.href = data.url;
    else alert('Error: ' + data.error);
  }

  if (loading) return <div style={{ padding: 40, color: '#999' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Payouts</h1>

      <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, padding: 20, marginBottom: 32 }}>
        {profile?.stripe_connect_account_id ? (
          <div>
            <div style={{ color: '#16a34a', fontWeight: 700, marginBottom: 8 }}>✓ Payout account connected</div>
            <button onClick={connectAccount} style={{ fontSize: 12, color: '#666', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
              Update account details
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Connect a payout account</div>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>You need to connect a bank account via Stripe before we can pay you. Takes about 2 minutes.</p>
            <button onClick={connectAccount} style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>
              Connect with Stripe
            </button>
          </div>
        )}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Payout History</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {payouts.map(p => (
          <div key={p.id} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>${(p.amount_cents / 100).toFixed(2)}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{new Date(p.created_at).toLocaleDateString()}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: p.status === 'paid' ? '#16a34a' : '#ea580c', textTransform: 'uppercase' }}>{p.status}</span>
          </div>
        ))}
        {!payouts.length && <div style={{ color: '#999', fontSize: 13 }}>No payouts yet.</div>}
      </div>
    </div>
  );
}
