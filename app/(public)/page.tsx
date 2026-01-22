/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import Countdown from '@/components/public/Countdown';
import HeroCarousel from '@/components/public/HeroCarousel';
import AttendeeMarquee from '@/components/public/AttendeeMarquee';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';

const HERO_IMAGE = '/assets/IMG_0722.JPG';
const WELCOME_CAROUSEL_IMAGES = [
  '/assets/IMG_0644.JPG',
  '/assets/IMG_0647.JPG',
  '/assets/IMG_0721.JPG',
  '/assets/IMG_2937.JPG',
  '/assets/IMG_2972.JPG',
  '/assets/Hilo-1.jpg',
  '/assets/Hilo.jpg',
  '/assets/Keiki_LoiKalo.jpg',
  '/assets/LoiKalo1.jpg',
  '/assets/LoiKalo2.jpeg',
  '/assets/LoiKalo3.jpg',
  '/assets/MaunaKea.jpg'
];

const HERO_TITLE = 'Kekoʻolani Family Reunion 2026';
const HERO_SUBTITLE = 'E hoʻi i ka piko (Let us return to the source).';
const EVENT_DATES = 'July 10 – 12, 2026';
const LOCATION = 'Hilo and Waipiʻo, Hawaiʻi';
const COUNTDOWN_TARGET = '2026-07-10T09:00:00-10:00';

const WELCOME_PARAGRAPHS = [
  'Aloha kākou,',
  'E hoʻi i ka piko (Let us return to the source) is our theme for our 2026 Kekoʻolani family reunion. Come and join us in the beautiful moku of Hilo as we reconnect and strengthen our pilina (closeness) with one another. We invite all of the descendants of Nawai and Emily Kekoʻolani to be part of this reunion.'
];

const OVERVIEW_ITEMS = [
  { label: 'What', value: 'Kekoʻolani Family Reunion' },
  { label: 'Who', value: 'All descendants of Nawai and Emily Kekoʻolani' },
  { label: 'When', value: EVENT_DATES },
  { label: 'Where', value: LOCATION }
];

const SCHEDULE_ENTRIES = [
  {
    time: 'Friday, 7/10/26 · 10:00 am – 3:30 pm',
    title: 'Jade & Meleʻs home in Kaʻūmana',
    items: [
      '10:00 am – 10:30 am Hoʻolauna (Meet & greet)',
      '10:30 am – 11:15 am Genealogy session',
      '11:15 am – 12:00 pm Keiki activities',
      '12:00 pm – 12:45 pm Lunch',
      '12:45 pm – 1:30 pm Moʻolelo with our kūpuna',
      '1:30 pm – 2:15 pm Hula workshops',
      '2:15 pm – 2:45 pm Kanikapila',
      '2:45 pm – 3:30 pm Makahiki games'
    ]
  },
  {
    time: 'Saturday, 7/11/26 · 8:00 am – 3:00 pm',
    title: 'Huakaʻi to Waipiʻo',
    items: [
      '8:00 am – 10:30 am Visit into Waipiʻo valley',
      '11:00 am – 12:30 pm Lunch at Kukuihaele Park',
      '1:00 pm – 2:30 pm Visit Kalopa family graves'
    ]
  },
  {
    time: 'Sunday, 7/12/26 · 9:00 am – 1:00 pm • 4:00 pm – 9:00 pm',
    title: 'Jade & Meleʻs home in Kaʻūmana',
    items: [
      '9:00 am – 10:00 am Visit Alae Cemetery',
      '10:15 am – 11:30 am Hula Workshops / Kanikapila',
      '11:30 am – 12:15 pm Family activities',
      '12:15 pm – 1:00 pm Lunch',
      '4:00 pm – 5:00 pm Family lūʻau',
      '5:30 pm – 6:15 pm Dinner',
      '6:30 pm – 7:15 pm Entertainment',
      '7:15 pm – 8:15 pm Family sharing',
      '8:15 pm – 9:00 pm Closing / A hui hou'
    ]
  }
];

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

const COST_ITEMS = [
  {
    label: 'Meals',
    detail: '$25.00',
    notes: ['Lunch: Friday, Saturday, Sunday', 'Dinner: Sunday', 'All other meals are on your own']
  },
  { label: 'General fund', detail: '$10.00' },
  { label: 'Reunion T-Shirt', detail: '$25.00' }
];

const LODGING_LINKS = [
  {
    label: 'Information for Hilo Hawaiian Hotel group rate',
    href: 'https://drive.google.com/file/d/1iurqFFQYgSl0XTebyLcYZ9MScL7EAYOx/view?usp=drive_link'
  },
  {
    label: 'Hilo Hawaiian Hotel form with group code',
    href: 'https://drive.google.com/file/d/1_tlRIQ5jtG7uWn1XXmIDfzr59vi-NF-p/view?usp=sharing'
  }
];

const GENEALOGY_PARAGRAPHS = [
  'Our moʻokūʻauhau (genealogy) allows us to know who we are, where we come from, and who we are related to. It also connects us to place, events, and moʻolelo that has or may impact our ʻohana. Our dear Aunty Amy, Uncle Henry, and cousin Dean have worked so hard to provide us records of our past. We invite everyone to participate in sharing your genealogy information so that we can update our family records to include the last few generations. This will provide the youngest and the future generations with an updated record of their loving ʻohana.',
  'We will be emailing a PDF fillable form for you to complete, save, and email to Jade Silva (daughter of Winifred). We will also include a letter asking for your authorization to share your information with the rest of the family. We are asking for the genealogy information be submitted by the end of April 2026.'
];

type OrderRow = Database['public']['Tables']['orders']['Row'];

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
    .eq('status', 'paid')
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
        const photo = typeof photos[index] === 'string' ? photos[index] : null;
        const hasPhoto = Boolean(photo);
        const rawShowName = record.show_name;
        const rawShowPhoto = record.show_photo;
        const showName = (typeof rawShowName === 'boolean' ? rawShowName : true) && Boolean(name);
        const showPhoto = (typeof rawShowPhoto === 'boolean' ? rawShowPhoto : hasPhoto) && hasPhoto;

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

export default async function HomePage() {
  const attendeeHighlights = await getAttendeeHighlights();

  return (
    <div>
      <section className="section hero">
        <div className="absolute inset-0">
          <img src={HERO_IMAGE} alt="Waipiʻo Valley" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-emerald-900/50 to-emerald-700/30" />
        </div>
        <div className="container relative z-10 grid gap-12 lg:grid-cols-[3fr,2fr] lg:items-center">
          <div className="space-y-6">
            <span className="hero-tag">E hoʻi i ka piko</span>
            <h1 className="h1 text-balance text-white">{HERO_TITLE}</h1>
            <p className="max-w-xl text-lg text-white/85">{HERO_SUBTITLE}</p>
            <div className="flex flex-col gap-3 text-sm text-white/80 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-emerald-300" />
                <span>{EVENT_DATES}</span>
              </div>
              <div className="flex items-center gap-2">
                <i className="h-2 w-2 rounded-full bg-amber-200" />
                <span>{LOCATION}</span>
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/register" className="btn btn-large w-full sm:w-auto">
                Register
              </Link>
              <a href="/#schedule" className="btn btn-secondary w-full sm:w-auto">
                View Schedule
              </a>
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
                  <Countdown targetIso={COUNTDOWN_TARGET} fallback={EVENT_DATES} />
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
            {WELCOME_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-10 overflow-hidden rounded-3xl border border-sand-200 bg-white/80 shadow-soft">
            <div className="relative h-64 md:h-80">
              <HeroCarousel images={WELCOME_CAROUSEL_IMAGES} />
            </div>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {OVERVIEW_ITEMS.map((item) => (
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

      <section id="schedule" className="section">
        <div className="container max-w-5xl">
          <div className="mb-12 text-center">
            <span className="section-title">Schedule</span>
            <h2 className="h2 mt-3">Three Day Event</h2>
            <p className="mt-2 text-sm text-sand-700">Here is the schedule of events for the three day event.</p>
          </div>
          <div className="grid gap-6">
            {SCHEDULE_ENTRIES.map((entry, idx) => {
              const parsedAgenda = entry.items.map((item) => splitScheduleItem(item));
              const hasTimes = parsedAgenda.some((item) => item.time);

              return (
                <div key={`${entry.time}-${idx}`} className="card shadow-soft p-6 transition hover:-translate-y-1">
                  <p className="section-title">{entry.time}</p>
                  <h3 className="mt-3 text-xl font-semibold text-sand-900">{entry.title}</h3>
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
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container max-w-5xl">
          <div className="mb-10 text-center">
            <span className="section-title">Genealogy</span>
            <h2 className="h2 mt-3">Moʻokūʻauhau</h2>
          </div>
          <div className="card shadow-soft p-8">
            <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white/80">
              <img src="/assets/NawaiandEmily.png" alt="Nawai and Emily Kekoʻolani" className="w-full object-cover" />
            </div>
            <div className="mt-6 space-y-4 text-base text-sand-700">
              {GENEALOGY_PARAGRAPHS.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="logistics" className="section">
        <div className="container max-w-5xl">
          <div className="mb-12 text-center">
            <span className="section-title">Logistics</span>
            <h2 className="h2 mt-3">Planning Details</h2>
          </div>
          <div className="space-y-6">
            <div className="card shadow-soft p-8">
              <h3 className="text-2xl font-semibold text-sand-900">Cost</h3>
              <div className="mt-6 space-y-4 text-base text-sand-700">
                <p>We are trying our best to keep the cost as low as possible.</p>
                <div className="space-y-4">
                  {COST_ITEMS.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-sand-200 bg-white/80 p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold text-sand-900">{item.label}</p>
                        <p className="text-sand-700">{item.detail}</p>
                      </div>
                      {item.notes ? (
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
                <p className="text-lg font-semibold text-sand-900">Total cost each person: $60.00</p>
              </div>
            </div>

            <div className="card shadow-soft p-8">
              <h3 className="text-2xl font-semibold text-sand-900">Lodging</h3>
              <div className="mt-6 space-y-4 text-base text-sand-700">
                <p>
                  Hotel: Hilo Hawaiian Hotel has offered us a group rate. Please click on the link for more information.
                </p>
                <div className="space-y-2">
                  {LODGING_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 underline"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <p>Please feel free to check out the other vacation rentals available on our beautiful island of Hawaiʻi.</p>
                <div>
                  <p>We also have other hotels in Hilo:</p>
                  <ul className="mt-2 space-y-1">
                    <li>Grand Nani Loa</li>
                    <li>SPC Hotel (formally Hilo Seaside)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="card shadow-soft p-8">
              <h3 className="text-2xl font-semibold text-sand-900">Transportation</h3>
              <p className="mt-6 text-base text-sand-700">
                The transportation from the Waipiʻo lookout into the valley will be provided, but all other
                transportation will be on your own.
              </p>
            </div>
          </div>
        </div>
      </section>

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
    </div>
  );
}
