'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function RequestAppPage() {
  const sb = createClient();
  const [form, setForm] = useState({ app_name: '', website_url: '', contact_email: '', contact_name: '', description: '', estimated_monthly_signups: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    const { error } = await sb.from('app_requests').insert(form);
    if (error) { setError(error.message); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="centered">
        <div className="auth-card center">
          <div className="brand-mark" style={{ margin: '0 auto 14px' }}>M</div>
          <h1 style={{ margin: '0 0 10px' }}>Request received</h1>
          <p className="muted" style={{ fontSize: 14 }}>We'll review {form.app_name || 'your app'} and reach out at {form.contact_email} once it's approved.</p>
          <a href="/" className="linklike" style={{ display: 'inline-block', marginTop: 18 }}>← Back home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="centered">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <a className="auth-brand" href="/"><div className="brand-mark">M</div><div className="brand-name">Market<span>Mob</span></div></a>
        <h1 style={{ marginBottom: 6 }}>Get your app marketed</h1>
        <p className="muted center" style={{ fontSize: 13, margin: '0 0 22px' }}>
          Tell us about your app. Once approved, our network of marketers will start promoting it with custom promo codes.
        </p>
        <form className="form" onSubmit={submit}>
          <Field label="App name" required value={form.app_name} onChange={v => setForm({ ...form, app_name: v })} />
          <Field label="Website URL" required type="url" placeholder="https://" value={form.website_url} onChange={v => setForm({ ...form, website_url: v })} />
          <Field label="Contact name" value={form.contact_name} onChange={v => setForm({ ...form, contact_name: v })} />
          <Field label="Contact email" required type="email" value={form.contact_email} onChange={v => setForm({ ...form, contact_email: v })} />
          <Field label="Estimated monthly signups" value={form.estimated_monthly_signups} onChange={v => setForm({ ...form, estimated_monthly_signups: v })} />
          <div className="field">
            <label className="label">Description</label>
            <textarea className="textarea" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <div className="msg-err">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block">Submit request</button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = 'text', placeholder }) {
  return (
    <div className="field">
      <label className="label">{label}{required && ' *'}</label>
      <input className="input" type={type} value={value} required={required} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
