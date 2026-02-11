'use server';

import { revalidatePath } from 'next/cache';
import { formatCurrency } from '@/lib/utils';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getPeopleFromAnswers } from '@/lib/orderUtils';
import { sendEmail, shouldUseSendPulse } from '@/lib/email';
import { getSiteExtras } from '@/lib/siteContent';
import { SITE_SETTINGS_ID } from '@/lib/constants';
import { normalizeEmail, validateEmailAddress } from '@/lib/emailValidation';
import { requireAdmin } from './requireAdmin';

type UpdatePayload = {
  orderId: string;
  personIndex: number;
  attending?: boolean;
  refunded?: boolean;
  showName?: boolean;
  showPhoto?: boolean;
  email?: string;
  remove?: boolean;
};

export async function updateOrderParticipantStatus(payload: UpdatePayload) {
  await requireAdmin();
  const { orderId, personIndex, attending, refunded, showName, showPhoto, email, remove } = payload;
  if (!orderId) {
    return { error: 'Missing order id' };
  }
  if (!Number.isFinite(personIndex) || personIndex < 0) {
    return { error: 'Invalid participant index' };
  }

  const admin = supabaseAdmin as any;
  const { data: order, error } = await admin.from('orders').select('form_answers,purchaser_email').eq('id', orderId).maybeSingle();
  if (error || !order) {
    return { error: 'Order not found' };
  }

  const answers = order.form_answers && typeof order.form_answers === 'object' ? (order.form_answers as Record<string, unknown>) : {};
  const people = getPeopleFromAnswers(answers);
  if (!people[personIndex]) {
    return { error: 'Participant not found' };
  }

  const updatedAnswers = { ...answers } as Record<string, unknown>;
  let nextPurchaserEmail: string | null = null;

  if (remove) {
    const nextPeople = [...people];
    nextPeople.splice(personIndex, 1);
    updatedAnswers.people = nextPeople;
    if (personIndex === 0 && nextPeople.length) {
      const replacementEmail = typeof nextPeople[0]?.email === 'string' ? nextPeople[0].email.trim() : '';
      if (replacementEmail) {
        const result = validateEmailAddress(replacementEmail);
        if (!result.isValid) {
          return { error: 'New primary participant email is invalid.' };
        }
        nextPurchaserEmail = normalizeEmail(replacementEmail);
      }
    }
    if (Array.isArray(updatedAnswers.photo_urls)) {
      const nextPhotos = [...(updatedAnswers.photo_urls as unknown[])];
      nextPhotos.splice(personIndex, 1);
      updatedAnswers.photo_urls = nextPhotos;
    }
  } else {
    const updatedPerson = { ...people[personIndex] } as Record<string, unknown>;
    if (typeof attending === 'boolean') {
      updatedPerson.attending = attending;
    }
    if (typeof refunded === 'boolean') {
      updatedPerson.refunded = refunded;
    }
    if (typeof showName === 'boolean') {
      updatedPerson.show_name = showName;
    }
    if (typeof showPhoto === 'boolean') {
      updatedPerson.show_photo = showPhoto;
    }
    if (typeof email === 'string') {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        if (personIndex === 0) {
          return { error: 'Primary participant email cannot be empty.' };
        }
        updatedPerson.email = null;
      } else {
        const result = validateEmailAddress(trimmedEmail);
        if (!result.isValid) {
          return { error: result.message ?? 'Invalid email address.' };
        }
        const normalized = normalizeEmail(trimmedEmail);
        updatedPerson.email = normalized;
        if (personIndex === 0) {
          nextPurchaserEmail = normalized;
        }
      }
    }
    people[personIndex] = updatedPerson;
    updatedAnswers.people = people;
  }

  const updatePayload: Record<string, unknown> = {
    form_answers: updatedAnswers
  };
  if (nextPurchaserEmail) {
    updatePayload.purchaser_email = nextPurchaserEmail;
  }

  const { error: updateError } = await admin
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId);

  if (updateError) {
    return { error: 'Unable to update participant' };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/orders');

  return { ok: true };
}

type ResendOrderReceiptPayload = {
  orderId: string;
  email?: string;
};

type ReceiptOrder = {
  id: string;
  purchaser_name: string;
  purchaser_email: string;
  payment_method: string | null;
  total_cents: number;
  created_at: string;
  order_items: Array<{
    quantity: number;
    ticket_types: { name: string | null; currency: string | null; price_cents: number | null } | null;
  }>;
};

export async function resendOrderReceipt(payload: ResendOrderReceiptPayload) {
  await requireAdmin();
  const orderId = payload.orderId?.trim();
  if (!orderId) {
    return { error: 'Missing order id' };
  }

  const admin = supabaseAdmin as any;
  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id,purchaser_name,purchaser_email,payment_method,total_cents,created_at,order_items(quantity,ticket_types(name,currency,price_cents))')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError || !order) {
    return { error: 'Order not found' };
  }

  const orderRecord = order as ReceiptOrder;
  const providedEmail = typeof payload.email === 'string' ? payload.email.trim() : '';
  const recipientRaw = providedEmail || orderRecord.purchaser_email?.trim();
  if (!recipientRaw) {
    return { error: 'Recipient email is required.' };
  }

  const emailValidation = validateEmailAddress(recipientRaw);
  if (!emailValidation.isValid) {
    return { error: emailValidation.message ?? 'Invalid email address.' };
  }

  const recipientEmail = normalizeEmail(recipientRaw);
  const sesConfigured = Boolean(process.env.SES_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION);
  if (!sesConfigured && !shouldUseSendPulse()) {
    return { error: 'Email provider is not configured.' };
  }

  const { data: siteSettings } = await admin
    .from('site_settings')
    .select('gallery_json')
    .eq('id', SITE_SETTINGS_ID)
    .maybeSingle();
  const extras = getSiteExtras(siteSettings ?? null);

  const fromName = process.env.EMAIL_FROM_NAME || 'Kekoʻolani Reunion';
  const fromEmail = extras.receipt_from_email?.trim() || process.env.RECEIPT_FROM_EMAIL || 'ohana@kekoolanireunion.com';
  const items = Array.isArray(orderRecord.order_items) ? orderRecord.order_items : [];
  const currency = items[0]?.ticket_types?.currency ?? 'usd';
  const paymentMethod = orderRecord.payment_method || 'pending';
  const itemLines = items.map((item) => {
    const label = item.ticket_types?.name ?? 'Ticket';
    const unitCents = typeof item.ticket_types?.price_cents === 'number' ? item.ticket_types.price_cents : 0;
    const lineTotal = unitCents * item.quantity;
    return {
      label,
      quantity: item.quantity,
      unit: formatCurrency(unitCents, currency),
      total: formatCurrency(lineTotal, currency)
    };
  });
  const lineItemsHtml = itemLines.length
    ? `<ul>${itemLines
        .map((item) => `<li>${item.label} — ${item.quantity} × ${item.unit} = ${item.total}</li>`)
        .join('')}</ul>`
    : '<p>No line items found.</p>';
  const lineItemsText = itemLines.length
    ? itemLines.map((item) => `- ${item.label}: ${item.quantity} × ${item.unit} = ${item.total}`).join('\n')
    : 'No line items found.';
  const formattedTotal = formatCurrency(orderRecord.total_cents, currency);
  const subject = 'Kekoʻolani Reunion Receipt (Resent)';
  const html = `<p>Aloha ${orderRecord.purchaser_name},</p>
<p>This is a copy of your reunion receipt.</p>
<p><strong>Order ID:</strong> ${orderRecord.id}<br/>
<strong>Order Date:</strong> ${new Date(orderRecord.created_at).toLocaleString()}<br/>
<strong>Payment method:</strong> ${paymentMethod}<br/>
<strong>Total:</strong> ${formattedTotal}</p>
<p><strong>Line items:</strong></p>
${lineItemsHtml}
<p>Me ka haʻahaʻa,<br/>Kekoʻolani Reunion Team</p>`;
  const text = `Aloha ${orderRecord.purchaser_name},\n\nThis is a copy of your reunion receipt.\n\nOrder ID: ${orderRecord.id}\nOrder Date: ${new Date(orderRecord.created_at).toLocaleString()}\nPayment method: ${paymentMethod}\nTotal: ${formattedTotal}\n\nLine items:\n${lineItemsText}\n\nMe ka haʻahaʻa,\nKekoʻolani Reunion Team`;

  try {
    await sendEmail({
      from: { name: fromName, email: fromEmail },
      to: [{ email: recipientEmail, name: orderRecord.purchaser_name }],
      subject,
      html,
      text
    });
  } catch (error) {
    console.error('[resend-receipt]', error);
    return { error: 'Unable to send receipt email.' };
  }

  return { ok: true as const, email: recipientEmail };
}

type DeleteEmptyOrderPayload = {
  orderId: string;
};

export async function deleteEmptyOrder(payload: DeleteEmptyOrderPayload) {
  await requireAdmin();
  const { orderId } = payload;
  if (!orderId) {
    return { error: 'Missing order id' };
  }

  const admin = supabaseAdmin as any;
  const { data: order, error } = await admin.from('orders').select('form_answers').eq('id', orderId).maybeSingle();
  if (error || !order) {
    return { error: 'Order not found' };
  }

  const answers = order.form_answers && typeof order.form_answers === 'object' ? (order.form_answers as Record<string, unknown>) : {};
  const people = getPeopleFromAnswers(answers);
  if (people.length > 0) {
    return { error: 'Order has participant details' };
  }

  const { error: itemsError } = await admin.from('order_items').delete().eq('order_id', orderId);
  if (itemsError) {
    return { error: 'Unable to delete order items' };
  }

  const { error: attendeesError } = await admin.from('attendees').delete().eq('order_id', orderId);
  if (attendeesError) {
    return { error: 'Unable to delete attendees' };
  }

  const { error: deleteError } = await admin.from('orders').delete().eq('id', orderId);
  if (deleteError) {
    return { error: 'Unable to delete order' };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/orders');

  return { ok: true };
}

type UpdateOrderStatusPayload = {
  orderId: string;
  status: 'pending' | 'paid' | 'canceled';
};

type UpdateOrderPurchaserNamePayload = {
  orderId: string;
  purchaserName: string;
};

type UpdateOrderDetailsPayload = {
  orderId: string;
  purchaserName: string;
  purchaserEmail: string;
  status: 'pending' | 'paid' | 'canceled';
  paymentMethod: string;
  totalCents: number;
  stripeSessionId: string;
  formAnswersJson: string;
  orderItemsJson: string;
};

type EditableOrderItem = {
  ticket_type_id: string;
  quantity: number;
};

const ALLOWED_ORDER_STATUSES = new Set<UpdateOrderStatusPayload['status']>(['pending', 'paid', 'canceled']);
const ALLOWED_PAYMENT_METHODS = new Set(['stripe', 'paypal', 'venmo', 'check']);

function parseOrderItemsJson(raw: string): { items: EditableOrderItem[]; error?: string } {
  if (!raw.trim()) {
    return { items: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { items: [], error: 'Order items must be valid JSON.' };
  }

  if (!Array.isArray(parsed)) {
    return { items: [], error: 'Order items JSON must be an array.' };
  }

  const combined = new Map<string, number>();
  for (let index = 0; index < parsed.length; index += 1) {
    const item = parsed[index];
    if (!item || typeof item !== 'object') {
      return { items: [], error: `Order item #${index + 1} must be an object.` };
    }
    const record = item as Record<string, unknown>;
    const ticketTypeId = typeof record.ticket_type_id === 'string' ? record.ticket_type_id.trim() : '';
    const quantityRaw = record.quantity;
    const quantity = typeof quantityRaw === 'number' ? quantityRaw : Number(quantityRaw);

    if (!ticketTypeId) {
      return { items: [], error: `Order item #${index + 1} is missing ticket_type_id.` };
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { items: [], error: `Order item #${index + 1} must have a positive integer quantity.` };
    }

    combined.set(ticketTypeId, (combined.get(ticketTypeId) ?? 0) + quantity);
  }

  return {
    items: Array.from(combined.entries()).map(([ticket_type_id, quantity]) => ({ ticket_type_id, quantity }))
  };
}

function parseFormAnswersJson(raw: string): { answers: Record<string, unknown>; error?: string } {
  if (!raw.trim()) {
    return { answers: {} };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { answers: {}, error: 'Form answers must be valid JSON.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { answers: {}, error: 'Form answers JSON must be an object.' };
  }

  return { answers: parsed as Record<string, unknown> };
}

export async function updateOrderDetails(payload: UpdateOrderDetailsPayload) {
  await requireAdmin();

  const orderId = payload.orderId?.trim();
  const purchaserName = payload.purchaserName?.trim();
  const purchaserEmailRaw = payload.purchaserEmail?.trim();
  const status = payload.status;
  const paymentMethodRaw = payload.paymentMethod?.trim().toLowerCase();
  const totalCents = Number(payload.totalCents);
  const stripeSessionId = payload.stripeSessionId?.trim() || null;

  if (!orderId) {
    return { error: 'Order id required.' };
  }
  if (!purchaserName) {
    return { error: 'Purchaser name is required.' };
  }
  if (!purchaserEmailRaw) {
    return { error: 'Purchaser email is required.' };
  }
  const emailValidation = validateEmailAddress(purchaserEmailRaw);
  if (!emailValidation.isValid) {
    return { error: emailValidation.message ?? 'Invalid purchaser email.' };
  }
  if (!ALLOWED_ORDER_STATUSES.has(status)) {
    return { error: 'Invalid order status.' };
  }
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    return { error: 'Total cents must be a non-negative integer.' };
  }
  if (paymentMethodRaw && !ALLOWED_PAYMENT_METHODS.has(paymentMethodRaw)) {
    return { error: 'Payment method must be stripe, paypal, venmo, check, or blank.' };
  }

  const { answers, error: answersError } = parseFormAnswersJson(payload.formAnswersJson ?? '');
  if (answersError) {
    return { error: answersError };
  }

  const { items, error: itemsError } = parseOrderItemsJson(payload.orderItemsJson ?? '');
  if (itemsError) {
    return { error: itemsError };
  }

  const admin = supabaseAdmin as any;
  const normalizedEmail = normalizeEmail(purchaserEmailRaw);

  if (items.length > 0) {
    const ticketIds = items.map((item) => item.ticket_type_id);
    const { data: ticketRows, error: ticketError } = await admin.from('ticket_types').select('id').in('id', ticketIds);
    if (ticketError) {
      return { error: 'Unable to validate ticket types.' };
    }
    const existingIds = new Set((ticketRows ?? []).map((row: { id: string }) => row.id));
    const missingId = ticketIds.find((id) => !existingIds.has(id));
    if (missingId) {
      return { error: `Ticket type not found: ${missingId}` };
    }
  }

  const { error: orderError } = await admin
    .from('orders')
    .update({
      purchaser_name: purchaserName,
      purchaser_email: normalizedEmail,
      status,
      payment_method: paymentMethodRaw || null,
      total_cents: totalCents,
      stripe_session_id: stripeSessionId,
      form_answers: answers
    })
    .eq('id', orderId);

  if (orderError) {
    return { error: 'Failed to update order details.' };
  }

  const { error: deleteItemsError } = await admin.from('order_items').delete().eq('order_id', orderId);
  if (deleteItemsError) {
    return { error: 'Failed to replace order items.' };
  }

  if (items.length > 0) {
    const { error: insertItemsError } = await admin.from('order_items').insert(
      items.map((item) => ({
        order_id: orderId,
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity
      }))
    );
    if (insertItemsError) {
      return { error: 'Failed to save order items.' };
    }
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/orders');

  return { ok: true as const };
}

export async function updateOrderPurchaserName(payload: UpdateOrderPurchaserNamePayload) {
  await requireAdmin();
  const orderId = payload.orderId?.trim();
  const purchaserName = payload.purchaserName?.trim();

  if (!orderId) {
    return { error: 'Order id required' };
  }
  if (!purchaserName) {
    return { error: 'Purchaser name is required' };
  }

  const admin = supabaseAdmin as any;
  const { error } = await admin.from('orders').update({ purchaser_name: purchaserName }).eq('id', orderId);
  if (error) {
    return { error: 'Failed to update purchaser name' };
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/orders');

  return { ok: true as const, purchaserName };
}

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get('order_id') ?? '');
  const status = String(formData.get('status') ?? '') as UpdateOrderStatusPayload['status'];

  if (!orderId) {
    throw new Error('Order id required');
  }
  if (!['pending', 'paid', 'canceled'].includes(status)) {
    throw new Error('Invalid status');
  }

  const admin = supabaseAdmin as any;
  const { error } = await admin.from('orders').update({ status }).eq('id', orderId);
  if (error) {
    throw new Error('Failed to update order status');
  }

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/orders');
}
