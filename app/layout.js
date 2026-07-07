import './globals.css';

export const metadata = {
  title: 'MarketMob',
  description: 'Earn money promoting apps. Generate promo codes, share your link, get paid when referrals subscribe.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Apply the saved theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('mm_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
