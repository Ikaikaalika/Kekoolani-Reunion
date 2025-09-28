import { Suspense } from 'react';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ocean-500 via-fern-500 to-sand-400 px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-10 text-white shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Admin Access</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in to manage the reunion</h1>
        <p className="mt-2 text-sm text-white/70">
          Only authorized members can edit the site and view registrations.
        </p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-white/80">Loading…</p>}>
            <AdminLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
