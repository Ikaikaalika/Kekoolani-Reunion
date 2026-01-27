import type { Database } from '@/types/supabase';

export type ScheduleEntry = {
  time: string;
  title: string;
  items?: string[];
  description?: string | null;
};

export type GalleryItem = {
  src: string;
  alt?: string | null;
};

export type CostItem = {
  label: string;
  detail: string;
  notes?: string[];
};

export type CommitteeItem = {
  name: string;
  leads: string;
  notes?: string;
};

export type LodgingLink = {
  label: string;
  href: string;
};

export type SiteExtras = {
  gallery: GalleryItem[];
  costs: CostItem[];
  cost_intro?: string;
  cost_total?: string;
  paypal_handle?: string;
  stripe_account_id?: string;
  lodging: string[];
  lodging_links: LodgingLink[];
  lodging_hotels_heading?: string;
  lodging_hotels: string[];
  transportation: string[];
  genealogy: string[];
  genealogy_image?: GalleryItem | null;
};

const DEFAULT_COST_INTRO = 'Ticket pricing is based on age. T-shirts are $25 each.';
const DEFAULT_COST_TOTAL = '';

const DEFAULT_COSTS: CostItem[] = [
  { label: 'Keiki (0-3)', detail: '$0' },
  { label: 'Keiki (3-10)', detail: '$25.00' },
  { label: 'General (11+)', detail: '$35.00' },
  { label: 'Reunion T-Shirt', detail: '$25.00' }
];

const DEFAULT_LODGING_PARAGRAPHS = [
  'Hotel: Hilo Hawaiian Hotel has offered us a group rate. Please click on the link for more information.',
  'Please feel free to check out the other vacation rentals available on our beautiful island of Hawaiʻi.'
];

const DEFAULT_LODGING_LINKS: LodgingLink[] = [
  {
    label: 'Information for Hilo Hawaiian Hotel group rate',
    href: 'https://drive.google.com/file/d/1iurqFFQYgSl0XTebyLcYZ9MScL7EAYOx/view?usp=drive_link'
  },
  {
    label: 'Hilo Hawaiian Hotel form with group code',
    href: 'https://drive.google.com/file/d/1_tlRIQ5jtG7uWn1XXmIDfzr59vi-NF-p/view?usp=sharing'
  }
];

const DEFAULT_LODGING_HOTELS_HEADING = 'We also have other hotels in Hilo:';
const DEFAULT_LODGING_HOTELS = ['Grand Nani Loa', 'SPC Hotel (formally Hilo Seaside)'];

const DEFAULT_TRANSPORTATION = [
  'The transportation from the Waipiʻo lookout into the valley will be provided, but all other transportation will be on your own.'
];

const DEFAULT_GENEALOGY = [
  'Our moʻokūʻauhau (genealogy) allows us to know who we are, where we come from, and who we are related to. It also connects us to place, events, and moʻolelo that has or may impact our ʻohana. Our dear Aunty Amy, Uncle Henry, and cousin Dean have worked so hard to provide us records of our past. We invite everyone to participate in sharing your genealogy information so that we can update our family records to include the last few generations. This will provide the youngest and the future generations with an updated record of their loving ʻohana.',
  'We will be emailing a PDF fillable form for you to complete, save, and email to Jade Silva (daughter of Winifred). We will also include a letter asking for your authorization to share your information with the rest of the family. We are asking for the genealogy information be submitted by the end of April 2026.'
];

const DEFAULT_GENEALOGY_IMAGE: GalleryItem = {
  src: '/assets/NawaiandEmily.png',
  alt: 'Nawai and Emily Kekoʻolani'
};

const DEFAULT_GALLERY: GalleryItem[] = [
  { src: '/assets/IMG_0644.JPG', alt: 'Kekoolani family gathering' },
  { src: '/assets/IMG_0647.JPG', alt: 'Family reunion moment' },
  { src: '/assets/IMG_2937.JPG', alt: 'Hilo shoreline' },
  { src: '/assets/IMG_2972.JPG', alt: 'Family photo' },
  { src: '/assets/Hilo-1.jpg', alt: 'Hilo landscape' },
  { src: '/assets/Hilo.jpg', alt: 'Hilo shoreline' },
  { src: '/assets/Keiki_LoiKalo.jpg', alt: 'Keiki learning in the loʻi' },
  { src: '/assets/LoiKalo1.jpg', alt: 'Loʻi kalo in Waipiʻo' },
  { src: '/assets/LoiKalo2.jpeg', alt: 'Loʻi kalo in Waipiʻo' },
  { src: '/assets/LoiKalo3.jpg', alt: 'Loʻi kalo in Waipiʻo' },
  { src: '/assets/MaunaKea.jpg', alt: 'Mauna Kea' }
];

const DEFAULT_HERO_TITLE = 'Kekoʻolani Family Reunion 2026';
const DEFAULT_HERO_SUBTITLE = 'E hoʻi i ka piko (Let us return to the source).';
const DEFAULT_EVENT_DATES = 'July 10 – 12, 2026';
const DEFAULT_LOCATION = 'Hilo and Waipiʻo, Hawaiʻi';
const DEFAULT_ABOUT_TEXT =
  "Aloha kākou,\n\nE hoʻi i ka piko (Let us return to the source) is our theme for our 2026 Kekoʻolani family reunion. Come and join us in the beautiful moku of Hilo as we reconnect and strengthen our pilina (closeness) with one another. We invite all of the descendants of Nawai and Emily Kekoʻolani to be part of this reunion.";

const DEFAULT_SCHEDULE: ScheduleEntry[] = [
  {
    time: 'Friday, 7/10/26 · 10:00 am – 3:30 pm',
    title: 'Jade & Meleʻs home in Kaʻūmana',
    items: [
      '10:00 am Hoʻolauna (Meet & greet)',
      '10:30 am Genealogy session',
      '11:15 am Keiki activities',
      '12:00 pm Lunch',
      '12:45 pm Moʻolelo with our kūpuna',
      '1:30 pm Hula workshops',
      '2:15 pm Kanikapila',
      '2:45 pm Makahiki games'
    ]
  },
  {
    time: 'Saturday, 7/11/26 · 8:00 am – 3:00 pm',
    title: 'Huakaʻi to Waipiʻo',
    items: [
      '8:00 am Visit into Waipiʻo valley',
      '11:00 am Lunch at Kukuihaele Park',
      '1:00 pm Visit Kalopa family graves'
    ]
  },
  {
    time: 'Sunday, 7/12/26 · 9:00 am – 1:00 pm • 4:00 pm – 9:00 pm',
    title: 'Jade & Meleʻs home in Kaʻūmana · The Arc of Hilo',
    items: [
      '9:00 am Visit Alae Cemetery',
      '10:15 am Hula Workshops / Kanikapila',
      '11:30 am Family activities',
      '12:15 pm Lunch',
      '4:00 pm Family lūʻau — The Arc of Hilo',
      '5:30 pm Dinner — The Arc of Hilo',
      '6:30 pm Entertainment — The Arc of Hilo',
      '7:15 pm Family sharing — The Arc of Hilo',
      '8:15 pm Closing / A hui hou — The Arc of Hilo'
    ]
  }
];

export const DEFAULT_EXTRAS: SiteExtras = {
  gallery: DEFAULT_GALLERY,
  costs: DEFAULT_COSTS,
  cost_intro: DEFAULT_COST_INTRO,
  cost_total: DEFAULT_COST_TOTAL,
  paypal_handle: '',
  stripe_account_id: '',
  lodging: DEFAULT_LODGING_PARAGRAPHS,
  lodging_links: DEFAULT_LODGING_LINKS,
  lodging_hotels_heading: DEFAULT_LODGING_HOTELS_HEADING,
  lodging_hotels: DEFAULT_LODGING_HOTELS,
  transportation: DEFAULT_TRANSPORTATION,
  genealogy: DEFAULT_GENEALOGY,
  genealogy_image: DEFAULT_GENEALOGY_IMAGE
};

function toGalleryItem(value: unknown): GalleryItem | null {
  if (typeof value === 'string') {
    return { src: value, alt: null };
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const src = typeof record.src === 'string' ? record.src : undefined;
    if (!src) return null;
    return {
      src,
      alt: typeof record.alt === 'string' ? record.alt : null
    };
  }
  return null;
}

function toGalleryItems(value: unknown): GalleryItem[] {
  if (!Array.isArray(value)) {
    return DEFAULT_GALLERY;
  }

  const items = value.map((item) => toGalleryItem(item)).filter(Boolean) as GalleryItem[];

  return items.length ? items : DEFAULT_GALLERY;
}

export function parseSchedule(value: unknown): ScheduleEntry[] {
  if (!Array.isArray(value)) {
    return DEFAULT_SCHEDULE;
  }

  const parsed = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const time = typeof record.time === 'string' ? record.time : '';
      const title = typeof record.title === 'string' ? record.title : '';
      if (!time && !title) return null;

      const rawItems = record.items;
      let items: string[] | undefined;
      if (Array.isArray(rawItems)) {
        items = rawItems
          .map((item) => (typeof item === 'string' ? item : null))
          .filter((item): item is string => Boolean(item));
      }

      const description = typeof record.description === 'string' ? record.description : undefined;

      if ((!items || !items.length) && description) {
        items = description
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
      }

      return {
        time,
        title,
        items,
        description: description ?? null
      } as ScheduleEntry;
    })
    .filter((entry): entry is ScheduleEntry => Boolean(entry));

  return parsed.length ? parsed : DEFAULT_SCHEDULE;
}

export function parseExtras(raw: unknown): SiteExtras {
  if (!raw) {
    return DEFAULT_EXTRAS;
  }

  if (Array.isArray(raw)) {
    return {
      ...DEFAULT_EXTRAS,
      gallery: toGalleryItems(raw)
    };
  }

  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const gallery = 'gallery' in record ? toGalleryItems(record.gallery) : DEFAULT_EXTRAS.gallery;
    const costs = Array.isArray(record.costs)
      ? record.costs
          .map((item): CostItem | null => {
            if (!item || typeof item !== 'object') return null;
            const cost = item as Record<string, unknown>;
            const label = typeof cost.label === 'string' ? cost.label : null;
            const detail = typeof cost.detail === 'string' ? cost.detail : null;
            if (!label || !detail) return null;
            const notes = Array.isArray(cost.notes)
              ? cost.notes.filter((note): note is string => typeof note === 'string')
              : undefined;
            return notes && notes.length ? { label, detail, notes } : { label, detail };
          })
          .filter((item): item is CostItem => Boolean(item))
      : DEFAULT_EXTRAS.costs;
    const costIntro = typeof record.cost_intro === 'string' ? record.cost_intro : DEFAULT_EXTRAS.cost_intro;
    const costTotal = typeof record.cost_total === 'string' ? record.cost_total : DEFAULT_EXTRAS.cost_total;
    const paypalHandle =
      typeof record.paypal_handle === 'string' ? record.paypal_handle : DEFAULT_EXTRAS.paypal_handle;
    const stripeAccountId =
      typeof record.stripe_account_id === 'string' ? record.stripe_account_id : DEFAULT_EXTRAS.stripe_account_id;

    const lodging = Array.isArray(record.lodging)
      ? record.lodging.filter((item): item is string => typeof item === 'string')
      : DEFAULT_EXTRAS.lodging;
    const lodgingLinks = Array.isArray(record.lodging_links)
      ? record.lodging_links
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const link = item as Record<string, unknown>;
            const label = typeof link.label === 'string' ? link.label : null;
            const href = typeof link.href === 'string' ? link.href : null;
            if (!label || !href) return null;
            return { label, href };
          })
          .filter((item): item is LodgingLink => Boolean(item))
      : DEFAULT_EXTRAS.lodging_links;
    const lodgingHotelsHeading =
      typeof record.lodging_hotels_heading === 'string'
        ? record.lodging_hotels_heading
        : DEFAULT_EXTRAS.lodging_hotels_heading;
    const lodgingHotels = Array.isArray(record.lodging_hotels)
      ? record.lodging_hotels.filter((item): item is string => typeof item === 'string')
      : DEFAULT_EXTRAS.lodging_hotels;

    const transportation = Array.isArray(record.transportation)
      ? record.transportation.filter((item): item is string => typeof item === 'string')
      : DEFAULT_EXTRAS.transportation;

    const genealogy = Array.isArray(record.genealogy)
      ? record.genealogy.filter((item): item is string => typeof item === 'string')
      : DEFAULT_EXTRAS.genealogy;

    const genealogyImage = record.genealogy_image ? toGalleryItem(record.genealogy_image) : DEFAULT_EXTRAS.genealogy_image;

    return {
      gallery,
      costs: costs.length ? costs : DEFAULT_EXTRAS.costs,
      cost_intro: costIntro ?? DEFAULT_EXTRAS.cost_intro,
      cost_total: costTotal ?? DEFAULT_EXTRAS.cost_total,
      paypal_handle: paypalHandle ?? DEFAULT_EXTRAS.paypal_handle,
      stripe_account_id: stripeAccountId ?? DEFAULT_EXTRAS.stripe_account_id,
      lodging: lodging.length ? lodging : DEFAULT_EXTRAS.lodging,
      lodging_links: lodgingLinks.length ? lodgingLinks : DEFAULT_EXTRAS.lodging_links,
      lodging_hotels_heading: lodgingHotelsHeading ?? DEFAULT_EXTRAS.lodging_hotels_heading,
      lodging_hotels: lodgingHotels.length ? lodgingHotels : DEFAULT_EXTRAS.lodging_hotels,
      transportation: transportation.length ? transportation : DEFAULT_EXTRAS.transportation,
      genealogy: genealogy.length ? genealogy : DEFAULT_EXTRAS.genealogy,
      genealogy_image: genealogyImage ?? DEFAULT_EXTRAS.genealogy_image
    };
  }

  return DEFAULT_EXTRAS;
}

export function aboutHtmlToText(html: string | null): string {
  if (!html) return '';
  return html
    .replace(/<\/?p>/g, '\n')
    .replace(/<br\s*\/?\s*>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function textToAboutHtml(text: string): string {
  if (!text) return '';
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return `<p>${text.trim()}</p>`;
  }

  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('');
}

export type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

export function getSiteExtras(record: SiteSettingsRow | null): SiteExtras {
  return parseExtras(record?.gallery_json ?? null);
}

export function getSiteSchedule(record: SiteSettingsRow | null): ScheduleEntry[] {
  return parseSchedule(record?.schedule_json ?? null);
}

export const SITE_DEFAULTS = {
  hero_title: DEFAULT_HERO_TITLE,
  hero_subtitle: DEFAULT_HERO_SUBTITLE,
  event_dates: DEFAULT_EVENT_DATES,
  location: DEFAULT_LOCATION,
  about_html: textToAboutHtml(DEFAULT_ABOUT_TEXT),
  costs: DEFAULT_COSTS,
  cost_intro: DEFAULT_COST_INTRO,
  cost_total: DEFAULT_COST_TOTAL,
  lodging: DEFAULT_LODGING_PARAGRAPHS,
  lodging_links: DEFAULT_LODGING_LINKS,
  lodging_hotels_heading: DEFAULT_LODGING_HOTELS_HEADING,
  lodging_hotels: DEFAULT_LODGING_HOTELS,
  transportation: DEFAULT_TRANSPORTATION,
  genealogy: DEFAULT_GENEALOGY,
  genealogy_image: DEFAULT_GENEALOGY_IMAGE,
  gallery: DEFAULT_GALLERY,
  schedule: DEFAULT_SCHEDULE
};
