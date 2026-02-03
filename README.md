# Keko'olani Reunion

Modern family reunion platform for the Keko'olani 'ohana in Hilo, Hawai'i. Built with Next.js 14 (App Router), Supabase, and Stripe to support:

- Tropical marketing site with event schedule, FAQ, and ticket highlights
- Dynamic registration flow with configurable questions and ticket types
- Stripe Checkout integration with webhook fulfillment
- Optional Vercel Blob uploads for gallery assets via the admin console
- Meeting-driven defaults pulled from the 23 ʻAukake 2025 planning hui (see `docs/Kekoʻolani Reunion Planning Meeting.md`)
- Admin control center for landing content, registration questions, tickets, and order monitoring

## Getting Started

```bash
npm install
npm run dev
```

> **Note**: Stripe credentials must be configured before registration checkout will work.

### Environment Variables

Copy `.env.example` to `.env.local` and provide project-specific values:

```bash
cp .env.example .env.local
```

Key settings:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project URL and anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key used by server actions and webhooks |
| `SUPABASE_JWT_SECRET` | Matches Supabase authentication JWT secret |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe keys for checkout & webhook |
| `NEXT_PUBLIC_APP_URL` | Public base URL (e.g. `https://kekoolani.com`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token for media uploads |
| `SES_REGION` (or `AWS_REGION`) | AWS region for SES (sender must be verified in SES) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (+ optional `AWS_SESSION_TOKEN`) | AWS credentials when not using an IAM role / OIDC |

### Database Schema

Supabase tables expected by the app:

- `site_settings` (singleton row: hero copy, schedule, gallery)
- `registration_questions`
- `ticket_types`
- `orders` (includes `form_answers` JSON column)
- `order_items`
- `attendees`

Refer to `docs/architecture.md` for column details and workflow diagrams.

### Stripe Webhook

Configure the webhook endpoint in Stripe to point at `/api/stripe/webhook` and provide the signing secret via `STRIPE_WEBHOOK_SECRET`.

During development you can tunnel events with the Stripe CLI:

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

## Deployment

Deploy with the Vercel CLI once environment variables are defined in the Vercel project:

```bash
vercel
vercel deploy
```

Ensure you also add the Supabase and Stripe secrets to Vercel’s environment settings.

## Admin Access

- Admin routes are protected by middleware that checks the Supabase session for `app_metadata.role === 'admin'`.
- Use the `/admin-login` page to sign in via Supabase email/password auth.
- After authentication, visit `/admin` to manage everything without HTML/JSON:
  - **Landing Content** – edit hero text, schedule blocks, galleries, purpose statements, cost outline, logistics, and committees. Image uploads drop straight into the gallery list.
  - **Tickets** – update copy, price, inventory, and visibility with simple inputs.
  - **Questions** – build registration prompts with dropdown/checkbox options managed via add/remove controls.
  - **Orders** – review attendee answers in readable lists.

## Future Enhancements

- Individual attendee detail capture
- Automated email confirmations
- Photo gallery storytelling module
- Analytics dashboard for registrations
