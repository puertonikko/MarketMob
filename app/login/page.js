'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const sb = createClient();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (mode === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return; }
      window.location.href = '/dashboard';
    } else {
      // Pin the confirmation-email redirect to THIS site's dashboard so it
      // never falls back to the Supabase Site URL (which defaults to
      // localhost). The origin must be in Supabase → Auth → Redirect URLs.
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) { setError(error.message); return; }
      // Profile row is created automatically by the on_auth_user_created trigger.
      setInfo('Check your email to confirm your account, then sign in.');
    }
  }

  return (
    <div className="auth-split">
      {/* Marketing pitch */}
      <aside className="auth-pitch">
        <a className="brand" href="/">
          <div className="brand-mark">M</div>
          <div className="brand-name">Market<span>Mob</span></div>
        </a>
        <h2 className="pitch-h">Get paid to promote apps people <em>love</em>.</h2>
        <p className="pitch-sub">
          MarketMob turns your audience into income. Grab a unique referral link,
          share it anywhere, and earn cash every time someone you referred subscribes —
          tracked automatically, paid straight to your bank.
        </p>
        <ul className="pitch-list">
          <li>
            <span className="pitch-ic"><svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6" /></svg></span>
            <div><b>Your own link, instantly</b><small>A unique promo code the moment you join — rename it to whatever you like.</small></div>
          </li>
          <li>
            <span className="pitch-ic"><svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6" /></svg></span>
            <div><b>Every click tracked</b><small>See clicks → signups → conversions in a live funnel, so you know what's working.</small></div>
          </li>
          <li>
            <span className="pitch-ic"><svg viewBox="0 0 24 24"><path d="M4 12l5 5L20 6" /></svg></span>
            <div><b>Real cash payouts</b><small>Connect your bank once and cash out earnings through Stripe.</small></div>
          </li>
        </ul>
        <div className="pitch-foot">
          <div className="pitch-stat"><div className="n">$2–$4</div><small>per subscription</small></div>
          <div className="pitch-stat"><div className="n">$0</div><small>to join</small></div>
          <div className="pitch-stat"><div className="n">2 min</div><small>to your link</small></div>
        </div>
      </aside>

      {/* Auth form */}
      <div className="auth-panel">
        <div className="auth-card">
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your marketer account'}</h1>
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="msg-err">{error}</div>}
            {info && <div className="msg-ok">{info}</div>}
            <button type="submit" className="btn btn-primary btn-block">
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
            className="linklike"
            style={{ marginTop: 16, width: '100%', textAlign: 'center', color: 'var(--ink-2)' }}
          >
            {mode === 'login' ? 'New here? Create a marketer account' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
