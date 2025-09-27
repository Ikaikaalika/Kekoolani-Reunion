/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

async function getSiteContent() {
  const supabase = createSupabaseServerClient();

  const [siteRes, ticketRes] = await Promise.all([
    supabase.from('site_settings').select('*').limit(1).maybeSingle(),
    supabase
      .from('ticket_types')
      .select('*')
      .eq('active', true)
      .order('position', { ascending: true })
  ]);

  const tickets = ((ticketRes.data ?? []) as TicketRow[]).map((ticket) => ({
    ...ticket,
    priceFormatted: formatCurrency(ticket.price_cents, ticket.currency)
  }));

  const defaults = {
    hero_title: 'Hilo Hoʻolauleʻa 2025',
    hero_subtitle: "Join the Keko’olani ʻohana for a weekend of stories, food, and aloha in beautiful Hilo, Hawaiʻi.",
    event_dates: 'July 25 – 28, 2025',
    location: "Coconut Island & ʻImiloa Astronomy Center",
    about_html:
      "<p>For generations, the Keko’olani family has gathered on Hawaiʻi Island to celebrate our roots. This year, we’re returning to Hilo with a weekend of l\u016bʻau feasts, talk story circles, and adventures across the banyan-lined bayfront.</p>",
    schedule_json: [
      {
        time: 'Friday, July 25',
        title: 'Hoʻolauleʻa Welcome',
        description: "Sunset pupus & mele at Wailoa River State Park"
      },
      {
        time: 'Saturday, July 26',
        title: 'Kinaʻole Cultural Day',
        description: "Workshops, genealogy sessions, and keiki games"
      },
      {
        time: 'Sunday, July 27',
        title: 'L\u016bʻau & Legacy Dinner',
        description: "Celebration banquet with hula and family honors"
      }
    ],
    gallery_json: [
      {
        src: 'https://images.unsplash.com/photo-1534854638093-bada1813ca19?auto=format&fit=crop&w=800&q=80',
        alt: 'Hilo Bay at sunset'
      }
    ]
  } as const;

  const siteRecord = siteRes.data as SiteSettingsRow | null;
  const site = siteRecord ? { ...defaults, ...siteRecord } : defaults;

  return { site, tickets };
}

export default async function HomePage() {
  const { site, tickets } = await getSiteContent();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ocean-200 via-sand-100 to-fern-100" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-24 md:flex-row md:items-center">
          <div className="space-y-6 md:w-3/5">
            <span className="inline-flex rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ocean-700 shadow">
              Hilo, Hawaiʻi
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              {site.hero_title}
            </h1>
            <p className="max-w-xl text-lg leading-7 text-slate-700">{site.hero_subtitle}</p>
            <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-lava-400" />
                <span>{site.event_dates}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-fern-400" />
                <span>{site.location}</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/register" className="w-full sm:w-auto">
                <span className="inline-flex w-full items-center justify-center rounded-full bg-lava-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-lava-600">
                  Reserve Your Spot
                </span>
              </Link>
              <a
                href="#schedule"
                className="inline-flex items-center text-sm font-semibold text-ocean-600 hover:text-ocean-700"
              >
                View Schedule
              </a>
            </div>
          </div>
          <div className="md:w-2/5">
            <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur">
              <h2 className="text-xl font-semibold text-slate-900">Weekend Snapshot</h2>
              <dl className="mt-6 space-y-4 text-sm text-slate-600">
                <div>
                  <dt className="font-semibold text-slate-800">E Komo Mai Mixer</dt>
                  <dd>Gather by Hilo Bay with live mele & family trivia.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">Kupuna Stories</dt>
                  <dd>Document family histories & add to our shared genealogy.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">Aloha Keiki</dt>
                  <dd>Keiki scavenger hunt across Coconut Island.</dd>
                </div>
              </dl>
              <div className="mt-6 rounded-2xl bg-gradient-to-r from-fern-400 to-ocean-400 p-4 text-white shadow">
                <p className="text-sm uppercase tracking-[0.3em] text-white/80">Countdown</p>
                <p className="text-2xl font-semibold">{site.event_dates}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-[3fr,2fr] md:items-center">
          <article
            className="prose prose-lg prose-slate max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: site.about_html ?? '' }}
          />
          <div className="grid gap-4">
            {(Array.isArray(site.gallery_json) ? site.gallery_json : [])?.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-3xl border border-white/50 shadow-lg"
              >
                <img
                  src={typeof item === 'object' && item ? (item as any).src : undefined}
                  alt={typeof item === 'object' && item ? ((item as any).alt ?? 'Reunion photo') : 'Reunion photo'}
                  className="h-48 w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="schedule" className="bg-white/70 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <span className="text-xs uppercase tracking-[0.3em] text-ocean-600">Weekend Flow</span>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Tentative Schedule</h2>
            <p className="mt-2 text-sm text-slate-600">
              Times & locations may shift slightly as we confirm partners.
            </p>
          </div>
          <div className="grid gap-6">
            {(Array.isArray(site.schedule_json) ? site.schedule_json : []).map((item, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-ocean-500">{(item as any).time}</p>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">{(item as any).title}</h3>
                <p className="mt-2 text-sm text-slate-600">{(item as any).description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tickets" className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-fern-600">Tickets</span>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">Choose Your Pass</h2>
          <p className="mt-2 text-sm text-slate-600">
            Secure your spot early. Every ticket helps cover venue, meals, and keepsakes.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {tickets.length ? (
            tickets.map((ticket) => (
              <div key={ticket.id} className="flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <span className="text-xs uppercase tracking-[0.3em] text-ocean-500">{ticket.name}</span>
                <p className="mt-4 text-3xl font-semibold text-slate-900">{ticket.priceFormatted}</p>
                <p className="mt-2 text-sm text-slate-600">{ticket.description}</p>
                {typeof ticket.inventory === 'number' && (
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-lava-500">
                    {ticket.inventory} spots left
                  </p>
                )}
                <Link
                  href={{ pathname: '/register', query: { ticket: ticket.id } }}
                  className="mt-auto inline-flex items-center justify-center rounded-full bg-fern-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-fern-600"
                >
                  Select Ticket
                </Link>
              </div>
            ))
          ) : (
            <div className="col-span-3 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
              Ticketing will open soon. Check back shortly!
            </div>
          )}
        </div>
      </section>

      <section id="faq" className="bg-gradient-to-br from-white to-sand-100 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <span className="text-xs uppercase tracking-[0.3em] text-ocean-600">FAQ</span>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Good To Know</h2>
          </div>
          <dl className="space-y-6">
            <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow">
              <dt className="text-lg font-semibold text-slate-900">What should we wear?</dt>
              <dd className="mt-2 text-sm text-slate-600">
                Embrace the aloha spirit! Aloha attire for evening events, comfortable shoes, and a light jacket for misty
                Hilo evenings.
              </dd>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow">
              <dt className="text-lg font-semibold text-slate-900">Can we bring guests?</dt>
              <dd className="mt-2 text-sm text-slate-600">
                Absolutely. ʻOhana extends to close friends — just make sure every guest is registered so we can prepare
                enough food and gifts.
              </dd>
            </div>
            <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow">
              <dt className="text-lg font-semibold text-slate-900">Is childcare available?</dt>
              <dd className="mt-2 text-sm text-slate-600">
                We have supervised keiki programming throughout the weekend. Add keiki tickets to your order to reserve a
                spot.
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
