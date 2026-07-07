'use client';
import { createClient } from '@/lib/supabase-browser';

// Shared chrome for authenticated pages: left nav, brand, user chip,
// theme toggle, sign out. Pages render their own topbar + content as children.
export default function AppShell({ active, email, isAdmin, children }) {
  const sb = createClient();

  async function signOut() {
    await sb.auth.signOut();
    window.location.href = '/login';
  }

  function toggleTheme() {
    const root = document.documentElement;
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const cur = root.getAttribute('data-theme') || (dark ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('mm_theme', next); } catch (e) {}
  }

  const initials = (email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="app">
      <aside className="side">
        <a className="brand" href="/dashboard">
          <div className="brand-mark">M</div>
          <div className="brand-name">Market<span>Mob</span></div>
        </a>
        <nav className="nav">
          <a className={`nav-item${active === 'dashboard' ? ' active' : ''}`} href="/dashboard">
            <svg viewBox="0 0 24 24"><path d="M3 12l9-8 9 8" /><path d="M5 10v10h14V10" /></svg> Dashboard
          </a>
          <a className={`nav-item${active === 'payouts' ? ' active' : ''}`} href="/dashboard/payouts">
            <svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg> Payouts
          </a>
          {isAdmin && (
            <a className={`nav-item${active === 'admin' ? ' active' : ''}`} href="/admin">
              <svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5Z" /></svg> Admin
            </a>
          )}
        </nav>
        <div className="side-foot">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme" style={{ width: '100%' }}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          </button>
          <div className="user">
            <div className="avatar">{initials}</div>
            <div className="user-meta"><b>{email || 'Marketer'}</b><small>{isAdmin ? 'Admin' : 'Marketer'}</small></div>
          </div>
          <button className="linklike" onClick={signOut} style={{ textAlign: 'left', paddingLeft: 4 }}>Sign out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
