import { z } from 'zod';
import { sectionTypeSchema, parseSectionContent } from './validators';
import type { Database } from '@/types/supabase';

export type SectionType = z.infer<typeof sectionTypeSchema>;

export type SectionContentMap = {
  text: {
    body: string;
  };
  photo_gallery: {
    images: Array<{ src: string; alt?: string | null }>;
  };
  agenda: {
    items: Array<{ time: string; description: string }>;
  };
  contact: {
    contacts: Array<{ name: string; role?: string | null; email?: string | null; phone?: string | null }>;
    note?: string | null;
  };
  faq: {
    faqs: Array<{ question: string; answer: string }>;
  };
  cta: {
    body: string;
    buttonText?: string | null;
    buttonHref?: string | null;
  };
  custom_html: {
    html: string;
  };
};

export type SectionContent<T extends SectionType = SectionType> = SectionContentMap[T];

export interface DynamicSection<T extends SectionType = SectionType> {
  id: string;
  type: T;
  title: string | null;
  position: number;
  published: boolean;
  content: SectionContent<T>;
}

type SectionRow = Database['public']['Tables']['content_sections']['Row'];

export function normalizeSection(row: SectionRow): DynamicSection {
  const type = sectionTypeSchema.parse(row.type);
  const content = parseSectionContent(type, row.content ?? {});
  return {
    id: row.id,
    type,
    title: row.title ?? null,
    position: row.position ?? 0,
    published: row.published,
    content
  };
}

export function normalizeSectionList(rows: SectionRow[] | null | undefined): DynamicSection[] {
  if (!rows?.length) return [];
  return rows
    .map((row) => normalizeSection(row))
    .sort((a, b) => a.position - b.position || a.title?.localeCompare(b.title ?? '') || a.id.localeCompare(b.id));
}
