# Kekoolani Reunion Platform Architecture

## Overview
The reunion platform is a Next.js 14 (App Router) application deployed on Vercel. It uses Supabase Postgres for content & registration data and Stripe for payments. The two primary surfaces are:
- **Guest experience**: marketing landing page + registration & ticket purchase flow.
- **Admin console**: authenticated dashboard to manage landing page content, registration questions, ticket pricing/inventory, and monitor orders.

### 23 ʻAukake 2025 Planning Hui Highlights
- Reunion weekend confirmed for **July 10 – 12, 2026** throughout Jade & Meleʻs home (Keaukaha), Waipiʻo Valley, and The Arc of Hilo.
- ʻOhana purpose reaffirmed: *Honoring our kūpuna, Celebrating our Future. E ola mau ka ʻohana Kekoʻolani.*
- Committees formed for registration, hale prep, lūʻau program, genealogy archives, meals, huakaʻi logistics, and media storytelling.
- Baseline costs (subject to refinement): three lunches (~$30 per person), Sunday lūʻau ($25 per person), reunion shirts ($20–$26). Donations offset venue rentals and kūpuna transport.
- Next planning hui: **September 20, 2025 at 10:30am** (Jade Pumehana Silva).

## Core Technologies
- **Framework**: Next.js 14 with TypeScript, App Router, React Server Components, Server Actions.
- **Styling**: Tailwind CSS with a kapa-inspired palette and Hawaiian typography cues.
- **Database**: Supabase (Postgres) accessed via Supabase JS client & service-role for privileged server actions.
- **Auth**: Supabase Auth (email/password) with admin role gating via RLS & checked in middleware.
- **Payments**: Stripe Checkout + webhook to reconcile orders & attendees.
- **Media**: Vercel Blob (optional) for admin-uploaded gallery imagery.
- **Forms**: React Hook Form + Zod for type-safe validation, dynamic questions.

## Data Model (Supabase)
- `site_settings` — id (uuid), hero_title, hero_subtitle, event_dates, location, about_html, schedule_json, gallery_json, created_at, updated_at.
- `registration_questions` — id (uuid), prompt, field_type ("text"|"textarea"|"select"|"checkbox"|"date"), options (jsonb), required (boolean), position (int).
- `ticket_types` — id (uuid), name, description, price_cents, currency, inventory, active (bool), position (int).
- `orders` — id (uuid), stripe_session_id, purchaser_email, purchaser_name, status ("pending"|"paid"|"canceled"), total_cents, created_at, updated_at.
- `order_items` — id (uuid), order_id (fk), ticket_type_id (fk), quantity.
- `attendees` — id (uuid), order_id (fk), answers (jsonb) keyed by registration_question_id.

## Stripe Flow
1. Visitor selects ticket quantities & answers registration questions.
2. Server Action `createCheckout` writes a pending `order` + `order_items`, then creates a Stripe Checkout Session with metadata referencing the order.
3. Stripe redirects the user after payment success/cancel.
4. Webhook (`/api/stripe/webhook`) receives payment events, verifies signature, marks order paid, generates attendee records, decrements inventory.

## Admin Experience
- Authenticated via Supabase session; middleware guards `/admin` routes.
- Dashboard cards for:
  - **Landing Content**: update hero/about/schedule via rich form.
  - **Tickets**: CRUD ticket types, adjust price & inventory.
  - **Questions**: reorder, edit, add field types & options.
  - **Orders**: read-only list of paid orders & attendees.
- Server Actions mutate Supabase using service role key; optimistic UI with toasts.

## Directory Structure (planned)
```
.
├── app
│   ├── (public)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── register
│   │   │   └── page.tsx
│   │   └── success
│   │       └── page.tsx
│   ├── (admin)
│   │   ├── admin
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── content
│   │   │   │   └── page.tsx
│   │   │   ├── tickets
│   │   │   │   └── page.tsx
│   │   │   └── questions
│   │   │       └── page.tsx
│   ├── api
│   │   ├── stripe
│   │   │   └── webhook
│   │   │       └── route.ts
│   │   └── checkout
│   │       └── route.ts
│   └── globals.css
├── components
│   ├── ...
├── lib
│   ├── supabaseClient.ts
│   ├── supabaseAdmin.ts
│   ├── stripe.ts
│   ├── validators.ts
│   └── utils.ts
├── prisma
│   └── schema.prisma (reference only; Supabase managed manually)
├── scripts
│   └── bootstrap.sql
├── public
│   ├── images
│   │   └── ...
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── package.json
├── next.config.mjs
├── middleware.ts
└── env
    ├── .env.local (gitignored)
    └── .env.example
```

## Security Considerations
- Service role key only used server-side via server actions and API routes.
- Stripe webhook secret stored in env; verify signatures before processing.
- Vercel Blob token stored server-side; uploads limited to 8MB and public access.
- Supabase RLS rules ensure only admins with proper claims can mutate admin tables when not using service role.

## Future Enhancements
- Add email confirmations via Resend/Postmark.
- Build analytics dashboard.
- Add photo gallery CMS.
- Add multi-lingual support.
