import QuestionsManager from '@/components/admin/QuestionsManager';
import SectionsManager from '@/components/admin/SectionsManager';
import TicketsManager from '@/components/admin/TicketsManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { upsertQuestion, deleteQuestion } from '@/lib/actions/questions';
import { upsertTicket, deleteTicket } from '@/lib/actions/tickets';
import { normalizeSectionList } from '@/lib/sections';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/utils';
import { buildTicketPriceSlots, calculateNetTotalCents, getPeopleFromAnswers } from '@/lib/orderUtils';
import type { Database } from '@/types/supabase';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type QuestionRow = Database['public']['Tables']['registration_questions']['Row'];
type SectionRow = Database['public']['Tables']['content_sections']['Row'];
type QuestionTicketRow = Database['public']['Tables']['registration_question_tickets']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'] & {
  ticket_types: { price_cents: number | null } | null;
};

async function loadOverview() {
  const supabase = createSupabaseServerClient();
  const [ordersRes, itemsRes, ticketsRes, questionsRes, sectionsRes, linksRes] = await Promise.all([
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('order_items').select('order_id, quantity, ticket_types(price_cents)'),
    supabase.from('ticket_types').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('registration_questions').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('content_sections').select('*'),
    supabase.from('registration_question_tickets').select('question_id, ticket_type_id')
  ]);

  const ordersData = (ordersRes.data ?? []) as OrderRow[];
  const orderItems = (itemsRes.data ?? []) as OrderItemRow[];
  const itemsByOrder = orderItems.reduce<Record<string, OrderItemRow[]>>((acc, item) => {
    acc[item.order_id] = acc[item.order_id] ? [...acc[item.order_id], item] : [item];
    return acc;
  }, {});
  const totalRevenue = ordersData
    .filter((order) => order.status === 'paid')
    .reduce((sum, order) => {
      const answers =
        order.form_answers && typeof order.form_answers === 'object'
          ? (order.form_answers as Record<string, unknown>)
          : {};
      const people = getPeopleFromAnswers(answers);
      const ticketPrices = buildTicketPriceSlots(itemsByOrder[order.id] ?? []);
      const netTotal = calculateNetTotalCents(order.total_cents, people, ticketPrices);
      return sum + netTotal;
    }, 0);

  const ticketData = (ticketsRes.data ?? []) as TicketRow[];
  const ticketCount = ticketData.filter((ticket) => ticket.active).length;
  const questions = (questionsRes.data ?? []) as QuestionRow[];
  const sections = normalizeSectionList((sectionsRes.data ?? []) as SectionRow[]);
  const links = (linksRes.data ?? []) as QuestionTicketRow[];
  const ticketAssignments = links.reduce<Record<string, string[]>>((acc, link) => {
    if (!acc[link.question_id]) {
      acc[link.question_id] = [];
    }
    acc[link.question_id].push(link.ticket_type_id);
    return acc;
  }, {});

  return {
    latestOrders: ordersData.slice(0, 5),
    ticketCount,
    totalRevenue,
    tickets: ticketData,
    questions,
    sections,
    ticketAssignments
  };
}

export default async function AdminOverviewPage() {
  const { latestOrders, ticketCount, totalRevenue, tickets, questions, sections, ticketAssignments } = await loadOverview();

  return (
    <div className="space-y-8">
      <div>
        <p className="section-title">Overview</p>
        <h2 className="mt-3 text-3xl font-semibold text-sand-900">Registration snapshot</h2>
        <p className="mt-2 text-sm text-koa">
          A quick view of payments, ticket availability, and recent registrations.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>Paid orders recorded to date</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-sand-900">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Ticket Types</CardTitle>
            <CardDescription>Visible on the public registration page</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-sand-900">{ticketCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Last five registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-sand-900">{latestOrders.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Orders</CardTitle>
          <CardDescription>Monitor incoming registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-sand-700">
              <thead className="bg-sand-50">
                <tr className="text-xs uppercase tracking-[0.2em] text-koa">
                  <th className="py-3 pr-6">Order</th>
                  <th className="py-3 pr-6">Purchaser</th>
                  <th className="py-3 pr-6">Status</th>
                  <th className="py-3 pr-6">Total</th>
                  <th className="py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {latestOrders.map((order) => (
                  <tr key={order.id} className="text-sand-700">
                    <td className="py-3 pr-6 font-mono text-xs text-koa">{order.id.slice(0, 8)}...</td>
                    <td className="py-3 pr-6">{order.purchaser_name}</td>
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
                    <td className="py-3 pr-6">{formatCurrency(order.total_cents)}</td>
                    <td className="py-3">{new Date(order.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {!latestOrders.length && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-koa">
                      No orders yet. Once family registers, you&apos;ll see them here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-6">
        <div>
          <p className="section-title">Homepage</p>
          <h2 className="mt-3 text-3xl font-semibold text-sand-900">Custom Sections</h2>
          <p className="mt-2 text-sm text-koa">Edit or add dynamic content blocks that appear on the public homepage.</p>
        </div>
        <SectionsManager sections={sections} />
      </section>

      <section className="space-y-6">
        <div>
          <p className="section-title">Registration</p>
          <h2 className="mt-3 text-3xl font-semibold text-sand-900">Ticket Types</h2>
          <p className="mt-2 text-sm text-koa">Update pricing, inventory, and ticket descriptions for registration.</p>
        </div>
        <TicketsManager tickets={tickets} upsertAction={upsertTicket} deleteAction={deleteTicket} />
      </section>

      <section className="space-y-6">
        <div>
          <p className="section-title">Registration</p>
          <h2 className="mt-3 text-3xl font-semibold text-sand-900">Registration Questions</h2>
          <p className="mt-2 text-sm text-koa">Manage custom questions shown on the registration form.</p>
        </div>
        <QuestionsManager
          questions={questions}
          tickets={tickets}
          ticketAssignments={ticketAssignments}
          upsertAction={upsertQuestion}
          deleteAction={deleteQuestion}
        />
      </section>
    </div>
  );
}
