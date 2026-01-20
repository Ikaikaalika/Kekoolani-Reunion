import type { ReactNode } from 'react';

const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#schedule', label: 'Schedule' },
  { href: '#logistics', label: 'Logistics' },
  { href: '#tickets', label: 'Tickets' },
  { href: '#faq', label: 'FAQ' }
];

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 z-50 w-full">
        <div className="hidden bg-navy text-sm text-white md:block">
          <div className="container flex items-center justify-between py-2">
            <div className="flex items-center gap-6">
              <a href="tel:8088956883" className="opacity-90 hover:opacity-100">
                808-895-6883
              </a>
              <a href="mailto:ohana@kekoolani.com" className="opacity-90 hover:opacity-100">
                ohana@kekoolani.com
              </a>
            </div>
            <div className="opacity-90">July 10 – 12, 2026 • Hilo & Waipiʻo</div>
          </div>
        </div>
        <div className="border-b border-slate-100 bg-white/80 backdrop-blur-xl">
          <div className="container flex items-center justify-between py-4">
            <a className="flex items-center gap-3" href="/">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brandBlue text-lg font-semibold text-white shadow-soft">
                K
              </span>
              <div className="flex flex-col">
                <span className="text-xl font-semibold tracking-tight text-black">Kekoʻolani</span>
                <span className="mono text-xs uppercase tracking-wider text-koa">Family Reunion</span>
              </div>
            </a>
            <nav className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <a key={link.href} href={link.href} className="text-sm text-koa transition-colors hover:text-black">
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <a href="/register" className="btn btn-large">
                Register Now
              </a>
            </div>
          </div>
        </div>
      </header>
      <main className="pt-24 md:pt-32">{children}</main>
      <footer className="bg-navy text-white">
        <div className="container py-16">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brandBlue">
                  <span className="text-xl font-bold text-white">K</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Kekoʻolani</h3>
                  <p className="text-brandBlueLight">Family Reunion 2026</p>
                </div>
              </div>
              <p className="mb-6 max-w-xl text-white/80">
                A gathering of descendants of Nawai and Emily Kekoʻolani to reconnect, share moʻolelo, and celebrate our ʻohana.
              </p>
              <div className="space-y-2 text-white/70">
                <p>Hilo & Waipiʻo, Hawaiʻi</p>
                <p>ohana@kekoolani.com</p>
                <p>808-895-6883 (Hawaiʻi time)</p>
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold">Quick Links</h4>
              <ul className="space-y-3 text-white/70">
                <li>
                  <a href="#about" className="transition-colors hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#schedule" className="transition-colors hover:text-white">
                    Schedule
                  </a>
                </li>
                <li>
                  <a href="#logistics" className="transition-colors hover:text-white">
                    Logistics
                  </a>
                </li>
                <li>
                  <a href="#tickets" className="transition-colors hover:text-white">
                    Tickets
                  </a>
                </li>
                <li>
                  <a href="/register" className="transition-colors hover:text-white">
                    Register
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold">Details</h4>
              <div className="mb-6 space-y-2 text-white/70">
                <p>Friday – Sunday</p>
                <p>July 10 – 12, 2026</p>
                <p>Hilo & Waipiʻo, Hawaiʻi</p>
              </div>
              <a href="/admin" className="text-white/70 transition-colors hover:text-white">
                Admin Login
              </a>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/60">
            © {new Date().getFullYear()} Kekoʻolani Family Reunion. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
