import type { Metadata } from 'next';
import './globals.css';

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
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
