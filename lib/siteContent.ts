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
};

export type CommitteeItem = {
  name: string;
  leads: string;
  notes?: string;
};

export type SiteExtras = {
  gallery: GalleryItem[];
  purpose: string[];
  costs: CostItem[];
  logistics: string[];
  committees: CommitteeItem[];
};

const DEFAULT_PURPOSE = [
  'Mahalo our kūpuna for anchoring us in faith, service, and aloha ʻohana.',
  'Strengthen pilina among cousins by sharing moʻolelo, genealogy, and kuleana.',
  'Hānai the next generation so they know their kūpuna, ʻāina, and where they belong.',
  'Celebrate the talents within our ʻohana through mele, hula, and mea ʻai. '
];

const DEFAULT_COSTS: CostItem[] = [
  { label: 'Three lunches (Fri–Sun)', detail: '$30 per person · prepared by ʻohana volunteers' },
  { label: 'Sunday evening lūʻau', detail: '$25 per person at The Arc of Hilo' },
  { label: 'Reunion shirts', detail: '$20–$26 (cotton or active wear options by Stanson/Nawai)' }
];

const DEFAULT_LOGISTICS = [
  'Off-island ʻohana to arrange airfare, lodging, and transportation; host-home kōkua forthcoming.',
  'Set-up at Jade & Meleʻs hale on Thursday (July 9) and break-down on Monday (July 13).',
  'Kukuihaele pavilion reservation and Waipiʻo transportation coordinated by the Nawailiʻiliʻi ʻohana.'
];

const DEFAULT_COMMITTEES: CommitteeItem[] = [
  {
    name: 'Kākau Inoa / Registration',
    leads: 'Jade & Alika Gee',
    notes: 'Campaign emails, online form, shirt orders, and payment flow.'
  },
  {
    name: 'Hale Prep & Breakdown',
    leads: 'Kahealani Silva, Silva ʻohana, Makana Chartrand ʻohana, Amy Girl/Brown ʻohana',
    notes: 'Tents, tables, chairs, and porta potties (set-up Thu 7/9, break-down Mon 7/13).'
  },
  {
    name: 'Lūʻau Decorations',
    leads: 'Naia & Kahealani',
    notes: 'Simple centerpieces and lāʻau décor for The Arc.'
  },
  {
    name: 'Meals & Drinks',
    leads: 'Kelsye (Fri lunch), Bento crew (Sat), Sandwich crew (Sun), Hina (lūʻau)',
    notes: 'Amy Girl assisting with paper goods and kitchen needs.'
  },
  {
    name: 'Genealogy & Storytelling',
    leads: 'Jade, Kanani, Tete, Stallone, Rachel',
    notes: 'Digital genealogy file, fillable PDFs, talk-story facilitation.'
  },
  {
    name: 'Waipiʻo & Graves Huakaʻi',
    leads: 'Amy Girl, Nawailiʻiliʻi, Kaʻai',
    notes: 'Coordinate valley access, kupuna transport, and work days beforehand.'
  },
  {
    name: 'Activities & Hoʻike',
    leads: 'Silva ʻohana, Stallone, Makana, Mele',
    notes: 'Lei making, makahiki games, hula workshops, ʻohana sharing and MC.'
  },
  {
    name: 'Media & Kōkua',
    leads: 'Family representatives, Kahealani/Cedric',
    notes: 'Collect 3–5 minute digital ʻohana stories and archive photos.'
  }
];

const DEFAULT_GALLERY: GalleryItem[] = [
  { src: 'https://images.unsplash.com/photo-1583274606759-5a4f18c16ca2?auto=format&fit=crop&w=900&q=80', alt: 'Waipiʻo Valley lookout' },
  { src: 'https://images.unsplash.com/photo-1529400971008-f566de0e6dfc?auto=format&fit=crop&w=900&q=80', alt: 'ʻOhana lei making activity' },
  { src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80', alt: 'Evening gathering under pāʻina lights' }
];

const DEFAULT_SCHEDULE: ScheduleEntry[] = [
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
      '1:30p Kalopa cemetery visit · optional ʻAlae graves visit',
      'Alternate in-town activities (Coconut Island) under discussion'
    ]
  },
  {
    time: 'Sunday · July 12, 2026',
    title: 'ʻOhana Lūʻau & Hoʻike Evening',
    items: [
      '10:00a Activities & talk story at Jade & Meleʻs home',
      '12:00p Lunch then prepare for evening lūʻau',
      '2:00p Decor crew at The Arc · 3:00p ʻOhana arrival and pūpū',
      '6:00p Lūʻau dinner · 7:00p ʻOhana sharing & performances',
      '9:00p Closing circle · A hui hou'
    ]
  }
];

export const DEFAULT_EXTRAS: SiteExtras = {
  gallery: DEFAULT_GALLERY,
  purpose: DEFAULT_PURPOSE,
  costs: DEFAULT_COSTS,
  logistics: DEFAULT_LOGISTICS,
  committees: DEFAULT_COMMITTEES
};

function toGalleryItems(value: unknown): GalleryItem[] {
  if (!Array.isArray(value)) {
    return DEFAULT_GALLERY;
  }

  const items = value
    .map((item) => {
      if (typeof item === 'string') {
        return { src: item, alt: null };
      }
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const src = typeof record.src === 'string' ? record.src : undefined;
        if (!src) return null;
        return {
          src,
          alt: typeof record.alt === 'string' ? record.alt : null
        };
      }
      return null;
    })
    .filter(Boolean) as GalleryItem[];

  return items;
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
    const purpose = Array.isArray(record.purpose)
      ? record.purpose.filter((item): item is string => typeof item === 'string')
      : DEFAULT_EXTRAS.purpose;
    const costs = Array.isArray(record.costs)
      ? record.costs
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const cost = item as Record<string, unknown>;
            const label = typeof cost.label === 'string' ? cost.label : null;
            const detail = typeof cost.detail === 'string' ? cost.detail : null;
            if (!label || !detail) return null;
            return { label, detail };
          })
          .filter((item): item is CostItem => Boolean(item))
      : DEFAULT_EXTRAS.costs;
    const logistics = Array.isArray(record.logistics)
      ? record.logistics.filter((item): item is string => typeof item === 'string')
      : DEFAULT_EXTRAS.logistics;
    const committees = Array.isArray(record.committees)
      ? record.committees
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const committee = item as Record<string, unknown>;
            const name = typeof committee.name === 'string' ? committee.name : null;
            const leads = typeof committee.leads === 'string' ? committee.leads : null;
            if (!name || !leads) return null;
            return {
              name,
              leads,
              notes: typeof committee.notes === 'string' ? committee.notes : undefined
            } as CommitteeItem;
          })
          .filter((item): item is CommitteeItem => Boolean(item))
      : DEFAULT_EXTRAS.committees;

    return {
      gallery,
      purpose: purpose.length ? purpose : DEFAULT_EXTRAS.purpose,
      costs: costs.length ? costs : DEFAULT_EXTRAS.costs,
      logistics: logistics.length ? logistics : DEFAULT_EXTRAS.logistics,
      committees: committees.length ? committees : DEFAULT_EXTRAS.committees
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
  purpose: DEFAULT_PURPOSE,
  costs: DEFAULT_COSTS,
  logistics: DEFAULT_LOGISTICS,
  committees: DEFAULT_COMMITTEES,
  gallery: DEFAULT_GALLERY,
  schedule: DEFAULT_SCHEDULE
};
