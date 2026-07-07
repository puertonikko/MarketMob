'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import AppShell from '@/components/AppShell';

function genCode(email) {
  const base = (email || 'user').split('@')[0];
  return (base + Math.floor(Math.random() * 9000 + 1000)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
}
const money = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

export default function DashboardPage() {
  const sb = createClient();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [codes, setCodes] = useState([]);
  const [tiersByApp, setTiersByApp] = useState({});
  const [stats, setStats] = useState({ clicks: 0, signups: 0, conversions: 0, paid: 0, approved: 0, pending: 0, gross: 0 });
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => { load(); }, []);

  function ping(msg) { setToast(msg); clearTimeout(window.__mmT); window.__mmT = setTimeout(() => setToast(''), 1900); }

  async function fetchCodes(uid) {
    const { data } = await sb.from('promo_codes')
      .select('id, code, app_id, clicks, partner_apps(name, slug)')
      .eq('affiliate_id', uid);
    return data || [];
  }

  async function load() {
    const { data: { user: u } } = await sb.auth.getUser();
    if (!u) { window.location.href = '/login'; return; }
    setUser(u);

    const { data: prof } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
    setProfile(prof);

    const { data: apps } = await sb.from('partner_apps').select('id, name, slug').eq('status', 'approved');
    const appIds = (apps || []).map(a => a.id);

    if (appIds.length) {
      const { data: tiers } = await sb.from('app_tiers').select('app_id, tier_name, payout_cents, active').in('app_id', appIds);
      const grouped = {};
      (tiers || []).filter(t => t.active).forEach(t => { (grouped[t.app_id] ||= []).push(t); });
      setTiersByApp(grouped);
    }

    let myCodes = await fetchCodes(u.id);
    const missing = (apps || []).filter(a => !myCodes.some(c => c.app_id === a.id));
    if (missing.length) {
      await Promise.all(missing.map(a => sb.from('promo_codes').insert({ affiliate_id: u.id, app_id: a.id, code: genCode(u.email) })));
      myCodes = await fetchCodes(u.id);
    }
    setCodes(myCodes);

    const codeIds = myCodes.map(c => c.id);
    if (codeIds.length) {
      const [{ data: signups }, { data: convs }] = await Promise.all([
        sb.from('referral_signups').select('id, created_at').in('promo_code_id', codeIds).order('created_at', { ascending: false }).limit(8),
        sb.from('referral_conversions').select('id, created_at, status, payout_owed_cents, app_tiers(tier_name)').in('promo_code_id', codeIds).order('created_at', { ascending: false }),
      ]);
      const sum = (arr, f) => (arr || []).reduce((s, c) => s + (f(c) ? c.payout_owed_cents : 0), 0);
      const paid = sum(convs, c => c.status === 'paid');
      const approved = sum(convs, c => c.status === 'approved');
      const pending = sum(convs, c => c.status === 'pending');
      setStats({
        clicks: myCodes.reduce((s, c) => s + (c.clicks || 0), 0),
        signups: (signups || []).length,
        conversions: (convs || []).length,
        paid, approved, pending, gross: paid + approved + pending,
      });

      const evs = [
        ...(convs || []).slice(0, 8).map(c => ({ kind: 'conv', ts: c.created_at, status: c.status, amt: c.payout_owed_cents, tier: c.app_tiers?.tier_name })),
        ...(signups || []).map(s => ({ kind: 'signup', ts: s.created_at })),
      ].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6);
      setActivity(evs);
    }
    setLoading(false);
  }

  async function renameCode(promo) {
    const next = prompt('Choose your promo code (3–24 letters/numbers):', promo.code);
    if (!next || next.toUpperCase() === promo.code) return;
    const res = await fetch('/api/promo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, promo_code_id: promo.id, new_code: next }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) { alert(json.error || 'Could not update code'); return; }
    ping('Promo code updated'); load();
  }

  function linkFor(c) { return `${window.location.origin}/go/${c.partner_apps?.slug}-${c.code}`; }
  function copyLink(c) { navigator.clipboard?.writeText(linkFor(c)).catch(() => {}); ping('Referral link copied'); }

  const isAdmin = profile?.role === 'admin';

  if (loading) return <AppShell active="dashboard"><div className="loading">Loading…</div></AppShell>;

  const primary = codes[0];
  const tiers = primary ? (tiersByApp[primary.app_id] || []) : [];
  const rel = (n) => (stats.clicks ? Math.max(4, Math.round((n / stats.clicks) * 100)) : 0);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const avgPer = stats.conversions ? stats.gross / stats.conversions : 0;

  const s2done = stats.clicks > 0;
  const s3done = !!profile?.stripe_connect_onboarded;

  return (
    <AppShell active="dashboard" email={user?.email} isAdmin={isAdmin}>
      <div className="topbar">
        <div className="greet">
          <h1>Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}</h1>
          <p>You've earned <b className="num">{money(stats.gross)}</b> across <b className="num">{stats.conversions}</b> conversion{stats.conversions === 1 ? '' : 's'}.</p>
        </div>
        <div className="money-cta">
          <div>
            <div className="eyebrow">Available</div>
            <div className="n num">{money(stats.approved)}</div>
          </div>
          <a className="btn btn-primary" href="/dashboard/payouts">Withdraw</a>
        </div>
      </div>

      {primary ? (
        <>
          <div className="steps">
            <div className="step done">
              <div className="badge"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg></div>
              <div><h4>Grab your link</h4><p>Your unique referral link is ready below.</p></div>
            </div>
            <div className={`step ${s2done ? 'done' : 'active'}`}>
              <div className="badge">{s2done ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg> : '2'}</div>
              <div><h4>Share it</h4><p>Post it, DM it, add it to your bio. Every click is tracked.</p></div>
            </div>
            <div className={`step ${s3done ? 'done' : (s2done ? 'active' : '')}`}>
              <div className="badge">{s3done ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l5 5L20 6" /></svg> : '3'}</div>
              <div><h4>Get paid</h4><p><a href="/dashboard/payouts" className="linklike">Connect your bank</a> to cash out earnings.</p></div>
            </div>
          </div>

          <div className="grid-2">
            <section className="card link-card">
              <div className="card-h"><h3>Your referral link — {primary.partner_apps?.name}</h3><span className="eyebrow">Live</span></div>
              <div className="card-b">
                <div className="promo-row">
                  <span className="eyebrow">Your code</span>
                  <span className="promo-chip">{primary.code}
                    <button onClick={() => renameCode(primary)} title="Rename code" aria-label="Rename code"><svg viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></button>
                  </span>
                </div>
                <div className="linkbox">
                  <div className="link-field">
                    <span className="url"><span className="host">{typeof window !== 'undefined' ? window.location.host : ''}/go/</span>{primary.partner_apps?.slug}-<b>{primary.code}</b></span>
                  </div>
                  <button className="btn btn-primary copy-btn" onClick={() => copyLink(primary)}>
                    <svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                    Copy link
                  </button>
                </div>
                <div className="share">
                  <span>Share to</span>
                  <a className="share-btn" title="X" target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check this out: ' + linkFor(primary))}`}><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5-6.6L5.3 22H2l7.7-8.9L1 2h6.9l4.6 6.1Zm-1.2 18h1.7L7.2 3.8H5.4Z" /></svg></a>
                  <a className="share-btn" title="WhatsApp" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(linkFor(primary))}`}><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.2-.9-.3-1.6-.6-2.7-1.2-4.5-4-4.6-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.1.1.3 0 .5l-.4.5c-.2.2-.3.3-.1.6.2.3.9 1.4 1.9 2.3 1.3 1.1 2.3 1.5 2.6 1.6.3.1.5.1.6-.1l.7-.9c.2-.2.4-.2.6-.1l1.8.9c.3.1.4.2.5.3 0 .2 0 .7-.2 1.3Z" /></svg></a>
                  <a className="share-btn" title="Email" href={`mailto:?subject=${encodeURIComponent('You should try ' + primary.partner_apps?.name)}&body=${encodeURIComponent(linkFor(primary))}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg></a>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-h"><h3>Earnings</h3><span className="eyebrow">All-time</span></div>
              <div className="card-b">
                <div className="earn-split">
                  <div><div className="k"><span className="dot" style={{ background: 'var(--accent)' }} />Paid out</div><div className="v num" style={{ color: 'var(--accent)' }}>{money(stats.paid)}</div></div>
                  <div><div className="k"><span className="dot" style={{ background: 'var(--pending)' }} />Owed to you</div><div className="v num" style={{ color: 'var(--pending)' }}>{money(stats.approved + stats.pending)}</div></div>
                </div>
                <div className="eyebrow" style={{ marginBottom: 9 }}>What you earn per subscription</div>
                <div className="tiers">
                  {tiers.length ? tiers.map(t => (
                    <div className="tier" key={t.tier_name}>
                      <div><div className="name" style={{ textTransform: 'capitalize' }}>{t.tier_name}</div><div className="sub">Per approved conversion</div></div>
                      <div className="pay num">{money(t.payout_cents)}</div>
                    </div>
                  )) : <div className="empty">Payout tiers coming soon.</div>}
                </div>
              </div>
            </section>
          </div>

          <div className="sec-title"><h2>Your funnel</h2><span className="eyebrow">All-time</span></div>
          <section className="card">
            <div className="card-b">
              <div className="funnel">
                <div className="stage">
                  <div className="lab"><span className="dot" style={{ background: 'var(--traffic)' }} />Clicks</div>
                  <div className="val num">{stats.clicks}</div>
                  <div className="bar"><i style={{ width: '100%', background: 'var(--traffic)' }} /></div>
                </div>
                <div className="conn"><span className="rate">{pct(stats.signups, stats.clicks)}%</span></div>
                <div className="stage">
                  <div className="lab"><span className="dot" style={{ background: 'var(--traffic)' }} />Signups</div>
                  <div className="val num">{stats.signups}</div>
                  <div className="bar"><i style={{ width: rel(stats.signups) + '%', background: 'var(--traffic)' }} /></div>
                </div>
                <div className="conn"><span className="rate">{pct(stats.conversions, stats.signups)}%</span></div>
                <div className="stage">
                  <div className="lab"><span className="dot" style={{ background: 'var(--accent)' }} />Conversions</div>
                  <div className="val num">{stats.conversions}</div>
                  <div className="bar"><i style={{ width: rel(stats.conversions) + '%', background: 'var(--accent)' }} /></div>
                </div>
                <div className="conn"><span className="rate">{money(avgPer)}/ea</span></div>
                <div className="stage">
                  <div className="lab"><span className="dot" style={{ background: 'var(--accent)' }} />Earned</div>
                  <div className="val num" style={{ color: 'var(--accent)' }}>{money(stats.gross)}</div>
                  <div className="bar"><i style={{ width: rel(stats.conversions) + '%', background: 'var(--accent)' }} /></div>
                </div>
              </div>
            </div>
          </section>

          <div className="sec-title"><h2>Recent activity</h2></div>
          <section className="card">
            <div className="card-b feed">
              {activity.length ? activity.map((e, i) => (
                <ActivityRow key={i} e={e} />
              )) : <div className="empty">No activity yet — share your link to get the funnel moving.</div>}
            </div>
          </section>
        </>
      ) : (
        <section className="card"><div className="card-b"><div className="empty">No apps are available to promote yet — check back soon.</div></div></section>
      )}

      <div className={`toast${toast ? ' show' : ''}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M20 6 9 17l-5-5" /></svg><span>{toast}</span></div>
    </AppShell>
  );
}

function ActivityRow({ e }) {
  const when = new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (e.kind === 'signup') {
    return (
      <div className="ev">
        <div className="ev-ic" style={{ background: 'var(--traffic-soft)', color: 'var(--traffic)' }}>
          <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
        </div>
        <div className="ev-tx"><b>New signup</b><small>Referred via your link · {when}</small></div>
        <span className="pill pill-info">Signup</span>
      </div>
    );
  }
  const paid = e.status === 'paid', pend = e.status === 'pending';
  const color = paid ? 'var(--accent)' : pend ? 'var(--pending)' : 'var(--accent)';
  const soft = paid ? 'var(--accent-soft)' : pend ? 'var(--pending-soft)' : 'var(--accent-soft)';
  return (
    <div className="ev">
      <div className="ev-ic" style={{ background: soft, color }}>
        <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
      </div>
      <div className="ev-tx">
        <b>Conversion{e.tier ? ` — ${e.tier}` : ''}</b>
        <small>{pend ? 'Pending admin approval' : paid ? 'Paid out' : 'Approved — awaiting payout'} · {when}</small>
      </div>
      <div className="ev-amt" style={{ color }}>+{money(e.amt)}</div>
    </div>
  );
}
