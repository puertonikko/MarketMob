export default function Home() {
  return (
    <div style={{ maxWidth: 720, margin: '100px auto', textAlign: 'center', fontFamily: 'system-ui', padding: '0 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>MarketMob</h1>
      <p style={{ color: '#666', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
        Earn money promoting apps you believe in. Generate a promo code, share your link, and get paid when people you refer subscribe.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <a href="/login" style={{ background: '#111', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          Become an Affiliate
        </a>
        <a href="/request-app" style={{ background: '#fff', color: '#111', border: '1px solid #111', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          Get Your App Marketed
        </a>
      </div>
    </div>
  );
}
