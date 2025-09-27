import RegisterForm from '@/components/public/RegisterForm';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import type { Database } from '@/types/supabase';

const COST_SUMMARY = [
  'Three lunches across the weekend ($30 per person).',
  'Sunday lūʻau at The Arc of Hilo ($25 per person).',
  'Reunion shirts ($20–$26) — select style during registration.',
  'Optional kōkua donations to support venue rentals & kūpuna transportation.'
];

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type QuestionRow = Database['public']['Tables']['registration_questions']['Row'];

async function getRegistrationConfig() {
  const supabase = createSupabaseServerClient();
  const [ticketRes, questionRes] = await Promise.all([
    supabase
      .from('ticket_types')
      .select('*')
      .eq('active', true)
      .order('position', { ascending: true }),
    supabase.from('registration_questions').select('*').order('position', { ascending: true })
  ]);

  const tickets = ((ticketRes.data ?? []) as TicketRow[]).map((ticket) => ({
    ...ticket,
    priceFormatted: formatCurrency(ticket.price_cents, ticket.currency)
  }));

  const questions = (questionRes.data ?? []) as QuestionRow[];

  return { tickets, questions };
}

export default async function RegisterPage({ searchParams }: { searchParams: { ticket?: string; canceled?: string } }) {
  const presetTicket = searchParams.ticket;
  const canceled = searchParams.canceled === '1';
  const { tickets, questions } = await getRegistrationConfig();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-12 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-ocean-500">Reserve your spot</span>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Kākau ʻOhana · July 10 – 12, 2026</h1>
        <p className="mt-2 text-sm text-slate-600">
          Secure your seats at the reunion, let us know your ʻohana details, and select the experiences that fit your crew.
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
          {COST_SUMMARY.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-fern-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-500">
          Have questions or need kōkua? Email <a href="mailto:ohana@kekoolani.com" className="text-ocean-600 underline">ohana@kekoolani.com</a>.
        </p>
      </aside>
      <RegisterForm tickets={tickets} questions={questions} presetTicket={presetTicket} />
    </div>
  );
}
