import type { ReactNode } from 'react';

const navLinks = [
  { href: '/#about', label: 'Overview' },
  { href: '/#schedule', label: 'Schedule' },
  { href: '/#logistics', label: 'Logistics' },
  { href: '/#tickets', label: 'Tickets' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/#contact', label: 'Contact' }
];

function TaroLeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M32 6C20 6 10 16 10 28c0 13.5 10.7 25 22 30 11.3-5 22-16.5 22-30C54 16 44 6 32 6z"
        fill="currentColor"
      />
      <path
        d="M32 18c-6 0-10 5-10 10 0 8 6 15 10 17 4-2 10-9 10-17 0-5-4-10-10-10z"
        fill="white"
        fillOpacity="0.18"
      />
      <path d="M32 20v26" stroke="white" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brandBlue/10 shadow-soft">
                <TaroLeafIcon className="h-7 w-7 text-brandBlue" />
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brandBlue/10">
                  <TaroLeafIcon className="h-7 w-7 text-brandBlueLight" />
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
                  <a href="/#about" className="transition-colors hover:text-white">
                    Overview
                  </a>
                </li>
                <li>
                  <a href="/#schedule" className="transition-colors hover:text-white">
                    Schedule
                  </a>
                </li>
                <li>
                  <a href="/#logistics" className="transition-colors hover:text-white">
                    Logistics
                  </a>
                </li>
                <li>
                  <a href="/#tickets" className="transition-colors hover:text-white">
                    Tickets
                  </a>
                </li>
                <li>
                  <a href="/#faq" className="transition-colors hover:text-white">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="/#contact" className="transition-colors hover:text-white">
                    Contact
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
