import RegisterForm from '@/components/public/RegisterForm';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import type { Database } from '@/types/supabase';

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
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Registration</h1>
        <p className="mt-2 text-sm text-slate-600">
          Complete the form below to join the reunion. Payment is secured through Stripe.
        </p>
      </div>
      {canceled && (
        <div className="mb-8 rounded-3xl border border-lava-200 bg-lava-50 px-6 py-4 text-sm text-lava-700">
          Payment canceled. Your spot is not reserved until payment is completed.
        </div>
      )}
      <RegisterForm tickets={tickets} questions={questions} presetTicket={presetTicket} />
    </div>
  );
}
