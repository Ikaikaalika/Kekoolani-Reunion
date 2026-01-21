/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import { parseSchedule, parseExtras, SITE_DEFAULTS, DEFAULT_EXTRAS } from '@/lib/siteContent';
import { normalizeSectionList } from '@/lib/sections';
import SectionRenderer from '@/components/public/SectionRenderer';
import Countdown from '@/components/public/Countdown';
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
    hero_title: 'Kekoʻolani Family Reunion 2026',
    hero_subtitle:
      'E hoʻi i ka piko (Let us return to the source) is our theme as we gather in Hilo to reconnect and strengthen our pilina (closeness). We invite all descendants of Nawai and Emily Kekoʻolani to be part of this reunion.',
    event_dates: 'July 10 – 12, 2026',
    location: 'Hilo and Waipiʻo, Hawaiʻi',
    about_html: `
<p>Aloha kākou,</p>
<p><strong>E hoʻi i ka piko</strong> (Let us return to the source) is our theme for our 2026 Kekoʻolani family reunion. Come and join us in the beautiful moku of Hilo as we reconnect and strengthen our pilina (closeness) with one another. We invite all of the descendants of Nawai and Emily Kekoʻolani to be part of this reunion.</p>
<ul>
  <li><strong>What:</strong> Kekoʻolani Family Reunion</li>
  <li><strong>Who:</strong> All descendants of Nawai and Emily Kekoʻolani</li>
  <li><strong>When:</strong> July 10 – 12, 2026</li>
  <li><strong>Where:</strong> Hilo and Waipiʻo, Hawaiʻi</li>
</ul>
<h3>Lodging</h3>
<p>Hilo Hawaiian Hotel has offered us a group rate. Please click the links below for details:</p>
<ul>
  <li><a href="https://drive.google.com/file/d/1iurqFFQYgSl0XTebyLcYZ9MScL7EAYOx/view?usp=drive_link" target="_blank" rel="noreferrer">Information for Hilo Hawaiian Hotel group rate</a></li>
  <li><a href="https://drive.google.com/file/d/1_tlRIQ5jtG7uWn1XXmIDfzr59vi-NF-p/view?usp=sharing" target="_blank" rel="noreferrer">Hilo Hawaiian Hotel form with group code</a></li>
</ul>
<p>Other Hilo hotels include Grand Naniloa and SCP Hotel (formerly Hilo Seaside). You can also explore vacation rentals across Hawaiʻi Island.</p>
<h3>Transportation</h3>
<p>Transportation from the Waipiʻo lookout into the valley will be provided, but all other transportation will be on your own.</p>
<h3>Genealogy</h3>
<p>Our moʻokūʻauhau (genealogy) allows us to know who we are, where we come from, and who we are related to. It connects us to place, events, and moʻolelo that has or may impact our ʻohana. Our dear Aunty Amy, Uncle Henry, and cousin Dean have worked hard to provide records of our past.</p>
<p>We invite everyone to participate in sharing your genealogy information so we can update our family records to include the last few generations. We will be emailing a PDF fillable form for you to complete, save, and email to Jade Silva (daughter of Winifred). We will also include a letter asking for your authorization to share your information with the rest of the family. Please submit genealogy information by the end of April 2026.</p>
<h3>Registration</h3>
<p>Registration is required for all attendees. Please use the <a href="/register">online form</a> to share participant details, attendance days, and T-shirt sizes so we can plan meals and activities.</p>
<p>Need help? Contact Jade Silva for registration support or to request mailed materials.</p>
<h3>Coordinator contact information</h3>
<p>Jade Silva · 808-895-6883 (Hawaiʻi time) · <a href="mailto:pumehanasilva@mac.com">pumehanasilva@mac.com</a></p>
<p>Mailing: PO Box 10124, Hilo, HI 96721</p>
`,
    schedule_json: SITE_DEFAULTS.schedule,
    gallery_json: DEFAULT_EXTRAS,
    show_schedule: true,
    show_gallery: true,
    show_purpose: true,
    show_costs: true,
    show_logistics: true,
    show_committees: false
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

const scheduleItemPattern =
  /^(\d{1,2}(?::\d{2})?(?:\s*(?:a\.?m\.?|p\.?m\.?|a|p))?(?:\s*[-\u2013\u2014]\s*\d{1,2}(?::\d{2})?(?:\s*(?:a\.?m\.?|p\.?m\.?|a|p))?)?)\s+(.+)$/i;

function isLikelyTimePrefix(value: string) {
  const hasMinutes = /:\d{2}/.test(value);
  const hasMeridiem = /[ap](?:\.?m\.?)?/i.test(value);
  const hasRange = /[-\u2013\u2014]/.test(value);
  if (!hasMinutes && !hasMeridiem && !hasRange) {
    return false;
  }

  const hours = Array.from(value.matchAll(/\b(\d{1,2})(?::\d{2})?/g)).map((match) => Number(match[1]));
  if (!hours.length) {
    return false;
  }

  return hours.every((hour) => hour >= 1 && hour <= 12);
}

function splitScheduleItem(item: string) {
  const trimmed = item.trim();
  const match = trimmed.match(scheduleItemPattern);
  if (!match) {
    return { time: null, detail: trimmed };
  }

  const time = match[1].trim();
  if (!isLikelyTimePrefix(time)) {
    return { time: null, detail: trimmed };
  }

  return { time, detail: match[2].trim() };
}

type AboutSection = {
  title: string;
  html: string;
};

const overviewListTokens = ['what', 'who', 'when', 'where'];

function stripOverviewList(html: string) {
  return html.replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, (list) => {
    const normalized = list.toLowerCase();
    const hasTokens = overviewListTokens.every((token) => normalized.includes(`${token}:`));
    return hasTokens ? '' : list;
  });
}

function splitAboutSections(html: string | null) {
  const cleaned = (html ?? '').trim();
  if (!cleaned) {
    return { intro: null as string | null, sections: [] as AboutSection[] };
  }

  const matches = Array.from(cleaned.matchAll(/<h3[^>]*>(.*?)<\/h3>/gi));
  if (!matches.length) {
    return { intro: cleaned, sections: [] };
  }

  const intro = matches[0].index ? cleaned.slice(0, matches[0].index).trim() : '';
  const sections = matches
    .map((match, index) => {
      if (match.index === undefined) return null;
      const title = match[1].replace(/<[^>]+>/g, '').trim();
      const start = match.index + match[0].length;
      const end = index + 1 < matches.length && matches[index + 1].index !== undefined ? matches[index + 1].index : cleaned.length;
      let sectionHtml = cleaned.slice(start, end).trim();
      if (title.toLowerCase() === 'registration') {
        sectionHtml = sectionHtml.replace(/<ol[\s\S]*?<\/ol>/gi, '').trim();
      }
      if (!title || !sectionHtml) return null;
      return { title, html: sectionHtml };
    })
    .filter((section): section is AboutSection => Boolean(section));

  return {
    intro: intro ? stripOverviewList(intro).trim() || null : null,
    sections
  };
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
  const hasFaqSection = sections.some((section) => section.type === 'faq');
  const hasContactSection = sections.some((section) => section.type === 'contact');
  const aboutIntroCols = showGallery ? 'lg:grid-cols-[3fr,2fr]' : 'lg:grid-cols-1';
  const aboutContent = splitAboutSections(site.about_html);
  const redundantAboutTitles = new Set([
    'lodging',
    'transportation',
    'genealogy',
    'registration',
    'coordinator contact information',
    'coordinator contact',
    'contact information'
  ]);
  const aboutSections = aboutContent.sections.filter((section) => {
    const normalizedTitle = section.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (!normalizedTitle) return false;
    if (redundantAboutTitles.has(normalizedTitle)) return false;
    if (normalizedTitle.startsWith('coordinator contact')) return false;
    return true;
  });
  const showAboutSections = aboutSections.length > 0;
  const countdownTarget = '2026-07-10T09:00:00-10:00';

  return (
    <div>
      <section className="section hero">
        <div className="container relative z-10 grid gap-12 lg:grid-cols-[3fr,2fr] lg:items-center">
          <div className="space-y-6">
            <span className="hero-tag">E hoʻi i ka piko</span>
            <h1 className="h1 text-balance text-white">{site.hero_title}</h1>
            <p className="max-w-xl text-lg text-white/85">{site.hero_subtitle}</p>
            <div className="flex flex-col gap-3 text-sm text-white/80 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-emerald-300" />
                <span>{site.event_dates}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-amber-200" />
                <span>{site.location}</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/register" className="btn btn-large w-full sm:w-auto">
                Register
              </Link>
              {showSchedule ? (
                <a href="/#schedule" className="btn btn-secondary w-full sm:w-auto">
                  View Schedule
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <div className="hero-panel">
              <h2 className="h3 text-white">Weekend Snapshot</h2>
              <dl className="mt-6 space-y-4 text-sm text-white/80">
                <div>
                  <dt className="font-semibold text-white">Hoʻolauna</dt>
                  <dd>Meet and greet, genealogy session, and keiki activities.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Huakaʻi to Waipiʻo</dt>
                  <dd>Visit Waipiʻo valley and Kalopa family graves.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Family lūʻau</dt>
                  <dd>Evening lūʻau with dinner, entertainment, and family sharing.</dd>
                </div>
              </dl>
              <div className="mt-6 rounded-2xl bg-white/15 p-4 text-white shadow-soft">
                <p className="mono text-xs uppercase tracking-[0.3em] text-white/70">Countdown</p>
                <div className="mt-3">
                  <Countdown targetIso={countdownTarget} fallback={site.event_dates ?? undefined} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <div className="container">
          <div className="mb-12 text-center">
            <span className="section-title">Overview</span>
            <h2 className="h2 mt-3">Reunion Details</h2>
            <p className="mt-2 text-sm text-sand-700">
              Key details, travel notes, and how we will gather across the weekend.
            </p>
          </div>
          <div className={`grid gap-12 ${aboutIntroCols} lg:items-start`}>
            <div className="space-y-8">
              {aboutContent.intro ? (
                <div
                  className="prose prose-lg prose-slate max-w-none text-sand-700"
                  dangerouslySetInnerHTML={{ __html: aboutContent.intro }}
                />
              ) : null}
              {showPurpose ? (
                <div>
                  <h3 className="section-title">Purpose Highlights</h3>
                  <ul className="card mt-4 space-y-2 p-6 text-sm text-sand-700 shadow-soft">
                    {purposePoints.map((point) => (
                      <li key={point} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-emerald-500" />
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
                  <div key={idx} className="card shadow-soft overflow-hidden">
                    <img src={item.src} alt={item.alt ?? 'Reunion photo'} className="h-52 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {showAboutSections ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {aboutSections.map((section) => (
                <div key={section.title} className="card shadow-soft p-5">
                  <h3 className="text-lg font-semibold text-sand-900">{section.title}</h3>
                  <div
                    className="prose prose-sm prose-slate mt-2 max-w-none text-sand-700"
                    dangerouslySetInnerHTML={{ __html: section.html }}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {showSchedule ? (
        <section id="schedule" className="section section-alt">
          <div className="container max-w-5xl">
            <div className="mb-12 text-center">
              <span className="section-title">Weekend Flow</span>
              <h2 className="h2 mt-3">Tentative Schedule</h2>
              <p className="mt-2 text-sm text-sand-700">
                Times & locations may shift slightly as we confirm partners.
              </p>
            </div>
            <div className="grid gap-6">
              {scheduleEntries.map((entry, idx) => {
                const agenda = Array.isArray(entry.items) && entry.items.length ? entry.items : [];
                const fallbackDescription = !agenda.length && entry.description ? entry.description : null;
                const parsedAgenda = agenda.map((item) => splitScheduleItem(item));
                const hasTimes = parsedAgenda.some((item) => item.time);

                return (
                  <div
                    key={`${entry.time}-${idx}`}
                    className="card shadow-soft p-6 transition hover:-translate-y-1"
                  >
                    <p className="section-title">{entry.time}</p>
                    <h3 className="mt-3 text-xl font-semibold text-sand-900">{entry.title}</h3>
                    {agenda.length > 0 ? (
                      <div className="mt-4 space-y-3 text-sm text-sand-700">
                        {parsedAgenda.map((item, itemIdx) =>
                          hasTimes ? (
                            <div key={`${entry.time}-item-${itemIdx}`} className="grid gap-2 sm:grid-cols-[120px_1fr]">
                              <span
                                className={`mono text-xs font-semibold uppercase tracking-[0.2em] ${
                                  item.time ? 'text-sand-600' : 'text-sand-400'
                                }`}
                              >
                                {item.time ?? 'TBD'}
                              </span>
                              <span>{item.detail}</span>
                            </div>
                          ) : (
                            <p key={`${entry.time}-item-${itemIdx}`}>{item.detail}</p>
                          )
                        )}
                      </div>
                    ) : fallbackDescription ? (
                      <p className="mt-2 text-sm text-sand-700">{fallbackDescription}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {showCosts || showLogistics ? (
        <section id="logistics" className="section">
          <div className="container max-w-5xl">
            <div className="mb-12 text-center">
              <span className="section-title">Costs & Planning</span>
              <h2 className="h2 mt-3">Reunion Logistics</h2>
              <p className="mt-2 text-sm text-sand-700">
                We are keeping registrations as affordable as possible. Thanks for helping with supplies, setup, and hosting.
              </p>
            </div>
            <div className={`grid gap-8 ${showCosts && showLogistics ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              {showCosts ? (
                <div className="card shadow-soft p-6">
                  <h3 className="text-2xl font-semibold text-sand-900">Cost per Person</h3>
                  <ul className="mt-4 space-y-3 text-sm text-sand-700">
                    {costOutline.map((item) => (
                      <li key={item.label}>
                        <p className="font-semibold text-sand-900">{item.label}</p>
                        <p>{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mono mt-4 text-xs uppercase tracking-[0.25em] text-sand-500">
                    Additional help and donations welcome for venue rentals and supplies.
                  </p>
                </div>
              ) : null}
              {showLogistics ? (
                <div className="card shadow-soft bg-white/80 p-6">
                  <h3 className="text-2xl font-semibold text-sand-900">Logistics & Support</h3>
                  <ul className="mt-4 space-y-3 text-sm text-sand-700">
                    {logisticsNotes.map((note) => (
                      <li key={note} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-emerald-500" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section id="tickets" className="section">
        <div className="container max-w-5xl">
          <div className="mb-12 text-center">
            <span className="section-title">Tickets</span>
            <h2 className="h2 mt-3">Choose Your Pass</h2>
            <p className="mt-2 text-sm text-sand-700">
              Secure your spot early. Every ticket helps cover venue, meals, and keepsakes.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {tickets.length ? (
              tickets.map((ticket) => (
                <div key={ticket.id} className="card shadow-soft flex h-full flex-col p-6">
                  <span className="section-title">{ticket.name}</span>
                  <p className="mt-4 text-3xl font-semibold text-sand-900">{ticket.priceFormatted}</p>
                  <p className="mt-2 text-sm text-sand-700">{ticket.description}</p>
                  {typeof ticket.inventory === 'number' && (
                    <p className="mono mt-4 text-xs uppercase tracking-[0.3em] text-emerald-700">
                      {ticket.inventory} spots left
                    </p>
                  )}
                  <Link href={{ pathname: '/register', query: { ticket: ticket.id } }} className="btn mt-auto">
                    Select Ticket
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-3 rounded-3xl border border-dashed border-sand-300 bg-white/80 p-12 text-center text-sand-700">
                Ticketing will open soon. Check back shortly!
              </div>
            )}
          </div>
        </div>
      </section>

      {showCommittees ? (
        <section id="committees" className="section section-alt">
          <div className="container max-w-6xl">
            <div className="mb-12 text-center">
              <span className="section-title">Committees & Volunteers</span>
              <h2 className="h2 mt-3">Meet the Planning Committees</h2>
              <p className="mt-2 text-sm text-sand-700">
                Thank you to the families stepping forward. If you feel called to help, reach out to the committee leads.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {committees.map((committee) => (
                <div key={committee.name} className="card shadow-soft p-6">
                  <p className="section-title">{committee.name}</p>
                  <h3 className="mt-3 text-lg font-semibold text-sand-900">{committee.leads}</h3>
                  <p className="mt-2 text-sm text-sand-700">{committee.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}

      {!hasFaqSection ? (
        <section id="faq" className="section section-alt">
          <div className="container max-w-5xl">
            <div className="mb-12 text-center">
              <span className="section-title">FAQ</span>
              <h2 className="h2 mt-3">Quick Answers</h2>
              <p className="mt-2 text-sm text-sand-700">
                We will share more details soon. Here are the essentials for now.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card shadow-soft p-6">
                <p className="text-lg font-semibold text-sand-900">When is the reunion?</p>
                <p className="mt-2 text-sm text-sand-700">{site.event_dates}</p>
              </div>
              <div className="card shadow-soft p-6">
                <p className="text-lg font-semibold text-sand-900">Where will we gather?</p>
                <p className="mt-2 text-sm text-sand-700">{site.location}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!hasContactSection ? (
        <section id="contact" className="section">
          <div className="container max-w-5xl">
            <div className="mb-12 text-center">
              <span className="section-title">Contact</span>
              <h2 className="h2 mt-3">Registration Support</h2>
              <p className="mt-2 text-sm text-sand-700">
                Reach out with questions about registration, lodging, or genealogy updates.
              </p>
            </div>
            <div className="card shadow-soft p-6">
              <p className="mono text-xs uppercase tracking-[0.3em] text-sand-600">Coordinator</p>
              <h3 className="mt-3 text-xl font-semibold text-sand-900">Jade Silva</h3>
              <div className="mt-3 space-y-2 text-sm text-sand-700">
                <p>
                  Email:{' '}
                  <a href="mailto:pumehanasilva@mac.com" className="text-emerald-700 underline">
                    pumehanasilva@mac.com
                  </a>
                </p>
                <p>Phone: 808-895-6883 (Hawaiʻi time)</p>
                <p>Mailing: PO Box 10124, Hilo, HI 96721</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

    </div>
  );
}
