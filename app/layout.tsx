import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/ui/navbar';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner';
import { ClientProviders } from '@/components/client-providers';

export const metadata: Metadata = {
  title: 'แอพจัดการร้านค้า',
  description: 'แอพจัดการร้านค้าสำหรับร้านค้าออนไลน์',
  robots: 'noindex, nofollow', // Private app
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" dir="ltr">
      <head>
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body suppressHydrationWarning className="antialiased">
        {/* Skip to main content link for screen readers */}
        <a 
          href="#main-content" 
          className="skip-link"
          tabIndex={0}
        >
          ข้ามไปยังเนื้อหาหลัก
        </a>
        
        <ClientProviders>
          <ErrorBoundary>
            <Navbar />
            <main 
              id="main-content"
              className="pt-20 pb-16 md:pb-0 min-h-screen bg-gray-50"
              role="main"
              aria-label="เนื้อหาหลักของแอปพลิเคชัน"
            >
              {children}
            </main>
            <Toaster position="top-right" />
          </ErrorBoundary>
        </ClientProviders>
      </body>
    </html>
  );
}
