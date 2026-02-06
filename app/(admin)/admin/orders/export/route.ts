import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPeopleFromAnswers, getPhotoUrlsFromAnswers, isParticipantAttending, isParticipantRefunded } from '@/lib/orderUtils';
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
type RegistrationFieldRow = Database['public']['Tables']['registration_fields']['Row'];

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const isAdmin = user?.app_metadata?.role === 'admin';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const [ordersRes, itemsRes, questionsRes, fieldsRes] = await Promise.all([
    supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('order_items').select('*, ticket_types(name, currency)'),
    supabaseAdmin.from('registration_questions').select('*').order('position', { ascending: true }),
    supabaseAdmin.from('registration_fields').select('*').order('position', { ascending: true }).order('created_at', { ascending: true })
  ]);

  if (ordersRes.error || itemsRes.error || questionsRes.error || fieldsRes.error) {
    return NextResponse.json({ error: 'Failed to gather export data' }, { status: 500 });
  }

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const orderItems = (itemsRes.data ?? []) as OrderItemRow[];
  const questions = (questionsRes.data ?? []) as QuestionRow[];
  const fields = (fieldsRes.data ?? []) as RegistrationFieldRow[];

  const personFields = fields
    .filter((field) => field.scope === 'person' && field.enabled !== false && field.field_key !== 'photo_upload')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.created_at.localeCompare(b.created_at));

  const orderFields = [
    { key: 'tshirt_only', label: 'T-shirt Only Registration' },
    { key: 'donation_amount', label: 'Donation Amount' },
    { key: 'donation_note', label: 'Donation Note' },
    { key: 'tshirt_orders', label: 'Additional T-shirt Orders' }
  ] as const;

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  orderItems.forEach((item) => {
    const prev = itemsByOrder.get(item.order_id) ?? [];
    prev.push(item);
    itemsByOrder.set(item.order_id, prev);
  });

  const headers = [
    'Order ID',
    'Created At',
    'Status',
    'Payment Method',
    'Purchaser Name',
    'Purchaser Email',
    'Total (cents)',
    'Total (formatted)',
    'Stripe Session ID',
    'Ticket Summary',
    'Attendee Count',
    'Person #',
    'Attending',
    'Refunded',
    'Photo URL'
  ]
    .concat(personFields.map((field) => field.label))
    .concat(orderFields.map((field) => field.label))
    .concat(questions.map((question) => question.prompt));

  const rows = orders.flatMap((order) => {
    const items = itemsByOrder.get(order.id) ?? [];
    const tickets = items.map((item) => `${item.quantity} x ${item.ticket_types?.name ?? item.ticket_type_id}`).join('; ');
    const currency = items[0]?.ticket_types?.currency ?? 'usd';

    const answers =
      order.form_answers && typeof order.form_answers === 'object'
        ? (order.form_answers as Record<string, unknown>)
        : {};

    const answerColumns = questions.map((question) => normalizeAnswer(answers[question.id]));
    const people = getPeopleFromAnswers(answers);
    const photoUrls = getPhotoUrlsFromAnswers(answers);
    const attendeeCount = people.filter((person) => isParticipantAttending(person) && !isParticipantRefunded(person)).length;

    const peopleForExport = people.length ? people : [null];
    return peopleForExport.map((person, index) => {
      const record = person && typeof person === 'object' ? (person as Record<string, unknown>) : {};
      const attending = person ? isParticipantAttending(record) : '';
      const refunded = person ? isParticipantRefunded(record) : '';
      const photoUrl = person ? photoUrls[index] ?? '' : '';
      const personColumns = personFields.map((field) => normalizeAnswer(record[field.field_key]));
      const orderColumns = orderFields.map((field) => normalizeAnswer(answers[field.key]));

      const baseColumns = [
        order.id,
        new Date(order.created_at).toISOString(),
        order.status,
        order.payment_method ?? '',
        order.purchaser_name,
        order.purchaser_email,
        String(order.total_cents),
        new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency ?? 'usd').toUpperCase() }).format(
          order.total_cents / 100
        ),
        order.stripe_session_id ?? '',
        tickets,
        String(attendeeCount),
        person ? String(index + 1) : '',
        normalizeAnswer(attending),
        normalizeAnswer(refunded),
        normalizeAnswer(photoUrl)
      ];

      return baseColumns.concat(personColumns, orderColumns, answerColumns).map((value) => escapeCsvValue(value));
    });
  });

  const csv = [headers.map(escapeCsvValue).join(CSV_SEPARATOR)]
    .concat(rows.map((row) => row.join(CSV_SEPARATOR)))
    .join('\n');

  const response = new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-per-person-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });

  return response;
}
