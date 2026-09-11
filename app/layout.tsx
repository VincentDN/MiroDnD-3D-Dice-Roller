import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
