import type { ReactNode } from 'react';
import TaroLeafIcon from '@/components/icons/TaroLeafIcon';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { SITE_SETTINGS_ID } from '@/lib/constants';
import { SITE_DEFAULTS } from '@/lib/siteContent';
import type { Database } from '@/types/supabase';

const navLinks = [
  { href: '/#overview', label: 'Overview' },
  { href: '/#schedule', label: 'Schedule' },
  { href: '/#genealogy', label: 'Genealogy' },
  { href: '/#logistics', label: 'Logistics' },
  { href: '/#contact', label: 'Contact' }
];

type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('site_settings')
    .select('event_dates, location')
    .eq('id', SITE_SETTINGS_ID)
    .maybeSingle<SiteSettingsRow>();

  const eventDates = data?.event_dates ?? SITE_DEFAULTS.event_dates;
  const location = data?.location ?? SITE_DEFAULTS.location;

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 z-50 w-full">
        <div className="hidden bg-navy text-sm text-white md:block">
          <div className="container flex items-center justify-between py-2">
            <div className="flex items-center gap-6">
              <a href="tel:8088956883" className="opacity-90 hover:opacity-100">
                808-895-6883
              </a>
              <a href="mailto:pumehanasilva@mac.com" className="opacity-90 hover:opacity-100">
                pumehanasilva@mac.com
              </a>
            </div>
            <div className="opacity-90">
              {eventDates} • {location}
            </div>
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
      <footer id="contact" className="bg-navy text-white">
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
                Contact Pumehana Silva for registration help, genealogy submissions, or reunion updates.
              </p>
              <div className="space-y-2 text-white/70">
                <p>Pumehana Silva</p>
                <p>pumehanasilva@mac.com</p>
                <p>808-895-6883 (Hawaiʻi time)</p>
                <p>Mailing: PO Box 10124, Hilo, HI 96721</p>
              </div>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold">Quick Links</h4>
              <ul className="space-y-3 text-white/70">
                <li>
                  <a href="/#overview" className="transition-colors hover:text-white">
                    Overview
                  </a>
                </li>
                <li>
                  <a href="/#schedule" className="transition-colors hover:text-white">
                    Schedule
                  </a>
                </li>
                <li>
                  <a href="/#genealogy" className="transition-colors hover:text-white">
                    Genealogy
                  </a>
                </li>
                <li>
                  <a href="/#logistics" className="transition-colors hover:text-white">
                    Logistics
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
                <p>{eventDates}</p>
                <p>{location}</p>
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
