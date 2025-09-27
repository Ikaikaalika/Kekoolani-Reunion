import { z } from 'zod';

export const updateSiteSettingsSchema = z.object({
  hero_title: z.string().min(1),
  hero_subtitle: z.string().optional().nullable(),
  event_dates: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  about_html: z.string().optional().nullable(),
  schedule_json: z
    .array(
      z.object({
        time: z.string(),
        title: z.string(),
        description: z.string().optional()
      })
    )
    .optional()
    .nullable(),
  gallery_json: z
    .array(
      z.object({
        src: z.string(),
        alt: z.string().optional()
      })
    )
    .optional()
    .nullable()
});

export const ticketTypeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price_cents: z.number().int().min(0),
  currency: z.string().min(3).default('usd'),
  inventory: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
  position: z.number().int().optional()
});

export const questionSchema = z.object({
  id: z.string().uuid().optional(),
  prompt: z.string().min(1),
  field_type: z.enum(['text', 'textarea', 'select', 'checkbox', 'date']),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string()
      })
    )
    .optional()
    .nullable(),
  required: z.boolean().default(false),
  position: z.number().int().optional()
});

export const checkoutSchema = z.object({
  purchaser_name: z.string().min(1),
  purchaser_email: z.string().email(),
  tickets: z
    .array(
      z.object({
        ticket_type_id: z.string().uuid(),
        quantity: z.number().int().min(0)
      })
    )
    .min(1),
  answers: z.record(z.string(), z.any()).optional().default({})
});
