export default function Home() {
  return (
    <div className="land">
      <nav className="land-nav">
        <a className="brand" href="/">
          <div className="brand-mark">M</div>
          <div className="brand-name">Market<span>Mob</span></div>
        </a>
        <a className="btn btn-ghost btn-sm" href="/login">Sign in</a>
      </nav>

      <header className="land-hero">
        <div className="land-badge">◆ Get paid to promote</div>
        <h1>Turn your audience into <span>income</span>.</h1>
        <p>
          MarketMob pays you real cash for promoting apps people love. Grab your
          unique link, share it, and earn every time someone you referred subscribes —
          tracked click-by-click, paid straight to your bank.
        </p>
        <div className="land-actions">
          <a className="btn btn-primary" href="/login">Start earning</a>
          <a className="btn btn-ghost" href="/request-app">Get your app marketed</a>
        </div>
      </header>

      <section className="land-features">
        <div className="feature">
          <div className="fn">1</div>
          <h3>Grab your link</h3>
          <p>Every marketer gets a unique promo code and referral link the moment they join. Rename it to whatever you like.</p>
        </div>
        <div className="feature">
          <div className="fn">2</div>
          <h3>Share it anywhere</h3>
          <p>Post it, DM it, drop it in your bio. Every click, signup, and conversion is tracked back to you automatically.</p>
        </div>
        <div className="feature">
          <div className="fn">3</div>
          <h3>Get paid</h3>
          <p>Connect your bank once. When your referrals subscribe and we approve the conversion, you cash out via Stripe.</p>
        </div>
      </section>
    </div>
  );
}
