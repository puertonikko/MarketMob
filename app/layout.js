import './globals.css';

export const metadata = {
  title: 'MarketMob',
  description: 'Earn money promoting apps. Generate promo codes, share your link, get paid when referrals subscribe.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
