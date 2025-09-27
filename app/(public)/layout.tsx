import type { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-sand-50 to-fern-50">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-20" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-ocean-500 text-white font-semibold shadow-lg">
              K
            </span>
            <div>
              <p className="text-xs uppercase tracking-widest text-ocean-700">Keko’olani ʻOhana</p>
              <p className="text-lg font-semibold text-slate-900">Family Reunion 2025</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            <a href="#about" className="hover:text-ocean-600">
              About
            </a>
            <a href="#schedule" className="hover:text-ocean-600">
              Schedule
            </a>
            <a href="#tickets" className="hover:text-ocean-600">
              Tickets
            </a>
            <a href="#faq" className="hover:text-ocean-600">
              FAQ
            </a>
            <a
              href="/register"
              className="rounded-full bg-ocean-500 px-4 py-2 text-white shadow-md transition hover:bg-ocean-600"
            >
              Register
            </a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 bg-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Keko’olani Family Reunion — Gathering in Hilo, Hawaiʻi.
          </p>
          <div className="flex gap-4">
            <a href="mailto:ohana@kekoolani.com" className="hover:text-ocean-600">
              ohana@kekoolani.com
            </a>
            <a href="/admin" className="hover:text-ocean-600">
              Admin Login
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
