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
  'E hoʻi i ka piko: return to the source and reconnect as one ʻohana.',
  'Strengthen our pilina (closeness) across generations in Hilo and Waipiʻo.',
  'Share moʻolelo and moʻokūʻauhau to honor the legacy of Nawai and Emily Kekoʻolani.',
  'Celebrate together through hula, kanikapila, and family activities.'
];

const DEFAULT_COSTS: CostItem[] = [
  {
    label: 'Meals',
    detail: '$25.00 (Lunch: Friday, Saturday, Sunday; Dinner: Sunday; all other meals on your own)'
  },
  { label: 'General fund', detail: '$10.00' },
  { label: 'Reunion T-shirt', detail: '$25.00' },
  { label: 'Total cost per person', detail: '$60.00' }
];

const DEFAULT_LOGISTICS = [
  'Lodging: Hilo Hawaiian Hotel group rate available (links above). Other Hilo options include Grand Naniloa and SCP Hotel (formerly Hilo Seaside), plus vacation rentals.',
  'Transportation: Waipiʻo lookout transportation into the valley is provided; all other transportation is on your own.',
  'Genealogy: Fillable PDF form due by end of April 2026 so we can update family records for future generations.',
  'Registration includes participant details, attendance days, T-shirt sizes, and a donation note for the Kekoʻolani Trust fund.'
];

const DEFAULT_COMMITTEES: CommitteeItem[] = [];

const DEFAULT_GALLERY: GalleryItem[] = [
  { src: '/assets/Hilo.jpg', alt: 'Hilo shoreline' },
  { src: '/assets/LoiKalo1.jpg', alt: 'Loʻi kalo in Waipiʻo' },
  { src: '/assets/Keiki_LoiKalo.jpg', alt: 'Keiki learning in the loʻi' }
];

const DEFAULT_SCHEDULE: ScheduleEntry[] = [
  {
    time: 'Friday · 7/10/26 · 10:00 am – 3:30 pm',
    title: 'Jade & Meleʻs home in Kaʻūmana',
    items: [
      '10:00a Hoʻolauna (Meet & greet)',
      '10:30a Genealogy session',
      '11:30a Keiki activities',
      '12:00p Lunch',
      '12:45p Moʻolelo with our kūpuna',
      '1:30p Hula workshops',
      '2:15p Kanikapila',
      '2:45p Makahiki games'
    ]
  },
  {
    time: 'Saturday · 7/11/26 · 8:00 am – 3:00 pm',
    title: 'Huakaʻi to Waipiʻo',
    items: [
      '8:00a Depart for Waipiʻo',
      '9:00a Visit into Waipiʻo valley',
      '11:30a Lunch at Kukuihaele Park',
      '1:00p Visit Kalopa family graves',
      '2:30p Return to Hilo'
    ]
  },
  {
    time: 'Sunday · 7/12/26 · 9:00 am – 1:00 pm and 4:00 pm – 9:00 pm',
    title: 'Jade & Meleʻs home in Kaʻūmana',
    items: [
      '9:00a Visit Alae Cemetery',
      '10:30a Hula workshops / Kanikapila',
      '11:30a Family activities',
      '12:15p Lunch',
      '4:00p Family lūʻau',
      '5:30p Dinner',
      '6:30p Entertainment',
      '7:30p Family sharing',
      '8:30p Closing / A hui hou'
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
