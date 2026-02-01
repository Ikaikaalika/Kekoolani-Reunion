import { z } from 'zod';

export const updateSiteSettingsSchema = z.object({
  hero_title: z.string().min(1),
  hero_subtitle: z.string().optional().nullable(),
  event_dates: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  about_html: z.string().optional().nullable(),
  schedule_json: z.any().optional().nullable(),
  gallery_json: z.any().optional().nullable(),
  show_schedule: z.boolean().default(true),
  show_gallery: z.boolean().default(true),
  show_purpose: z.boolean().default(true),
  show_costs: z.boolean().default(true),
  show_logistics: z.boolean().default(true),
  show_committees: z.boolean().default(true)
});

export const ticketTypeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price_cents: z.number().int().min(0),
  currency: z.string().min(3).default('usd'),
  inventory: z.number().int().min(0).nullable().optional(),
  age_min: z.number().int().min(0).nullable().optional(),
  age_max: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
  position: z.number().int().optional()
}).superRefine((data, ctx) => {
  if (
    typeof data.age_min === 'number' &&
    typeof data.age_max === 'number' &&
    data.age_min > data.age_max
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum age cannot exceed maximum age',
      path: ['age_min']
    });
  }
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
  payment_method: z.enum(['stripe', 'paypal', 'venmo', 'check']),
  tickets: z
    .array(
      z.object({
        ticket_type_id: z.string().uuid(),
        quantity: z.number().int().min(0)
      })
    )
    .optional()
    .default([]),
  answers: z.record(z.string(), z.any()).optional().default({})
});

export const sectionTypeSchema = z.enum([
  'text',
  'photo_gallery',
  'agenda',
  'contact',
  'faq',
  'cta',
  'custom_html'
]);

export const registrationFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'select',
  'checkbox',
  'date',
  'multiselect',
  'number',
  'email',
  'phone',
  'photo'
]);

export const registrationFieldScopeSchema = z.enum(['person', 'order']);

export const registrationFieldSchema = z.object({
  id: z.string().uuid().optional(),
  field_key: z.string().min(1),
  label: z.string().min(1),
  field_type: registrationFieldTypeSchema,
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
  position: z.number().int().min(0).optional(),
  scope: registrationFieldScopeSchema.default('person'),
  enabled: z.boolean().default(true),
  help_text: z.string().optional().nullable(),
  placeholder: z.string().optional().nullable(),
  locked: z.boolean().default(false),
  section: z.string().optional().nullable()
});

const sectionContentSchemas = {
  text: z.object({
    body: z.string().min(1)
  }),
  photo_gallery: z.object({
    images: z
      .array(
        z.object({
          src: z.string().url(),
          alt: z.string().optional().nullable()
        })
      )
      .min(1)
  }),
  agenda: z.object({
    items: z
      .array(
        z.object({
          time: z.string().min(1),
          description: z.string().min(1)
        })
      )
      .min(1)
  }),
  contact: z.object({
    contacts: z
      .array(
        z.object({
          name: z.string().min(1),
          role: z.string().optional().nullable(),
          email: z.string().email().optional().nullable(),
          phone: z.string().optional().nullable()
        })
      )
      .min(1),
    note: z.string().optional().nullable()
  }),
  faq: z.object({
    faqs: z
      .array(
        z.object({
          question: z.string().min(1),
          answer: z.string().min(1)
        })
      )
      .min(1)
  }),
  cta: z.object({
    body: z.string().min(1),
    buttonText: z.string().optional().nullable(),
    buttonHref: z.string().url().optional().nullable()
  }),
  custom_html: z.object({
    html: z.string().min(1)
  })
} as const;

export const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  type: sectionTypeSchema,
  title: z.string().optional().nullable(),
  position: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
  content: z.any()
});

export function parseSectionContent(type: z.infer<typeof sectionTypeSchema>, content: unknown) {
  const schema = sectionContentSchemas[type];
  if (!schema) {
    throw new Error(`Unsupported section type: ${type}`);
  }
  return schema.parse(content);
}
