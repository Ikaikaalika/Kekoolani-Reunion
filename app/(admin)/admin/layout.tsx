import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="bg-gradient-to-br from-ocean-600 via-fern-500 to-lava-500 pb-24">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">Admin</p>
            <h1 className="text-2xl font-semibold">Keko’olani Reunion Control Center</h1>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
          >
            View Site
          </Link>
        </div>
      </div>
      <div className="-mt-14 pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <AdminNav />
          <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-xl backdrop-blur">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
