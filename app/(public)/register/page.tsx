import RegisterForm from '@/components/public/RegisterForm';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import { parseExtras } from '@/lib/siteContent';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type QuestionRow = Database['public']['Tables']['registration_questions']['Row'];
type SiteSettingsRow = Database['public']['Tables']['site_settings']['Row'];

async function getRegistrationConfig() {
  const supabase = createSupabaseServerClient();
  const [ticketRes, questionRes, siteRes] = await Promise.all([
    supabase
      .from('ticket_types')
      .select('*')
      .eq('active', true)
      .order('position', { ascending: true }),
    supabase.from('registration_questions').select('*').order('position', { ascending: true }),
    supabase.from('site_settings').select('*').limit(1).maybeSingle()
  ]);

  const tickets = ((ticketRes.data ?? []) as TicketRow[]).map((ticket) => ({
    ...ticket,
    priceFormatted: formatCurrency(ticket.price_cents, ticket.currency)
  }));

  const questions = (questionRes.data ?? []) as QuestionRow[];

  const extras = parseExtras(((siteRes.data as SiteSettingsRow | null)?.gallery_json) ?? null);

  return { tickets, questions, extras };
}

export default async function RegisterPage({ searchParams }: { searchParams: { ticket?: string; canceled?: string } }) {
  const presetTicket = searchParams.ticket;
  const canceled = searchParams.canceled === '1';
  const { tickets, questions, extras } = await getRegistrationConfig();
  const costSummary = extras.costs;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-12 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-ocean-500">Reserve your spot</span>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Family Registration - July 10-12, 2026</h1>
        <p className="mt-2 text-sm text-slate-600">
          Secure your seats at the reunion, let us know your family details, and select the experiences that fit your crew.
        </p>
      </div>
      {canceled && (
        <div className="mb-8 rounded-3xl border border-lava-200 bg-lava-50 px-6 py-4 text-sm text-lava-700">
          Payment canceled. Your spot is not reserved until payment is completed.
        </div>
      )}
      <aside className="mb-10 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">What registration covers</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {costSummary.map((item) => (
            <li key={`${item.label}-${item.detail}`} className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-fern-500" />
              <span>
                <strong className="text-slate-900">{item.label}.</strong> {item.detail}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">
          Have questions or need help? Email <a href="mailto:ohana@kekoolani.com" className="text-ocean-600 underline">ohana@kekoolani.com</a>.
        </p>
      </aside>
      <RegisterForm tickets={tickets} questions={questions} presetTicket={presetTicket} />
    </div>
  );
}
