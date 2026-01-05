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
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      name: 'รายการคำสั่งซื้อ',
      href: '/checklist',
      icon: <ClipboardList className="h-4 w-4" />,
    },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl h-14 flex items-center px-4 supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
          {/* Logo with 8-bit POS Icon */}
          <Link
            href="/"
            className="font-semibold text-base flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <POSIcon size={22} className="animate-pulse-slow" />
            <span className="hidden sm:inline">แอพจัดการร้านค้า</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary shadow-subtle'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex items-center justify-center p-1.5 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-14 left-0 right-0 bottom-0 bg-background/95 backdrop-blur-xl z-40 md:hidden">
          <div className="flex flex-col p-4 space-y-2 max-w-7xl mx-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary shadow-subtle'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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
