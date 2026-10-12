import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';
import { APP_NAME, APP_DESCRIPTION, APP_THEME_COLOR } from '@/lib/appInfo';
import { PwaSetup } from '@/components/PwaSetup';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800']
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: APP_THEME_COLOR
};

export default function RootLayout({ children }: {children: React.ReactNode;}) {
  return (
  <html className={`dark ${heebo.variable}`} lang="he" dir="rtl">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
                {/* Preload critical game assets - WebP for browsers that support it */}
        <link
        rel="preload"
        href="/assets/sprites_red_water_new.webp"
        as="image"
        type="image/webp" />

        <link
        rel="preload"
        href="/assets/water.webp"
        as="image"
        type="image/webp" />

      </head>
      <body className="bg-background text-foreground antialiased font-sans overflow-hidden">{children}
        <PwaSetup /></body>
    </html>
  );
}