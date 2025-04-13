'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, ClipboardList, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { POSIcon } from './pos-icon';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      name: 'แดชบอร์ด',
      href: '/',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: 'รายการคำสั่งซื้อ',
      href: '/checklist',
      icon: <ClipboardList className="h-5 w-5" />,
    },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background h-14 flex items-center px-4">
        <div className="flex items-center justify-between w-full">
          {/* Logo with 8-bit POS Icon */}
          <Link
            href="/"
            className="font-semibold text-lg flex items-center gap-2"
          >
            <POSIcon size={24} className="animate-pulse-slow" />
            <span className="text-center">แอพจัดการร้านค้า</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex items-center justify-center"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-14 left-0 right-0 bottom-0 bg-background z-40 md:hidden">
          <div className="flex flex-col p-4 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
