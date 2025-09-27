import type { ReactNode } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-fern-50 via-white to-sand-100 text-slate-900">
      <div className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
            <h1 className="text-2xl font-semibold text-slate-900">Kekoʻolani Reunion Coordination Center</h1>
          </div>
          <Link
            href="/"
            className="rounded-full bg-ocean-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-ocean-600"
          >
            View Site
          </Link>
        </div>
      </div>
      <div className="-mt-10 pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <AdminNav />
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
