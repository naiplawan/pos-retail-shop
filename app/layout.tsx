import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/ui/navbar';

export const metadata: Metadata = {
  title: 'แอพจัดการร้านค้า',
  description: 'แอพจัดการร้านค้าสำหรับร้านค้าออนไลน์',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Navbar />
        <main className="pt-14 pb-16 md:pb-0 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
