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
    <nav className="flex flex-wrap gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'rounded-2xl px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white',
              isActive && 'bg-white/20 text-white shadow'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
