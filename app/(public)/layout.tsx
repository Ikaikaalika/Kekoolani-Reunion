import type { ReactNode } from 'react';

const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#schedule', label: 'Schedule' },
  { href: '#logistics', label: 'Logistics' },
  { href: '#committees', label: 'Committees' },
  { href: '#faq', label: 'FAQ' }
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="container flex flex-col gap-6 py-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brandBlue text-lg font-semibold text-white shadow-soft">
              K
            </span>
            <div>
              <p className="mono text-xs uppercase tracking-[0.4em] text-koa">Kekoʻolani Family</p>
              <p className="text-lg font-semibold text-black">Family Reunion 2026 · Hilo, Hawaiʻi</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-koa md:gap-6">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-brandBlueDark">
                {link.label}
              </a>
            ))}
            <a href="/register" className="btn">
              Register Now
            </a>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200">
        <div className="container flex flex-col gap-6 py-10 text-sm text-koa md:flex-row md:items-center md:justify-between">
          <p>
            Copyright {new Date().getFullYear()} Kekoʻolani Family · Reunion in Hilo, Hawaiʻi.
          </p>
          <div className="flex gap-4">
            <a href="mailto:ohana@kekoolani.com" className="hover:text-brandBlueDark">
              ohana@kekoolani.com
            </a>
            <a href="/admin" className="hover:text-brandBlueDark">
              Admin Login
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
