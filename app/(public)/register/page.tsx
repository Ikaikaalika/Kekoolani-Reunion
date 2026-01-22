import RegisterForm from '@/components/public/RegisterForm';
import { REGISTRATION_GUIDELINES } from '@/lib/registrationGuidelines';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import { parseExtras, SITE_DEFAULTS } from '@/lib/siteContent';
import { SITE_SETTINGS_ID } from '@/lib/constants';
import { normalizeRegistrationFields } from '@/lib/registrationFields';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type QuestionRow = Database['public']['Tables']['registration_questions']['Row'];
type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];
type QuestionTicketRow = Database['public']['Tables']['registration_question_tickets']['Row'];
type RegistrationFieldRow = Database['public']['Tables']['registration_fields']['Row'];

type RegistrationQuestion = QuestionRow & { ticket_ids: string[] };

async function getRegistrationConfig() {
  const supabase = createSupabaseServerClient();
  const [ticketRes, questionRes, siteRes, questionTicketRes, fieldRes] = await Promise.all([
    supabase
      .from('ticket_types')
      .select('*')
      .eq('active', true)
      .order('position', { ascending: true }),
    supabase.from('registration_questions').select('*').order('position', { ascending: true }),
    supabase.from('site_settings').select('*').eq('id', SITE_SETTINGS_ID).maybeSingle(),
    supabase.from('registration_question_tickets').select('question_id, ticket_type_id'),
    supabase.from('registration_fields').select('*').order('position', { ascending: true }).order('created_at', { ascending: true })
  ]);

  const tickets = ((ticketRes.data ?? []) as TicketRow[]).map((ticket) => ({
    ...ticket,
    priceFormatted: formatCurrency(ticket.price_cents, ticket.currency)
  }));

  const questionLinks = (questionTicketRes.data ?? []) as QuestionTicketRow[];
  const registrationFields = normalizeRegistrationFields((fieldRes.data ?? []) as RegistrationFieldRow[]);
  const questionTicketMap = questionLinks.reduce<Record<string, string[]>>((acc, link) => {
    if (!acc[link.question_id]) {
      acc[link.question_id] = [];
    }
    acc[link.question_id].push(link.ticket_type_id);
    return acc;
  }, {});

  const questions = ((questionRes.data ?? []) as QuestionRow[]).map<RegistrationQuestion>((question) => ({
    ...question,
    ticket_ids: questionTicketMap[question.id] ?? []
  }));

  const extras = parseExtras(((siteRes.data as SiteSettingsRow | null)?.gallery_json) ?? null);
  const eventDates = (siteRes.data as SiteSettingsRow | null)?.event_dates ?? SITE_DEFAULTS.event_dates;

  return { tickets, questions, extras, registrationFields, eventDates };
}

export default async function RegisterPage({ searchParams }: { searchParams: { ticket?: string; canceled?: string } }) {
  const presetTicket = searchParams.ticket;
  const canceled = searchParams.canceled === '1';
  const { tickets, questions, extras, registrationFields, eventDates } = await getRegistrationConfig();
  const costSummary = extras.costs;

  return (
    <div className="section">
      <div className="container max-w-3xl">
        <div className="mb-12 text-center">
          <span className="mono text-xs uppercase tracking-[0.3em] text-koa">Reserve your spot</span>
          <h1 className="h2 mt-3">Family Registration - {eventDates}</h1>
          <p className="mt-2 text-sm text-koa">
            Secure your seats at the reunion, let us know your family details, and select the experiences that fit your crew.
          </p>
        </div>
        {canceled && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            Payment canceled. Your spot is not reserved until payment is completed.
          </div>
        )}
        <section className="mb-10">
          <div className="mb-6 text-center">
            <span className="section-title">Registration Checklist</span>
            <h2 className="h3 mt-3">What we need from each person</h2>
            <p className="mt-2 text-sm text-koa">
              Use this checklist to gather details for each attendee before starting your registration.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {REGISTRATION_GUIDELINES.map((item) => (
              <div key={item.key} className="card shadow-soft p-5">
                <p className="mono text-xs uppercase tracking-[0.3em] text-sand-600">{item.label}</p>
                <p className="mt-2 text-sm text-koa">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
        <aside className="card shadow-soft mb-10 p-6">
          <h2 className="text-lg font-semibold text-black">What registration covers</h2>
          <ul className="mt-3 space-y-2 text-sm text-koa">
            {costSummary.map((item) => (
              <li key={`${item.label}-${item.detail}`} className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-brandGreen" />
                <span>
                  <strong className="text-black">{item.label}.</strong> {item.detail}
                </span>
              </li>
            ))}
          </ul>
          <p className="mono mt-4 text-xs uppercase tracking-[0.25em] text-koa">
            Have questions or need help? Email{' '}
            <a href="mailto:pumehanasilva@mac.com" className="text-brandBlue underline">
              pumehanasilva@mac.com
            </a>
            .
          </p>
        </aside>
        <RegisterForm tickets={tickets} questions={questions} registrationFields={registrationFields} presetTicket={presetTicket} />
      </div>
    </div>
  );
}
