import type { ReactNode } from 'react';

const navLinks = [
  { href: '#about', label: 'Moʻolelo' },
  { href: '#schedule', label: 'Papa Kau' },
  { href: '#logistics', label: 'Kālena & Kālā' },
  { href: '#committees', label: 'Kōmike' },
  { href: '#faq', label: 'Nīnau' }
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50/70 via-sand-50/60 to-fern-50/70">
      <header className="relative overflow-hidden border-b border-white/40">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-fern-100/40 to-sand-100/40" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-5 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-lava-400 to-fern-500 text-lg font-semibold text-white shadow-lg">
              K
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-ocean-700">Kekoʻolani ʻOhana</p>
              <p className="text-lg font-semibold text-slate-900">ʻAha ʻOhana 2026 · Hilo</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-800 md:gap-6">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-lava-500">
                {link.label}
              </a>
            ))}
            <a
              href="/register"
              className="rounded-full bg-lava-500 px-4 py-2 text-white shadow-md transition hover:bg-lava-600"
            >
              Kākau Ināianei
            </a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="mt-16 bg-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Kekoʻolani ʻOhana — Hālāwai ʻOhana i Hilo, Hawaiʻi.
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
