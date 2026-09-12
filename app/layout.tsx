import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VincentsVibeRoller - shared 3D dice',
  icons: { icon: '/app-icon.png', apple: '/app-icon.png' },
  description: 'Shared D&D dice rooms and transparent overlays.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Applies a saved theme before paint so switching pages/reloading never flashes the default theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=JSON.parse(localStorage.getItem('rollparty:settings')||'null');var t=s&&s.theme;if(t==='drakkenheim'||t==='miro-light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
