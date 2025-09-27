import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database } from '@/types/supabase';

const CSV_SEPARATOR = ',';

function escapeCsvValue(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'] & {
  ticket_types: { name: string | null; currency: string | null } | null;
};
type QuestionRow = Database['public']['Tables']['registration_questions']['Row'];
type AttendeeRow = Database['public']['Tables']['attendees']['Row'];

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isAdmin = session?.user.app_metadata?.role === 'admin';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [ordersRes, itemsRes, attendeesRes, questionsRes] = await Promise.all([
    supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('order_items').select('*, ticket_types(name, currency)'),
    supabaseAdmin.from('attendees').select('*'),
    supabaseAdmin.from('registration_questions').select('*').order('position', { ascending: true })
  ]);

  if (ordersRes.error || itemsRes.error || attendeesRes.error || questionsRes.error) {
    return NextResponse.json({ error: 'Failed to gather export data' }, { status: 500 });
  }

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const orderItems = (itemsRes.data ?? []) as OrderItemRow[];
  const attendees = (attendeesRes.data ?? []) as AttendeeRow[];
  const questions = (questionsRes.data ?? []) as QuestionRow[];

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  orderItems.forEach((item) => {
    const prev = itemsByOrder.get(item.order_id) ?? [];
    prev.push(item);
    itemsByOrder.set(item.order_id, prev);
  });

  const attendeeCount = attendees.reduce<Record<string, number>>((acc, attendee) => {
    acc[attendee.order_id] = (acc[attendee.order_id] ?? 0) + 1;
    return acc;
  }, {});

  const headers = [
    'Order ID',
    'Created At',
    'Status',
    'Purchaser Name',
    'Purchaser Email',
    'Total (cents)',
    'Total (formatted)',
    'Stripe Session ID',
    'Ticket Summary',
    'Attendee Count'
  ].concat(questions.map((question) => question.prompt));

  const rows = orders.map((order) => {
    const items = itemsByOrder.get(order.id) ?? [];
    const tickets = items.map((item) => `${item.quantity} × ${item.ticket_types?.name ?? item.ticket_type_id}`).join('; ');
    const currency = items[0]?.ticket_types?.currency ?? 'usd';

    const answers =
      order.form_answers && typeof order.form_answers === 'object'
        ? (order.form_answers as Record<string, unknown>)
        : {};

    const answerColumns = questions.map((question) => normalizeAnswer(answers[question.id]));

    const baseColumns = [
      order.id,
      new Date(order.created_at).toISOString(),
      order.status,
      order.purchaser_name,
      order.purchaser_email,
      String(order.total_cents),
      new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency ?? 'usd').toUpperCase() }).format(
        order.total_cents / 100
      ),
      order.stripe_session_id ?? '',
      tickets,
      String(attendeeCount[order.id] ?? 0)
    ];

    return baseColumns.concat(answerColumns).map((value) => escapeCsvValue(value));
  });

  const csv = [headers.map(escapeCsvValue).join(CSV_SEPARATOR)]
    .concat(rows.map((row) => row.join(CSV_SEPARATOR)))
    .join('\n');

  const response = new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });

  return response;
}
