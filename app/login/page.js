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
      const { error } = await sb.auth.signUp({ email, password });
      if (error) { setError(error.message); return; }
      // Profile row is created automatically by the on_auth_user_created trigger.
      setInfo('Check your email to confirm your account, then sign in.');
    }
  }

  return (
    <div className="centered">
      <div className="auth-card">
        <a className="auth-brand" href="/">
          <div className="brand-mark">M</div>
          <div className="brand-name">Market<span>Mob</span></div>
        </a>
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
  );
}
