'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Home, Receipt, Menu, X, Store } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { POSIcon } from './pos-icon';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navItems = [
    {
      name: 'หน้าหลัก',
      href: '/',
      icon: <Home className="h-6 w-6" />,
    },
    {
      name: 'คำสั่งซื้อ',
      href: '/checklist',
      icon: <Receipt className="h-6 w-6" />,
    },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white shadow-soft h-16 flex items-center px-4">
        <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
          {/* Logo with Store Icon */}
          <Link
            href="/"
            className="font-bold text-xl flex items-center gap-3 text-gray-800 hover:text-primary transition-colors"
          >
            <div className="bg-primary/10 p-2 rounded-lg">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <span className="hidden sm:inline">ร้านค้าของคุณ</span>
            <span className="sm:hidden">ร้านค้า</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-5 py-3 rounded-xl text-base font-medium transition-all',
                  pathname === item.href
                    ? 'bg-primary text-white shadow-soft'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                )}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex items-center justify-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="เปิด/ปิดเมนู"
          >
            {mobileMenuOpen ? (
              <X className="h-7 w-7 text-gray-700" />
            ) : (
              <Menu className="h-7 w-7 text-gray-700" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu with Smooth Transition */}
      <div 
        ref={mobileMenuRef}
        id="mobile-menu"
        className={cn(
          "fixed top-16 left-0 right-0 bg-white z-40 md:hidden transition-all duration-300 ease-in-out border-b shadow-lg",
          mobileMenuOpen 
            ? "translate-y-0 opacity-100 pointer-events-auto" 
            : "-translate-y-full opacity-0 pointer-events-none"
        )}
        role="menu"
        aria-label="เมนูการนำทางมือถือ"
      >
        <div className="flex flex-col p-4 space-y-2">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={pathname === item.href ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-4 px-5 py-4 rounded-xl text-lg font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  pathname === item.href
                    ? 'bg-primary text-white shadow-soft'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
                onClick={() => setMobileMenuOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextItem = mobileMenuRef.current?.querySelectorAll('a')[index + 1] as HTMLElement;
                    nextItem?.focus();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevItem = mobileMenuRef.current?.querySelectorAll('a')[index - 1] as HTMLElement;
                    prevItem?.focus();
                  }
                }}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        </div>
    </>
  );
}
