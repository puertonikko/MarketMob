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
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Request received</h1>
        <p style={{ color: '#666' }}>We'll review your app and reach out at {form.contact_email} once approved.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', fontFamily: 'system-ui', padding: '0 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Get Your App Marketed</h1>
      <p style={{ color: '#666', marginBottom: 28, fontSize: 13 }}>Tell us about your app. Once approved, our network of affiliates will start promoting it with custom promo codes.</p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Input label="App Name" value={form.app_name} onChange={v => setForm({ ...form, app_name: v })} required />
        <Input label="Website URL" value={form.website_url} onChange={v => setForm({ ...form, website_url: v })} required type="url" />
        <Input label="Contact Name" value={form.contact_name} onChange={v => setForm({ ...form, contact_name: v })} />
        <Input label="Contact Email" value={form.contact_email} onChange={v => setForm({ ...form, contact_email: v })} required type="email" />
        <Input label="Estimated monthly signups" value={form.estimated_monthly_signups} onChange={v => setForm({ ...form, estimated_monthly_signups: v })} />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={4}
            style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #ddd', borderRadius: 6, fontFamily: 'inherit', fontSize: 13 }}
          />
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: 12 }}>{error}</div>}
        <button type="submit" style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 6, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
          Submit Request
        </button>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, required, type = 'text' }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>{label}{required && ' *'}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', marginTop: 4, padding: 10, border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
      />
    </div>
  );
}
