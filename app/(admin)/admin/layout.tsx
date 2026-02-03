import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import LogoutButton from '@/components/admin/LogoutButton';
import TaroLeafIcon from '@/components/icons/TaroLeafIcon';
import { createSupabaseServerClient } from '@/lib/supabaseClient';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const isAdmin = user?.app_metadata?.role === 'admin';

  if (!user) {
    redirect('/admin-login?reason=signin&redirect=/admin');
  }

  if (!isAdmin) {
    redirect('/admin-login?reason=unauthorized&redirect=/admin');
  }

  return (
    <div className="min-h-screen bg-sand-50 text-sand-900">
      <header className="sticky top-0 z-40 border-b border-sand-200 bg-white/80 backdrop-blur">
        <div className="container flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brandBlue/10 shadow-soft">
              <TaroLeafIcon className="h-7 w-7 text-brandBlue" />
            </span>
            <div>
              <p className="mono text-xs uppercase tracking-[0.3em] text-koa">Admin</p>
              <h1 className="text-xl font-semibold text-sand-900">Kekoʻolani Coordination Center</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-brandBlue/30 bg-white px-4 py-2 text-sm font-semibold text-brandBlue shadow-soft transition hover:bg-brandBlue hover:text-white"
            >
              View Site
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="container pb-16 pt-10">
        <section className="hero relative overflow-hidden rounded-3xl p-8 shadow-soft md:p-12">
          <div className="relative z-10 space-y-4">
            <span className="hero-tag">Admin Dashboard</span>
            <h2 className="text-3xl font-semibold md:text-4xl">Reunion operations, in one place.</h2>
            <p className="max-w-2xl text-white/80">
              Update the public website, manage registration details, and keep the family informed for 2026.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-large">
                View Registration
              </Link>
              <Link href="/#overview" className="btn btn-secondary btn-large">
                Public Homepage
              </Link>
            </div>
          </div>
        </section>
        <div className="mt-8">
          <AdminNav />
        </div>
        <div className="mt-10 space-y-10">{children}</div>
      </main>
    </div>
  );
}
