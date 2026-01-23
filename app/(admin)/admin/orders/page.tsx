import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import { REGISTRATION_FORM_FIELDS } from '@/lib/registrationGuidelines';
import OrderParticipantsManager from '@/components/admin/OrderParticipantsManager';
import DeleteEmptyOrderButton from '@/components/admin/DeleteEmptyOrderButton';
import {
  buildTicketPriceSlots,
  calculateNetTotalCents,
  getPeopleFromAnswers,
  normalizeOrderParticipants
} from '@/lib/orderUtils';
import type { Database } from '@/types/supabase';

type OrderWithRelations = Database['public']['Tables']['orders']['Row'] & {
  order_items: Array<{
    ticket_type_id: string;
    quantity: number;
    ticket_types: { name: string | null; currency: string | null; price_cents: number | null } | null;
  }>;
};

type QuestionRow = Database['public']['Tables']['registration_questions']['Row'];

async function getOrders(): Promise<{ orders: OrderWithRelations[]; questions: QuestionRow[] }> {
  const supabase = createSupabaseServerClient();

  const [{ data: ordersData }, { data: questionsData }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, order_items(ticket_type_id, quantity, ticket_types(name, currency, price_cents))')
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
          <p className="section-title">Orders</p>
          <h2 className="mt-3 text-3xl font-semibold text-sand-900">Orders & Attendees</h2>
          <p className="mt-2 text-sm text-koa">Track reunion registrations, payment details, and responses.</p>
        </div>
        <Link
          href="/admin/orders/export"
          className="inline-flex items-center justify-center rounded-full border border-brandBlue/30 bg-white px-4 py-2 text-sm font-semibold text-brandBlue shadow-soft transition hover:bg-brandBlue hover:text-white"
        >
          Download CSV
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-sand-200 bg-white/90 p-6 shadow-soft">
        <table className="min-w-[900px] text-left text-sm text-sand-700">
          <thead className="bg-sand-50 text-xs uppercase tracking-[0.2em] text-koa">
            <tr>
              <th className="py-3 pr-6">Order</th>
              <th className="py-3 pr-6">Date</th>
              <th className="py-3 pr-6">Purchaser</th>
              <th className="py-3 pr-6">Email</th>
              <th className="py-3 pr-6">Status</th>
              <th className="py-3 pr-6">Payment</th>
              <th className="py-3 pr-6">Net Total</th>
              <th className="py-3 pr-6">Tickets</th>
              <th className="py-3 pr-6">Attendees</th>
              <th className="py-3 pr-6">Participants</th>
              <th className="py-3 pr-6">Actions</th>
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
          <tbody className="divide-y divide-sand-200">
            {orders.map((order) => {
              const ticketSummary = (order.order_items ?? [])
                .map((item) => `${item.quantity} x ${item.ticket_types?.name ?? item.ticket_type_id}`)
                .join(', ');
              const orderCurrency = order.order_items?.[0]?.ticket_types?.currency ?? 'usd';
              const answerRecord =
                order.form_answers && typeof order.form_answers === 'object'
                  ? (order.form_answers as Record<string, unknown>)
                  : {};
              const people = getPeopleFromAnswers(answerRecord);
              const participants = normalizeOrderParticipants(answerRecord);
              const ticketPrices = buildTicketPriceSlots(order.order_items ?? []);
              const netTotal = calculateNetTotalCents(order.total_cents, people, ticketPrices);
              const isEmptyOrder = participants.length === 0;

              return (
                <tr key={order.id} className="align-top">
                  <td className="py-3 pr-6 font-mono text-xs text-koa">{order.id}</td>
                  <td className="py-3 pr-6 whitespace-nowrap text-xs text-koa">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 pr-6">{order.purchaser_name}</td>
                  <td className="py-3 pr-6 text-xs text-koa">{order.purchaser_email}</td>
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
                  <td className="py-3 pr-6 text-xs text-koa">{order.payment_method ?? '-'}</td>
                  <td className="py-3 pr-6 font-semibold text-sand-900">
                    {formatCurrency(netTotal, orderCurrency ?? 'usd')}
                    {netTotal !== order.total_cents && (
                      <p className="mt-1 text-xs font-normal text-koa">Original: {formatCurrency(order.total_cents, orderCurrency ?? 'usd')}</p>
                    )}
                  </td>
                  <td className="py-3 pr-6 text-xs text-koa">{ticketSummary || '-'}</td>
                  <td className="py-3 pr-6 text-xs text-koa">{participants.length}</td>
                  <td className="py-3 pr-6 text-xs text-koa">
                    <OrderParticipantsManager orderId={order.id} participants={participants} />
                  </td>
                  <td className="py-3 pr-6 text-xs text-koa">
                    {isEmptyOrder ? <DeleteEmptyOrderButton orderId={order.id} /> : '-'}
                  </td>
                  {staticFields.map((field) => (
                    <td key={`${order.id}-${field.key}`} className="py-3 pr-6 text-xs text-koa">
                      {normalizeAnswer(answerRecord[field.key]) || '-'}
                    </td>
                  ))}
                  {questions.map((question) => (
                    <td key={`${order.id}-${question.id}`} className="py-3 pr-6 text-xs text-koa">
                      {normalizeAnswer(answerRecord[question.id]) || '-'}
                    </td>
                  ))}
                </tr>
              );
            })}
            {!orders.length && (
              <tr>
                <td colSpan={10 + staticFields.length + questions.length} className="py-8 text-center text-koa">
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
