import type { Metadata, Viewport } from 'next';
import { Header, Footer, OfflineIndicator } from '@/components/layout';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Trust Census - Privacy-First Data Collection',
    template: '%s | Trust Census',
  },
  description: 'A trust-first, privacy-by-design census data collection system for India. Built to make misuse architecturally impossible.',
  keywords: ['census', 'privacy', 'trust', 'government', 'India', 'data collection'],
  authors: [{ name: 'Trust Census Team' }],
  creator: 'Trust Census Team',
  publisher: 'Government of India',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Trust Census',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://trust-census.gov.in',
    siteName: 'Trust Census',
    title: 'Trust Census - Privacy-First Data Collection',
    description: 'A trust-first, privacy-by-design census data collection system for India.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trust Census - Privacy-First Data Collection',
    description: 'A trust-first, privacy-by-design census data collection system for India.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#102a43',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <OfflineIndicator />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

// Service Worker Registration Component
function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                  console.log('SW registered: ', registration);
                })
                .catch(function(error) {
                  console.log('SW registration failed: ', error);
                });
            });
          }
        `,
      }}
    />
  );
}
