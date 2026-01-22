'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/sections', label: 'Content + Sections' },
  { href: '/admin/tickets', label: 'Tickets' },
  { href: '/admin/questions', label: 'Registration' },
  { href: '/admin/orders', label: 'Orders' }
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      className="rounded-3xl border border-sand-200 bg-white/90 p-2 shadow-soft backdrop-soft"
    >
      <div className="flex flex-wrap gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold text-koa transition hover:bg-sand-100 hover:text-sand-900',
                isActive && 'bg-navy text-white shadow-soft'
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
