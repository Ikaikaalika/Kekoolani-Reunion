import { Suspense } from 'react';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import TaroLeafIcon from '@/components/icons/TaroLeafIcon';

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-sand-50">
      <div className="container flex min-h-screen items-center py-16">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <section className="hero relative overflow-hidden rounded-3xl p-8 shadow-soft md:p-12">
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                  <TaroLeafIcon className="h-7 w-7 text-brandBlueLight" />
                </span>
                <span className="hero-tag">Admin Access</span>
              </div>
              <h1 className="h2">Kekoʻolani Reunion Admin</h1>
              <p className="hero-meta max-w-xl text-base">
                Update the public site, review registrations, and keep the family informed leading up to July 2026.
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-white/80">
                This area is limited to reunion organizers. Use your admin credentials to continue.
              </div>
            </div>
          </section>
          <section className="card shadow-soft p-8 md:p-10">
            <p className="section-title">Sign In</p>
            <h2 className="mt-3 text-2xl font-semibold text-sand-900">Manage the reunion site</h2>
            <p className="mt-2 text-sm text-koa">
              Only authorized members can edit the site and view registrations.
            </p>
            <div className="mt-6">
              <Suspense fallback={<p className="text-sm text-koa">Loading...</p>}>
                <AdminLoginForm />
              </Suspense>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
