/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

const PURPOSE_POINTS = [
  'Mahalo our kūpuna for anchoring us in faith, service, and aloha ʻohana.',
  'Strengthen pilina among cousins by sharing moʻolelo, genealogy, and kuleana.',
  'Hānai the next generation so they know their kūpuna, ʻāina, & where they belong.',
  'Celebrate the diverse talents within the ʻohana through mele, hula, and mea ʻai.'
];

const COST_OUTLINE = [
  { label: 'Three lunches (Fri–Sun)', detail: '$30 per person · catered by ʻohana volunteers' },
  { label: 'Sunday evening lūʻau', detail: '$25 per person at The Arc of Hilo' },
  { label: 'Reunion shirt', detail: '$20–$26 (cotton or active wear options by Stanson/Nawai)' }
];

const LOGISTICS_NOTES = [
  'Off-island ʻohana should plan airfare, lodging, and transportation. We’ll share host-home options as they arise.',
  'Set-up at Jade & Meleʻs hale is Thursday, July 9; break-down is Monday, July 13—volunteer kōkua welcome!',
  'Reserve Kukuihaele Park pavilion (July 11) & coordinate Waipiʻo transportation support led by the Nawailiʻiliʻi ʻohana.'
];

const COMMITTEES = [
  {
    name: 'Kākau Inoa / Registration',
    leads: 'Jade & Alika Gee',
    notes: 'Campaign emails, online form, shirt orders, payment flow.'
  },
  {
    name: 'Hale Prep & Breakdown',
    leads: 'Kahealani Silva, Silva ʻohana, Makana Chartrand ʻohana, Amy Girl/Brown ʻohana',
    notes: 'Tents, tables, chairs, porta potties. Set-up Thu (7/9), break-down Mon (7/13).'
  },
  {
    name: 'Lūʻau Decorations',
    leads: 'Naia & Kahealani',
    notes: 'Simple centerpiece or lāʻau décor, coordinate with The Arc logistics.'
  },
  {
    name: 'Meals & Drinks',
    leads: 'Kelsye (Fri lunch), Saturday bento team, Sunday lunch crew, Hina (lūʻau)',
    notes: 'Work with Amy Girl for paper goods and kitchen needs.'
  },
  {
    name: 'Genealogy & Storytelling',
    leads: 'Jade, Kanani, Tete, Stallone, Rachel',
    notes: 'Create digital genealogy file, distribute fillable PDFs, curate talk-story sessions.'
  },
  {
    name: 'Waipiʻo & Graves Huakaʻi',
    leads: 'Amy Girl, Nawailiʻiliʻi, Kaʻai (transport)',
    notes: 'Coordinate valley access, kupuna transportation, and work days beforehand.'
  },
  {
    name: 'Activities & Hoʻike',
    leads: 'Silva ʻohana, Stallone, Makana, Mele',
    notes: 'Lei making, makahiki games, hula workshops, ʻohana sharing program & MC.'
  },
  {
    name: 'Media & Kōkua',
    leads: 'Family reps (video slideshow), Kahealani/Cedric',
    notes: '3–5 minute digital stories per ʻohana, collect photos for archives.'
  }
];

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
    hero_title: 'E Ola Mau ka ʻOhana Kekoʻolani',
    hero_subtitle:
      'Honoring our kupuna, celebrating our moʻopuna. Gather in Hilo to strengthen our pilina, share moʻolelo, and rejoice in the legacy of Nawailiʻiliʻi and Emily.',
    event_dates: 'July 10 – 12, 2026',
    location: 'Jade & Meleʻs Home · Waipiʻo Valley · The Arc of Hilo',
    about_html:
      "<p>At our August 23, 2025 planning meeting we affirmed the purpose of this reunion: to mahalo our parents and grandparents for teaching us aloha ʻohana, to connect the next generation to our roots, and to ensure the Kekoʻolani story continues. ʻHonoring our kūpuna, Celebrating our Future. E ola mau ka ʻohana Kekoʻolani. E hoʻomau i ke aloha o nā kūpuna.ʽ</p><p>The hui confirmed July 10–12, 2026 for our gathering in Hilo with a three-day flow of genealogy talk story, huakaʻi to Waipiʻo and family graves, and a lūʻau evening at The Arc. Committees were formed for registration, hale set-up, hōʽike program, meals, genealogy archiving, and more. Mahalo nui to everyone who offered kōkua—see the committee roster below for ways to plug in.</p>",
    schedule_json: [
      {
        time: 'Friday · July 10, 2026',
        title: 'Hoʻolauna & ʻOhana Genealogy',
        items: [
          '10:00a Hoʻolauna · Jade & Meleʻs Home (Keaukaha)',
          '10:30a Genealogy sharing & keiki activities',
          '12:00p Lunch provided by Kelsye (sushi, sashimi, poke)',
          '1:00p ʻOhana activities & games',
          '3:00p Pau for the day'
        ]
      },
      {
        time: 'Saturday · July 11, 2026',
        title: 'Waipiʻo Valley Huakaʻi & Kalopa Graves',
        items: [
          '8:00a Gather at Waipiʻo lookout · Pule / Oli',
          '9:00a Enter valley to visit loʻi, ʻohana kīpuka, and beach',
          '12:00p Depart valley · 12:30p Lunch at Kukuihaele Park',
          '1:30p Kalopa cemetery visit · option to visit ʻAlae graves',
          'Alternate in-town activities (Coconut Island) under discussion'
        ]
      },
      {
        time: 'Sunday · July 12, 2026',
        title: 'ʻOhana Lūʻau & Hoʻike Evening',
        items: [
          '10:00a Activities & talk story at Jade & Meleʻs home',
          '12:00p Lunch (sandwich bar) then break to prepare for lūʻau',
          '2:00p Decor crew at The Arc · 3:00p ʻOhana arrival and pūpū',
          '6:00p Lūʻau dinner · 7:00p ʻOhana sharing & performances',
          '9:00p Closing circle · A hui hou until next time'
        ]
      }
    ],
    gallery_json: [
      {
        src: 'https://images.unsplash.com/photo-1583274606759-5a4f18c16ca2?auto=format&fit=crop&w=900&q=80',
        alt: 'Waipiʻo Valley lookout'
      },
      {
        src: 'https://images.unsplash.com/photo-1529400971008-f566de0e6dfc?auto=format&fit=crop&w=900&q=80',
        alt: 'ʻOhana lei making activity'
      },
      {
        src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
        alt: 'Evening gathering under pāʻina lights'
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
                  Kākau ʻOhana
                </span>
              </Link>
              <a
                href="#schedule"
                className="inline-flex items-center text-sm font-semibold text-ocean-600 hover:text-ocean-700"
              >
                ʻIke i ka Papa Kau
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
        <div className="grid gap-12 md:grid-cols-[3fr,2fr] md:items-start">
          <div className="space-y-8">
            <article
              className="prose prose-lg prose-slate max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: site.about_html ?? '' }}
            />
            <div>
              <h3 className="text-sm uppercase tracking-[0.35em] text-fern-600">Nā Kuleana Nui</h3>
              <ul className="mt-4 space-y-2 rounded-3xl border border-fern-100 bg-white/80 p-6 text-sm text-slate-700 shadow-sm">
                {PURPOSE_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-fern-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid gap-4">
            {(Array.isArray(site.gallery_json) ? site.gallery_json : [])?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 shadow-lg">
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
            {(Array.isArray(site.schedule_json) ? site.schedule_json : []).map((item, idx) => {
              const agenda = Array.isArray((item as any).items) ? ((item as any).items as string[]) : [];
              return (
                <div
                  key={idx}
                  className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-ocean-500">{(item as any).time}</p>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900">{(item as any).title}</h3>
                  {agenda.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {agenda.map((entry) => (
                        <li key={entry} className="flex items-start gap-3">
                          <span className="mt-1 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-lava-400" />
                          <span>{entry}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">{(item as any).description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="logistics" className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-sand-600">Kālena & Kālā</span>
          <h2 className="mt-3 text-3xl font-semibold text-slate-900">Reunion Logistics</h2>
          <p className="mt-2 text-sm text-slate-600">
            We are keeping registrations as affordable as possible. Mahalo for kōkua with supplies, set-up, and hale hospitality.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow">
            <h3 className="font-serif text-2xl text-lava-600">Investment per ʻOhana</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {COST_OUTLINE.map((item) => (
                <li key={item.label}>
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">
              Additional kōkua and donations welcome for venue rentals & supplies.
            </p>
          </div>
          <div className="rounded-3xl border border-fern-100 bg-gradient-to-br from-fern-50/70 to-sand-50/80 p-6 shadow">
            <h3 className="font-serif text-2xl text-fern-700">Logistics & Kōkua</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              {LOGISTICS_NOTES.map((note) => (
                <li key={note} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-fern-500" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-slate-600">
              Need kōkua or have updates before the next planning hui (Sept 20, 2025 @ 10:30am)? Contact Jade directly at{' '}
              <a href="mailto:pumehanasilva@mac.com" className="text-ocean-600 underline">
                pumehanasilva@mac.com
              </a>{' '}
              or 808-895-6883.
            </p>
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

      <section id="committees" className="bg-white/70 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <span className="text-xs uppercase tracking-[0.3em] text-lava-500">Kōmike & Kōkua</span>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">Meet the Planning Committees</h2>
            <p className="mt-2 text-sm text-slate-600">
              Mahalo to the ʻohana stepping forward. If you feel called to help, reach out to the committee leads.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {COMMITTEES.map((committee) => (
              <div key={committee.name} className="rounded-3xl border border-white/60 bg-gradient-to-br from-white/90 to-fern-50/70 p-6 shadow">
                <p className="text-xs uppercase tracking-[0.35em] text-fern-600">{committee.name}</p>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{committee.leads}</h3>
                <p className="mt-2 text-sm text-slate-600">{committee.notes}</p>
              </div>
            ))}
          </div>
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
