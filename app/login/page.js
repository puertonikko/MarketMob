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
      // Profile row is created automatically by the on_auth_user_created
      // trigger in the database — no client-side insert needed.
      setInfo('Check your email to confirm your account, then sign in.');
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: '100px auto', fontFamily: 'system-ui', padding: '0 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
        {mode === 'login' ? 'Sign In' : 'Create Affiliate Account'}
      </h1>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
          style={{ padding: 12, border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }} />
        {error && <div style={{ color: '#dc2626', fontSize: 12 }}>{error}</div>}
        {info && <div style={{ color: '#16a34a', fontSize: 12 }}>{info}</div>}
        <button type="submit" style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ marginTop: 14, width: '100%', background: 'none', border: 'none', color: '#666', fontSize: 13, textDecoration: 'underline', cursor: 'pointer' }}>
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
