import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import { REGISTRATION_FORM_FIELDS } from '@/lib/registrationGuidelines';
import type { Database } from '@/types/supabase';

type OrderWithRelations = Database['public']['Tables']['orders']['Row'] & {
  order_items: Array<{
    ticket_type_id: string;
    quantity: number;
    ticket_types: { name: string | null; currency: string | null } | null;
  }>;
  attendees: Database['public']['Tables']['attendees']['Row'][];
};

type QuestionRow = Database['public']['Tables']['registration_questions']['Row'];

async function getOrders(): Promise<{ orders: OrderWithRelations[]; questions: QuestionRow[] }> {
  const supabase = createSupabaseServerClient();

  const [{ data: ordersData }, { data: questionsData }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, order_items(ticket_type_id, quantity, ticket_types(name)), attendees(*)')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('registration_questions').select('*').order('position', { ascending: true })
  ]);

  return {
    orders: (ordersData as OrderWithRelations[] | null) ?? [],
    questions: (questionsData as QuestionRow[] | null) ?? []
  };
}

function normalizeAnswer(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAnswer(item)).filter(Boolean).join('; ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export default async function AdminOrdersPage() {
  const { orders, questions } = await getOrders();
  const staticFields = REGISTRATION_FORM_FIELDS;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Orders & Attendees</h2>
          <p className="text-sm text-slate-600">Track reunion registrations, payment details, and responses.</p>
        </div>
        <Link
          href="/admin/orders/export"
          className="inline-flex items-center justify-center rounded-full border border-ocean-200 bg-white px-4 py-2 text-sm font-medium text-ocean-700 shadow-sm transition hover:bg-ocean-50"
        >
          Download CSV
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <table className="min-w-[900px] text-left text-sm text-slate-700">
          <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="py-3 pr-6">Order</th>
              <th className="py-3 pr-6">Date</th>
              <th className="py-3 pr-6">Purchaser</th>
              <th className="py-3 pr-6">Email</th>
              <th className="py-3 pr-6">Status</th>
              <th className="py-3 pr-6">Payment</th>
              <th className="py-3 pr-6">Total</th>
              <th className="py-3 pr-6">Tickets</th>
              <th className="py-3 pr-6">Attendees</th>
              {staticFields.map((field) => (
                <th key={field.key} className="py-3 pr-6">
                  {field.label}
                </th>
              ))}
              {questions.map((question) => (
                <th key={question.id} className="py-3 pr-6">
                  {question.prompt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orders.map((order) => {
              const ticketSummary = (order.order_items ?? [])
                .map((item) => `${item.quantity} x ${item.ticket_types?.name ?? item.ticket_type_id}`)
                .join(', ');
              const orderCurrency = order.order_items?.[0]?.ticket_types?.currency ?? 'usd';
              const answerRecord =
                order.form_answers && typeof order.form_answers === 'object'
                  ? (order.form_answers as Record<string, unknown>)
                  : {};

              return (
                <tr key={order.id} className="align-top">
                  <td className="py-3 pr-6 font-mono text-xs text-slate-500">{order.id}</td>
                  <td className="py-3 pr-6 whitespace-nowrap text-xs text-slate-600">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 pr-6">{order.purchaser_name}</td>
                  <td className="py-3 pr-6 text-xs text-slate-600">{order.purchaser_email}</td>
                  <td className="py-3 pr-6">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        order.status === 'paid'
                          ? 'bg-fern-100 text-fern-700'
                          : order.status === 'pending'
                          ? 'bg-sand-100 text-sand-700'
                          : 'bg-lava-100 text-lava-700'
                      }`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 pr-6 text-xs text-slate-600">{order.payment_method ?? '-'}</td>
                  <td className="py-3 pr-6 font-semibold text-slate-900">
                    {formatCurrency(order.total_cents, orderCurrency ?? 'usd')}
                  </td>
                  <td className="py-3 pr-6 text-xs text-slate-600">{ticketSummary || '-'}</td>
                  <td className="py-3 pr-6 text-xs text-slate-600">{order.attendees?.length ?? 0}</td>
                  {staticFields.map((field) => (
                    <td key={`${order.id}-${field.key}`} className="py-3 pr-6 text-xs text-slate-600">
                      {normalizeAnswer(answerRecord[field.key]) || '-'}
                    </td>
                  ))}
                  {questions.map((question) => (
                    <td key={`${order.id}-${question.id}`} className="py-3 pr-6 text-xs text-slate-600">
                      {normalizeAnswer(answerRecord[question.id]) || '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!orders.length && (
              <tr>
                <td colSpan={9 + staticFields.length + questions.length} className="py-8 text-center text-slate-500">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
