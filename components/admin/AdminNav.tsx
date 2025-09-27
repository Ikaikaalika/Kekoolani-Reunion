'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/content', label: 'Landing Content' },
  { href: '/admin/tickets', label: 'Tickets' },
  { href: '/admin/questions', label: 'Questions' },
  { href: '/admin/orders', label: 'Orders' }
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-2xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900',
              isActive && 'bg-ocean-50 text-ocean-700 shadow'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
