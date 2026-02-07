/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import Image from 'next/image';
import path from 'path';
import { readdirSync } from 'fs';
import Countdown from '@/components/public/Countdown';
import HeroCarousel from '@/components/public/HeroCarousel';
import AttendeeMarquee from '@/components/public/AttendeeMarquee';
import SectionRenderer from '@/components/public/SectionRenderer';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { SITE_SETTINGS_ID } from '@/lib/constants';
import { aboutHtmlToText, getSiteExtras, getSiteSchedule, SITE_DEFAULTS, DEFAULT_EXTRAS } from '@/lib/siteContent';
import { normalizeSectionList } from '@/lib/sections';
import type { Database } from '@/types/supabase';

const HERO_IMAGE = '/assets/LoiKalo1.jpg';

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

type OrderRow = Database['public']['Tables']['orders']['Row'];
type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

type AttendeeHighlight = {
  name?: string | null;
  photoUrl?: string | null;
  showName: boolean;
  showPhoto: boolean;
  lineage?: string | null;
};

async function getAttendeeHighlights(): Promise<AttendeeHighlight[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from('orders')
    .select('purchaser_name, form_answers, status, created_at')
    .in('status', ['paid', 'pending'])
    .order('created_at', { ascending: false })
    .limit(40);

  if (error || !data) return [];

  const highlights: AttendeeHighlight[] = [];

  for (const row of data as OrderRow[]) {
    const answers = row.form_answers && typeof row.form_answers === 'object' ? (row.form_answers as Record<string, unknown>) : {};
    const people = Array.isArray(answers.people) ? answers.people : [];
    const photos = Array.isArray(answers.photo_urls) ? answers.photo_urls : [];

    if (people.length) {
      for (let index = 0; index < people.length; index += 1) {
        const person = people[index];
        const record = person && typeof person === 'object' ? (person as Record<string, unknown>) : {};
        const name =
          typeof record.full_name === 'string'
            ? record.full_name
            : typeof record.name === 'string'
              ? record.name
              : '';
        const lineage = typeof record.lineage === 'string' ? record.lineage : null;
        const isAttending = record.attending !== false;
        const isRefunded = record.refunded === true;
        const photo = typeof photos[index] === 'string' ? photos[index] : null;
        const hasPhoto = Boolean(photo);
        const rawShowName = record.show_name;
        const rawShowPhoto = record.show_photo;
        const showName = (typeof rawShowName === 'boolean' ? rawShowName : true) && Boolean(name);
        const showPhoto = (typeof rawShowPhoto === 'boolean' ? rawShowPhoto : hasPhoto) && hasPhoto;

        if (!isAttending || isRefunded) {
          continue;
        }

        if (!showName && !showPhoto) {
          continue;
        }

        highlights.push({
          name: showName ? name : null,
          photoUrl: showPhoto ? photo : null,
          showName,
          showPhoto,
          lineage
        });
        if (highlights.length >= 40) return highlights;
      }
    } else if (typeof row.purchaser_name === 'string' && row.purchaser_name.trim()) {
      highlights.push({
        name: row.purchaser_name.trim(),
        photoUrl: null,
        showName: true,
        showPhoto: false,
        lineage: null
      });
      if (highlights.length >= 40) return highlights;
    }
  }

  return highlights;
}

async function getSiteContent() {
  const supabase = createSupabaseServerClient();
  const [{ data }, { data: sectionsData }] = await Promise.all([
    supabase
    .from('site_settings')
    .select('*')
    .eq('id', SITE_SETTINGS_ID)
    .maybeSingle<SiteSettingsRow>(),
    supabase
      .from('content_sections')
      .select('*')
      .eq('published', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
  ]);

  const extras = getSiteExtras(data ?? null);
  const schedule = getSiteSchedule(data ?? null);
  const aboutSource = data?.about_html ?? SITE_DEFAULTS.about_html ?? '';
  const aboutText = aboutHtmlToText(aboutSource);
  const welcomeParagraphs = aboutText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    site: data,
    extras,
    schedule,
    welcomeParagraphs,
    sections: normalizeSectionList(sectionsData ?? [])
  };
}

function getPublicGalleryAssets() {
  const assetsDir = path.join(process.cwd(), 'public', 'assets', 'carousel');
  const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm', '.mov']);
  const toAlt = (filename: string) => {
    const base = filename.replace(/\.[^/.]+$/, '');
    const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'Reunion highlight';
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
  };
  try {
    return readdirSync(assetsDir)
      .filter((file) => supported.has(path.extname(file).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => ({ src: `/assets/carousel/${file}`, alt: toAlt(file) }));
  } catch (error) {
    return [];
  }
}

function getGenealogyPdfLinks() {
  const assetsDir = path.join(process.cwd(), 'public', 'assets', 'email');
  const toLabel = (filename: string) =>
    filename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  try {
    return readdirSync(assetsDir)
      .filter((file) => path.extname(file).toLowerCase() === '.pdf')
      .sort((a, b) => a.localeCompare(b))
      .map((file) => ({
        label: toLabel(file) || 'Genealogy PDF',
        href: `/assets/email/${encodeURIComponent(file)}`
      }));
  } catch (error) {
    return [];
  }
}

function isLocalAsset(src?: string | null) {
  return typeof src === 'string' && src.startsWith('/');
}

export default async function HomePage() {
  const [attendeeHighlights, siteContent] = await Promise.all([getAttendeeHighlights(), getSiteContent()]);
  const { site, extras, schedule, welcomeParagraphs, sections } = siteContent;
  const galleryAssets = getPublicGalleryAssets();
  const genealogyPdfLinks = getGenealogyPdfLinks();

  const heroTitle = site?.hero_title ?? SITE_DEFAULTS.hero_title;
  const heroSubtitle = site?.hero_subtitle ?? SITE_DEFAULTS.hero_subtitle ?? '';
  const eventDates = site?.event_dates ?? SITE_DEFAULTS.event_dates ?? '';
  const location = site?.location ?? SITE_DEFAULTS.location ?? '';
  const overviewItems = [
    { label: 'What', value: heroTitle },
    { label: 'Who', value: 'All descendants of Nawai and Emily Kekoʻolani' },
    { label: 'When', value: eventDates },
    { label: 'Where', value: location }
  ];

  const showSchedule = site?.show_schedule ?? true;
  const showCarousel = site?.show_gallery ?? true;
  const showGenealogy = site?.show_purpose ?? true;
  const showCosts = site?.show_costs ?? true;
  const showLogistics = site?.show_logistics ?? true;
  const showCta = site?.show_committees ?? true;
  const showLogisticsSection = showLogistics || showCosts;

  const costIntro = extras.cost_intro ?? '';
  const costTotal = extras.cost_total ?? '';
  const registrationDeadline = extras.registration_deadline ?? DEFAULT_EXTRAS.registration_deadline ?? '';
  const countdownTarget = extras.countdown_target ?? DEFAULT_EXTRAS.countdown_target ?? '';
  const lodgingParagraphs = extras.lodging ?? [];
  const lodgingLinks = extras.lodging_links ?? [];
  const lodgingHotelsHeading = extras.lodging_hotels_heading ?? '';
  const lodgingHotels = extras.lodging_hotels ?? [];
  const lodgingIntro = lodgingParagraphs[0] ?? '';
  const lodgingAfterLinks = lodgingParagraphs.slice(1);
  const transportationNotes = extras.transportation ?? [];
  const genealogyImage = extras.genealogy_image;

  return (
    <div>
      <section className="section hero">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Waipiʻo Valley"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-emerald-900/50 to-emerald-700/30" />
        </div>
        <div className="container relative z-10 grid gap-12 lg:grid-cols-[3fr,2fr] lg:items-center">
          <div className="space-y-6">
            <span className="hero-tag">E hoʻi i ka piko</span>
            <h1 className="h1 text-balance text-white">{heroTitle}</h1>
            {heroSubtitle ? <p className="max-w-xl text-lg text-white/85">{heroSubtitle}</p> : null}
            <div className="flex flex-col gap-3 text-sm text-white/80 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-emerald-300" />
                <span>{eventDates}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-amber-200" />
                <span>{location}</span>
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
            {registrationDeadline ? (
              <p className="text-lg font-semibold text-white md:text-xl">
                Deadline to Register is {registrationDeadline}.
              </p>
            ) : null}
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
                  <Countdown targetIso={countdownTarget} fallback={eventDates} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="section">
        <div className="container max-w-5xl">
          <div className="mb-10 text-center">
            <span className="section-title">Welcome</span>
            <h2 className="h2 mt-3">Aloha kākou</h2>
          </div>
          <div className="space-y-4 text-base text-sand-700">
            {welcomeParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {showCarousel && galleryAssets.length ? (
            <div className="mt-10 overflow-hidden rounded-3xl border border-sand-200 bg-white/80 shadow-soft">
              <div className="relative h-64 md:h-80">
                <HeroCarousel images={galleryAssets} />
              </div>
            </div>
          ) : null}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {overviewItems.map((item) => (
              <div key={item.label} className="card shadow-soft p-6">
                <p className="mono text-xs uppercase tracking-[0.3em] text-sand-600">{item.label}</p>
                <p className="mt-3 text-lg font-semibold text-sand-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container max-w-6xl">
          <div className="mb-10 text-center">
            <span className="section-title">ʻOhana</span>
            <h2 className="h2 mt-3">Who Else Is Coming</h2>
            <p className="mt-2 text-sm text-sand-700">
              See the growing list of relatives who have already registered.
            </p>
          </div>
        </div>
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
          <AttendeeMarquee attendees={attendeeHighlights} />
        </div>
      </section>

      {showSchedule ? (
        <section id="schedule" className="section">
          <div className="container max-w-5xl">
            <div className="mb-12 text-center">
              <span className="section-title">Schedule</span>
              <h2 className="h2 mt-3">Tentative Schedule</h2>
              <p className="mt-2 text-sm text-sand-700">Here is the tentative schedule for the reunion weekend.</p>
            </div>
            <div className="grid gap-6">
              {schedule.map((entry, idx) => {
                const agendaItems = entry.items?.length ? entry.items : entry.description ? [entry.description] : [];
                const parsedAgenda = agendaItems.map((item) => splitScheduleItem(item));
                const hasTimes = parsedAgenda.some((item) => item.time);
                const lowerTime = entry.time.toLowerCase();
                const isSundayArc = lowerTime.includes('sunday');
                const isSaturday = lowerTime.includes('saturday');

                return (
                  <div key={`${entry.time}-${idx}`} className="card shadow-soft p-6 transition hover:-translate-y-1">
                    <p className="section-title">{entry.time}</p>
                    <h3 className="mt-3 text-xl font-semibold text-sand-900">{entry.title}</h3>
                    {isSundayArc && (
                      <div className="mt-3 text-sm text-sand-700">
                        <p className="font-semibold text-sand-900">The Arc of Hilo</p>
                        <p>1099 Waianuenue Ave.</p>
                        <p>Hilo, HI 96720-2019</p>
                      </div>
                    )}
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
                    {isSundayArc && (
                      <div className="mt-6 overflow-hidden rounded-2xl border border-sand-200 bg-white/80">
                        <iframe
                          title="The Arc of Hilo map"
                          src="https://www.google.com/maps?q=The%20Arc%20of%20Hilo%2C%201099%20Waianuenue%20Ave.%2C%20Hilo%2C%20HI%2096720-2019&output=embed"
                          className="h-64 w-full"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    )}
                    {isSaturday && (
                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white/80">
                          <iframe
                            title="Waipio Valley Lookout map"
                            src="https://www.google.com/maps?q=Waipi%CA%BBo%20Valley%20Lookout%2C%20Kukuihaele%2C%20HI&output=embed"
                            className="h-56 w-full"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white/80">
                          <iframe
                            title="Kukuihaele Park map"
                            src="https://www.google.com/maps?q=Kukuihaele%20Park%2C%20Kukuihaele%2C%20HI&output=embed"
                            className="h-56 w-full"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!schedule.length && (
                <div className="card shadow-soft p-6 text-center text-sm text-sand-700">
                  Schedule details will be shared soon.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {showGenealogy ? (
        <section id="genealogy" className="section section-alt">
          <div className="container max-w-5xl">
            <div className="mb-10 text-center">
              <span className="section-title">Genealogy</span>
              <h2 className="h2 mt-3">Moʻokūʻauhau</h2>
            </div>
            <div className="card shadow-soft p-8">
              <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white/80">
                {genealogyImage?.src ? (
                  isLocalAsset(genealogyImage.src) ? (
                    <Image
                      src={genealogyImage.src}
                      alt={genealogyImage.alt ?? 'Nawai and Emily Kekoʻolani'}
                      width={1200}
                      height={800}
                      className="w-full object-cover"
                    />
                  ) : (
                    <img
                      src={genealogyImage.src}
                      alt={genealogyImage.alt ?? 'Nawai and Emily Kekoʻolani'}
                      className="w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-sand-400">
                    Photo coming soon
                  </div>
                )}
              </div>
              <div className="mt-6 space-y-4 text-base text-sand-700">
                {extras.genealogy.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {genealogyPdfLinks.length ? (
                <div className="mt-6 rounded-2xl border border-sand-200 bg-white/80 p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-sand-500">Genealogy PDFs</p>
                  <ul className="mt-3 space-y-2 text-base text-sand-700">
                    {genealogyPdfLinks.map((link) => (
                      <li key={link.href}>
                        <a href={link.href} className="text-emerald-700 underline">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {showLogisticsSection ? (
        <section id="logistics" className="section">
          <div className="container max-w-5xl">
            <div className="mb-12 text-center">
              <h2 className="h2">Logistics and Planning</h2>
            </div>
            <div className="space-y-6">
              {showCosts ? (
                <div className="card shadow-soft p-8">
                  <h3 className="text-2xl font-semibold text-sand-900">Cost</h3>
                  <div className="mt-6 space-y-4 text-base text-sand-700">
                    {costIntro ? <p>{costIntro}</p> : null}
                    <div className="space-y-4">
                      {extras.costs.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="rounded-2xl border border-sand-200 bg-white/80 p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-semibold text-sand-900">{item.label}</p>
                            <p className="text-sand-700">{item.detail}</p>
                          </div>
                          {item.notes?.length ? (
                            <ul className="mt-3 space-y-1 text-sm text-sand-700">
                              {item.notes.map((note) => (
                                <li key={note} className="flex items-start gap-2">
                                  <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-emerald-500" />
                                  <span>{note}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {costTotal ? <p className="text-lg font-semibold text-sand-900">{costTotal}</p> : null}
                  </div>
                </div>
              ) : null}

              {showLogistics ? (
                <div className="card shadow-soft p-8">
                  <h3 className="text-2xl font-semibold text-sand-900">Lodging</h3>
                  <div className="mt-6 space-y-4 text-base text-sand-700">
                    {lodgingIntro ? <p>{lodgingIntro}</p> : null}
                    {lodgingLinks.length ? (
                      <div className="space-y-2">
                        {lodgingLinks.map((link) => (
                          <a
                            key={link.href}
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-emerald-700 underline"
                          >
                            {link.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {lodgingAfterLinks.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {lodgingHotelsHeading ? <p>{lodgingHotelsHeading}</p> : null}
                    {lodgingHotels.length ? (
                      <ul className="mt-2 space-y-1">
                        {lodgingHotels.map((hotel) => (
                          <li key={hotel}>{hotel}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {showLogistics ? (
                <div className="card shadow-soft p-8">
                  <h3 className="text-2xl font-semibold text-sand-900">Transportation</h3>
                  <div className="mt-6 space-y-4 text-base text-sand-700">
                    {transportationNotes.map((note, index) => (
                      <p key={`${index}-${note}`} className="whitespace-pre-line">
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {sections.length
        ? sections.map((section) => <SectionRenderer key={section.id} section={section} />)
        : null}

      {showCta ? (
        <section className="section section-alt">
          <div className="container max-w-3xl text-center">
            <h2 className="h2">Ready to Register?</h2>
            <p className="mt-3 text-sm text-sand-700">
              Share your family details so we can plan meals, activities, and keepsakes for everyone attending.
            </p>
            <Link href="/register" className="btn btn-large mt-6">
              Register Now
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
