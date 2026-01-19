/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import { parseSchedule, parseExtras, SITE_DEFAULTS, DEFAULT_EXTRAS } from '@/lib/siteContent';
import { normalizeSectionList } from '@/lib/sections';
import SectionRenderer from '@/components/public/SectionRenderer';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

async function getSiteContent() {
  const supabase = createSupabaseServerClient();

  const [siteRes, ticketRes, sectionRes] = await Promise.all([
    supabase.from('site_settings').select('*').limit(1).maybeSingle(),
    supabase
      .from('ticket_types')
      .select('*')
      .eq('active', true)
      .order('position', { ascending: true }),
    supabase
      .from('content_sections')
      .select('*')
      .eq('published', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
  ]);

  const tickets = ((ticketRes.data ?? []) as TicketRow[]).map((ticket) => ({
    ...ticket,
    priceFormatted: formatCurrency(ticket.price_cents, ticket.currency)
  }));

  const defaults = {
    hero_title: "Keko'olani Family Reunion",
    hero_subtitle:
      "Honoring our elders, celebrating future generations. Gather in Hilo to strengthen family bonds, share stories, and celebrate the legacy of Nawaili'ili'i and Emily.",
    event_dates: 'July 10-12, 2026',
    location: "Jade & Mele's Home - Waipio Valley - The Arc of Hilo",
    about_html:
      "<p>At our August 23, 2025 planning meeting we affirmed the purpose of this reunion: to thank our parents and grandparents for teaching us family love, to connect the next generation to our roots, and to ensure the Keko'olani story continues. 'Honoring our elders, celebrating our future.'</p><p>The group confirmed July 10-12, 2026 for our gathering in Hilo with a three-day flow of genealogy story sharing, an excursion to Waipio and family graves, and a luau evening at The Arc. Committees were formed for registration, setup, program, meals, genealogy archiving, and more. Thank you to everyone who offered help; see the committee roster below for ways to plug in.</p>",
    schedule_json: SITE_DEFAULTS.schedule,
    gallery_json: DEFAULT_EXTRAS,
    show_schedule: true,
    show_gallery: true,
    show_purpose: true,
    show_costs: true,
    show_logistics: true,
    show_committees: true
  } as const;

  const siteRecord = siteRes.data as SiteSettingsRow | null;
  const site = siteRecord
    ? {
        ...defaults,
        ...siteRecord,
        show_schedule: siteRecord.show_schedule ?? true,
        show_gallery: siteRecord.show_gallery ?? true,
        show_purpose: siteRecord.show_purpose ?? true,
        show_costs: siteRecord.show_costs ?? true,
        show_logistics: siteRecord.show_logistics ?? true,
        show_committees: siteRecord.show_committees ?? true
      }
    : defaults;

  const scheduleEntries = parseSchedule(site.schedule_json);
  const extras = parseExtras(site.gallery_json);
  const sections = normalizeSectionList(sectionRes.data ?? []);

  return { site, tickets, scheduleEntries, extras, sections };
}

export default async function HomePage() {
  const { site, tickets, scheduleEntries, extras, sections } = await getSiteContent();
  const galleryItems = extras.gallery;
  const purposePoints = extras.purpose;
  const costOutline = extras.costs;
  const logisticsNotes = extras.logistics;
  const committees = extras.committees;

  const showSchedule = site.show_schedule && scheduleEntries.length > 0;
  const showGallery = site.show_gallery && galleryItems.length > 0;
  const showPurpose = site.show_purpose && purposePoints.length > 0;
  const showCosts = site.show_costs && costOutline.length > 0;
  const showLogistics = site.show_logistics && logisticsNotes.length > 0;
  const showCommittees = site.show_committees && committees.length > 0;
  const aboutGridCols = showGallery ? 'md:grid-cols-[3fr,2fr]' : 'md:grid-cols-1';

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ocean-200 via-sand-100 to-fern-100" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-24 md:flex-row md:items-center">
          <div className="space-y-6 md:w-3/5">
            <span className="inline-flex rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ocean-700 shadow">
              Hilo, Hawaii
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
                  Register
                </span>
              </Link>
              {showSchedule ? (
                <a
                  href="#schedule"
                  className="inline-flex items-center text-sm font-semibold text-ocean-600 hover:text-ocean-700"
                >
                  View Schedule
                </a>
              ) : null}
            </div>
          </div>
          <div className="md:w-2/5">
            <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-white/70 p-6 shadow-xl backdrop-blur">
              <h2 className="text-xl font-semibold text-slate-900">Weekend Snapshot</h2>
              <dl className="mt-6 space-y-4 text-sm text-slate-600">
                <div>
                  <dt className="font-semibold text-slate-800">Welcome Mixer</dt>
                  <dd>Gather by Hilo Bay with live music and family trivia.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">Elders&apos; Stories</dt>
                  <dd>Document family histories and add to our shared genealogy.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-800">Kids&apos; Adventure</dt>
                  <dd>Kids scavenger hunt across Coconut Island.</dd>
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
        <div className={`grid gap-12 ${aboutGridCols} md:items-start`}>
          <div className="space-y-8">
            <article
              className="prose prose-lg prose-slate max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: site.about_html ?? '' }}
            />
            {showPurpose ? (
              <div>
                <h3 className="text-sm uppercase tracking-[0.35em] text-fern-600">Purpose Highlights</h3>
                <ul className="mt-4 space-y-2 rounded-3xl border border-fern-100 bg-white/80 p-6 text-sm text-slate-700 shadow-sm">
                  {purposePoints.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-fern-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {showGallery ? (
            <div className="grid gap-4">
              {galleryItems.slice(0, 3).map((item, idx) => (
                <div key={idx} className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 shadow-lg">
                  <img src={item.src} alt={item.alt ?? 'Reunion photo'} className="h-48 w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {showSchedule ? (
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
              {scheduleEntries.map((entry, idx) => {
                const agenda = Array.isArray(entry.items) && entry.items.length ? entry.items : [];
                const fallbackDescription = !agenda.length && entry.description ? entry.description : null;

                return (
                  <div
                    key={`${entry.time}-${idx}`}
                    className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-ocean-500">{entry.time}</p>
                    <h3 className="mt-3 text-xl font-semibold text-slate-900">{entry.title}</h3>
                    {agenda.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm text-slate-600">
                        {agenda.map((item) => (
                          <li key={item} className="flex items-start gap-3">
                            <span className="mt-1 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-lava-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : fallbackDescription ? (
                      <p className="mt-2 text-sm text-slate-600">{fallbackDescription}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {showCosts || showLogistics ? (
        <section id="logistics" className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-12 text-center">
            <span className="text-xs uppercase tracking-[0.3em] text-sand-600">Costs & Planning</span>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Reunion Logistics</h2>
            <p className="mt-2 text-sm text-slate-600">
              We are keeping registrations as affordable as possible. Thanks for helping with supplies, setup, and hosting.
            </p>
          </div>
          <div className={`grid gap-8 ${showCosts && showLogistics ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
            {showCosts ? (
              <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow">
                <h3 className="font-serif text-2xl text-lava-600">Cost per Family</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {costOutline.map((item) => (
                    <li key={item.label}>
                      <p className="font-semibold text-slate-900">{item.label}</p>
                      <p>{item.detail}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">
                  Additional help and donations welcome for venue rentals and supplies.
                </p>
              </div>
            ) : null}
            {showLogistics ? (
              <div className="rounded-3xl border border-fern-100 bg-gradient-to-br from-fern-50/70 to-sand-50/80 p-6 shadow">
                <h3 className="font-serif text-2xl text-fern-700">Logistics & Support</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {logisticsNotes.map((note) => (
                    <li key={note} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-fern-500" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-slate-600">
                  Need help or have updates before the next planning meeting (Sept 20, 2025 @ 10:30am)? Contact Jade directly at{' '}
                  <a href="mailto:pumehanasilva@mac.com" className="text-ocean-600 underline">
                    pumehanasilva@mac.com
                  </a>{' '}
                  or 808-895-6883.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}

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

      {showCommittees ? (
        <section id="committees" className="bg-white/70 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <span className="text-xs uppercase tracking-[0.3em] text-lava-500">Committees & Volunteers</span>
              <h2 className="mt-3 text-3xl font-semibold text-slate-900">Meet the Planning Committees</h2>
              <p className="mt-2 text-sm text-slate-600">
                Thank you to the families stepping forward. If you feel called to help, reach out to the committee leads.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {committees.map((committee) => (
                <div key={committee.name} className="rounded-3xl border border-white/60 bg-gradient-to-br from-white/90 to-fern-50/70 p-6 shadow">
                  <p className="text-xs uppercase tracking-[0.35em] text-fern-600">{committee.name}</p>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{committee.leads}</h3>
                  <p className="mt-2 text-sm text-slate-600">{committee.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

    </div>
  );
}
