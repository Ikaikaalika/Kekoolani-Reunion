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
<ol>
  <li>Participant name (Last, First, Middle)</li>
  <li>Parent, grandparent, great grandparent (dropdown with all siblings: Nawai, Katherine, Amy, etc.)</li>
  <li>Contact information (phone, address, email)</li>
  <li>Select days of participation</li>
  <li>T-shirt size and quantity</li>
  <li>All participants: name (first and last), age, relationship</li>
  <li>Select days of participation for each participant</li>
  <li>T-shirt size and quantity for each participant</li>
  <li>Total cost</li>
  <li>Donation note near payment for those who want to give more to the reunion fund; any funds not used will be deposited to the Kekoʻolani Trust fund (used for Waipiʻo land taxes and/or land maintenance).</li>
</ol>
<p><strong>Payment options:</strong></p>
<ul>
  <li>Online (account number and routing number will be provided)</li>
  <li>Mail check payable to Jade Silva, PO Box 10124, Hilo, HI 96721</li>
</ul>
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
      <section className="section">
        <div className="container grid gap-12 lg:grid-cols-[3fr,2fr] lg:items-center">
          <div className="space-y-6">
            <span className="mono text-xs uppercase tracking-[0.3em] text-koa">Hilo, Hawaiʻi</span>
            <h1 className="h1 text-balance">{site.hero_title}</h1>
            <p className="max-w-xl text-lg text-koa">{site.hero_subtitle}</p>
            <div className="flex flex-col gap-3 text-sm text-koa sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-brandGreen" />
                <span>{site.event_dates}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-brandBlue" />
                <span>{site.location}</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/register" className="btn btn-large w-full sm:w-auto">
                Register
              </Link>
              {showSchedule ? (
                <a href="#schedule" className="btn btn-secondary w-full sm:w-auto">
                  View Schedule
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <div className="card shadow-soft backdrop-soft p-6">
              <h2 className="h3">Weekend Snapshot</h2>
              <dl className="mt-6 space-y-4 text-sm text-koa">
                <div>
                  <dt className="font-semibold text-black">Hoʻolauna</dt>
                  <dd>Meet and greet, genealogy session, and keiki activities.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-black">Huakaʻi to Waipiʻo</dt>
                  <dd>Visit Waipiʻo valley and Kalopa family graves.</dd>
                </div>
                <div>
                  <dt className="font-semibold text-black">Family lūʻau</dt>
                  <dd>Evening lūʻau with dinner, entertainment, and family sharing.</dd>
                </div>
              </dl>
              <div className="mt-6 rounded-2xl bg-gradient-to-r from-brandGreen to-brandBlue p-4 text-white shadow-soft">
                <p className="mono text-xs uppercase tracking-[0.3em] text-white/80">Countdown</p>
                <p className="text-2xl font-semibold">{site.event_dates}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <div className={`container grid gap-12 ${aboutGridCols} md:items-start`}>
          <div className="space-y-8">
            <article
              className="prose prose-lg prose-slate max-w-none text-koa"
              dangerouslySetInnerHTML={{ __html: site.about_html ?? '' }}
            />
            {showPurpose ? (
              <div>
                <h3 className="mono text-xs uppercase tracking-[0.35em] text-koa">Purpose Highlights</h3>
                <ul className="card mt-4 space-y-2 p-6 text-sm text-koa shadow-soft">
                  {purposePoints.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-brandGreen" />
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
                  <img src={item.src} alt={item.alt ?? 'Reunion photo'} className="h-48 w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {showSchedule ? (
        <section id="schedule" className="section bg-sand-50">
          <div className="container max-w-5xl">
            <div className="mb-12 text-center">
              <span className="mono text-xs uppercase tracking-[0.3em] text-koa">Weekend Flow</span>
              <h2 className="h2 mt-3">Tentative Schedule</h2>
              <p className="mt-2 text-sm text-koa">
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
                    <p className="mono text-xs uppercase tracking-[0.3em] text-koa">{entry.time}</p>
                    <h3 className="mt-3 text-xl font-semibold text-black">{entry.title}</h3>
                    {agenda.length > 0 ? (
                      <div className="mt-4 space-y-3 text-sm text-koa">
                        {parsedAgenda.map((item, itemIdx) =>
                          hasTimes ? (
                            <div key={`${entry.time}-item-${itemIdx}`} className="grid gap-2 sm:grid-cols-[120px_1fr]">
                              <span
                                className={`mono text-xs font-semibold uppercase tracking-[0.2em] ${
                                  item.time ? 'text-koa' : 'text-slate-300'
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
                      <p className="mt-2 text-sm text-koa">{fallbackDescription}</p>
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
              <span className="mono text-xs uppercase tracking-[0.3em] text-koa">Costs & Planning</span>
              <h2 className="h2 mt-3">Reunion Logistics</h2>
              <p className="mt-2 text-sm text-koa">
                We are keeping registrations as affordable as possible. Thanks for helping with supplies, setup, and hosting.
              </p>
            </div>
            <div className={`grid gap-8 ${showCosts && showLogistics ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
              {showCosts ? (
                <div className="card shadow-soft p-6">
                  <h3 className="text-2xl font-semibold text-black">Cost per Person</h3>
                  <ul className="mt-4 space-y-3 text-sm text-koa">
                    {costOutline.map((item) => (
                      <li key={item.label}>
                        <p className="font-semibold text-black">{item.label}</p>
                        <p>{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="mono mt-4 text-xs uppercase tracking-[0.25em] text-koa">
                    Additional help and donations welcome for venue rentals and supplies.
                  </p>
                </div>
              ) : null}
              {showLogistics ? (
                <div className="card shadow-soft bg-sand-50 p-6">
                  <h3 className="text-2xl font-semibold text-black">Logistics & Support</h3>
                  <ul className="mt-4 space-y-3 text-sm text-koa">
                    {logisticsNotes.map((note) => (
                      <li key={note} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-brandGreen" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-koa">
                    Need help or have updates? Contact Jade Silva at{' '}
                    <a href="mailto:pumehanasilva@mac.com" className="text-brandBlue underline">
                      pumehanasilva@mac.com
                    </a>{' '}
                    or 808-895-6883 (Hawaiʻi time). Mailing: PO Box 10124, Hilo, HI 96721.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}

      <section id="tickets" className="section">
        <div className="container max-w-5xl">
          <div className="mb-12 text-center">
            <span className="mono text-xs uppercase tracking-[0.3em] text-koa">Tickets</span>
            <h2 className="h2 mt-3">Choose Your Pass</h2>
            <p className="mt-2 text-sm text-koa">
              Secure your spot early. Every ticket helps cover venue, meals, and keepsakes.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {tickets.length ? (
              tickets.map((ticket) => (
                <div key={ticket.id} className="card shadow-soft flex h-full flex-col p-6">
                  <span className="mono text-xs uppercase tracking-[0.3em] text-koa">{ticket.name}</span>
                  <p className="mt-4 text-3xl font-semibold text-black">{ticket.priceFormatted}</p>
                  <p className="mt-2 text-sm text-koa">{ticket.description}</p>
                  {typeof ticket.inventory === 'number' && (
                    <p className="mono mt-4 text-xs uppercase tracking-[0.3em] text-brandBlue">
                      {ticket.inventory} spots left
                    </p>
                  )}
                  <Link href={{ pathname: '/register', query: { ticket: ticket.id } }} className="btn mt-auto">
                    Select Ticket
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-3 rounded-2xl border border-dashed border-slate-300 bg-sand-50 p-12 text-center text-koa">
                Ticketing will open soon. Check back shortly!
              </div>
            )}
          </div>
        </div>
      </section>

      {showCommittees ? (
        <section id="committees" className="section bg-sand-50">
          <div className="container max-w-6xl">
            <div className="mb-12 text-center">
              <span className="mono text-xs uppercase tracking-[0.3em] text-koa">Committees & Volunteers</span>
              <h2 className="h2 mt-3">Meet the Planning Committees</h2>
              <p className="mt-2 text-sm text-koa">
                Thank you to the families stepping forward. If you feel called to help, reach out to the committee leads.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {committees.map((committee) => (
                <div key={committee.name} className="card shadow-soft p-6">
                  <p className="mono text-xs uppercase tracking-[0.35em] text-koa">{committee.name}</p>
                  <h3 className="mt-3 text-lg font-semibold text-black">{committee.leads}</h3>
                  <p className="mt-2 text-sm text-koa">{committee.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

    </div>
  );
}
