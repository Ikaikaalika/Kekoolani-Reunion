import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutSchema } from '@/lib/validators';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getStripeClient, isStripeCheckoutEnabled } from '@/lib/stripe';
import { calculateStripeProcessingFeeCents } from '@/lib/stripeFees';
import { getParticipantAge, getPeopleFromAnswers, isParticipantAttending, selectTicketForAge } from '@/lib/orderUtils';
import { SITE_SETTINGS_ID } from '@/lib/constants';
import { getSiteExtras } from '@/lib/siteContent';
import { normalizeEmail, validateEmailAddress } from '@/lib/emailValidation';
import {
  buildInlineImageAttachmentFromPublicAsset,
  listPublicAssetsByExt,
  sendEmail,
  shouldUseSendPulse
} from '@/lib/email';
import crypto from 'crypto';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
type AttendeeInsert = Database['public']['Tables']['attendees']['Insert'];
type OrderItemPayload = { ticket_type_id: string; quantity: number };
const JADE_HOME_ADDRESS_LINES = ['224 Hokulani Street', 'Hilo, Hawaii 96720'];
const CHECK_MAILING_ADDRESS_LINES = ['PO Box 10124', 'Hilo, HI 96721'];
const CHECK_MAILING_ADDRESS = CHECK_MAILING_ADDRESS_LINES.join(', ');

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateLimitCache = new Map<string, { count: number; start: number }>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim();
  }
  return request.headers.get('x-real-ip') ?? null;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = rateLimitCache.get(key);
  if (!entry) {
    rateLimitCache.set(key, { count: 1, start: now });
    return false;
  }
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitCache.set(key, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  rateLimitCache.set(key, entry);
  return entry.count > RATE_LIMIT_MAX;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (ip && isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.parse(body);
    const paymentMethod = parsed.payment_method;

    const lineItems = (parsed.tickets ?? []).filter((ticket) => ticket.quantity > 0);

    const answers = (parsed.answers ?? {}) as Record<string, unknown>;
    const botField = typeof answers.website === 'string' ? answers.website.trim() : '';
    if (botField) {
      return NextResponse.json({ error: 'Unable to submit registration.' }, { status: 400 });
    }
    if ('website' in answers) {
      delete answers.website;
    }

    const people = getPeopleFromAnswers(answers);
    const invalidPersonEmailIndex = people.findIndex((person) => {
      const rawEmail = (person as Record<string, unknown>)?.email;
      if (typeof rawEmail !== 'string' || !rawEmail.trim()) return false;
      return !validateEmailAddress(rawEmail).isValid;
    });
    if (invalidPersonEmailIndex >= 0) {
      return NextResponse.json(
        {
          error: `Participant ${invalidPersonEmailIndex + 1} has an invalid email address. Please correct it and try again.`
        },
        { status: 400 }
      );
    }
    const tshirtOnly = Boolean((answers as Record<string, unknown>)?.tshirt_only);
    const checkMailingAddressConfirmed = (() => {
      const value = (answers as Record<string, unknown>)?.check_mailing_address_confirm;
      return value === true || value === 'true' || value === 'on' || value === 1 || value === '1';
    })();
    const paymentAccountUsername = (() => {
      if (paymentMethod === 'paypal') {
        const value = (answers as Record<string, unknown>)?.paypal_username;
        return typeof value === 'string' ? value.trim() : '';
      }
      if (paymentMethod === 'venmo') {
        const value = (answers as Record<string, unknown>)?.venmo_username;
        return typeof value === 'string' ? value.trim() : '';
      }
      return '';
    })();
    const attendingPeople = people.filter((person) => isParticipantAttending(person));
    const tshirtOrders = Array.isArray((answers as Record<string, unknown>)?.tshirt_orders)
      ? ((answers as Record<string, unknown>).tshirt_orders as Array<Record<string, unknown>>)
      : [];
    const tshirtCounts = { adult: 0, youth: 0 };
    const addTshirtCount = (category: unknown, quantity: number) => {
      if (!Number.isFinite(quantity) || quantity <= 0) return;
      if (category === 'youth') {
        tshirtCounts.youth += quantity;
      } else {
        tshirtCounts.adult += quantity;
      }
    };
    people.forEach((person) => {
      const raw = person.tshirt_quantity;
      const quantity = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : 0;
      addTshirtCount(person.tshirt_category, quantity);
    });
    tshirtOrders.forEach((order) => {
      const raw = order?.quantity;
      const quantity = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : 0;
      addTshirtCount(order?.category, quantity);
    });
    const totalTshirtQuantity = tshirtCounts.adult + tshirtCounts.youth;
    const skipTicketValidation = tshirtOnly && lineItems.length === 0;

    if (!lineItems.length && attendingPeople.length > 0 && !skipTicketValidation) {
      return NextResponse.json({ error: 'Select at least one ticket.' }, { status: 400 });
    }

    let ticketRecords: TicketRow[] = [];
    let ticketsById = new Map<string, TicketRow>();
    let totalCents = 0;
    const orderItems: Array<{
      ticket_type_id: string;
      quantity: number;
      unit_amount: number;
      name: string;
    }> = [];
    const isTshirtTicketName = (name: string) => name.toLowerCase().includes('shirt');
    const donationRaw = (answers as Record<string, unknown>)?.donation_amount;
    const donationAmount =
      typeof donationRaw === 'number' ? donationRaw : typeof donationRaw === 'string' ? Number(donationRaw) : 0;
    const donationCents = Number.isFinite(donationAmount) ? Math.max(0, Math.round(donationAmount * 100)) : 0;

    if (lineItems.length) {
      const { data: ticketTypes, error: ticketError } = await supabaseAdmin
        .from('ticket_types')
        .select('*')
        .in(
          'id',
          lineItems.map((item) => item.ticket_type_id)
        )
        .eq('active', true);

      if (ticketError) {
        console.error(ticketError);
        throw new Error('Unable to fetch tickets');
      }

      if (!ticketTypes || ticketTypes.length === 0) {
        return NextResponse.json({ error: 'Tickets not available.' }, { status: 400 });
      }

      ticketRecords = ticketTypes as TicketRow[];
      ticketsById = new Map(ticketRecords.map((ticket) => [ticket.id, ticket] as const));

      for (const item of lineItems) {
        const ticket = ticketsById.get(item.ticket_type_id);
        if (!ticket) {
          return NextResponse.json({ error: 'A selected ticket is unavailable.' }, { status: 400 });
        }
        if (typeof ticket.inventory === 'number' && item.quantity > ticket.inventory) {
          return NextResponse.json({ error: `${ticket.name} only has ${ticket.inventory} left.` }, { status: 400 });
        }
        if (!isTshirtTicketName(ticket.name)) {
          totalCents += ticket.price_cents * item.quantity;
          orderItems.push({
            ticket_type_id: ticket.id,
            quantity: item.quantity,
            unit_amount: ticket.price_cents,
            name: ticket.name
          });
        }
      }
    }

    if (totalTshirtQuantity > 0) {
      const ADULT_PRICE = 2500;
      const YOUTH_PRICE = 1500;

      const { data: tshirtTicketsRaw } = await supabaseAdmin
        .from('ticket_types')
        .select('*')
        .eq('active', true)
        .in('price_cents', [ADULT_PRICE, YOUTH_PRICE])
        .ilike('name', '%shirt%');

      const tshirtTickets = (tshirtTicketsRaw ?? []) as TicketRow[];
      let adultTicket = tshirtTickets.find((ticket) => ticket.price_cents === ADULT_PRICE) as TicketRow | undefined;
      let youthTicket = tshirtTickets.find((ticket) => ticket.price_cents === YOUTH_PRICE) as TicketRow | undefined;

      if (!adultTicket) {
        const { data: inserted, error: insertError } = await (supabaseAdmin
          .from('ticket_types') as any)
          .insert([
            {
              name: 'Reunion T-Shirt (Adult)',
              description: 'Reunion T-Shirt (Adult)',
              price_cents: ADULT_PRICE,
              currency: 'usd',
              active: true,
              position: 98
            }
          ])
          .select()
          .single();
        if (insertError) {
          console.error(insertError);
          throw new Error('Unable to create adult T-shirt ticket');
        }
        adultTicket = inserted as TicketRow;
      }

      if (!youthTicket) {
        const { data: inserted, error: insertError } = await (supabaseAdmin
          .from('ticket_types') as any)
          .insert([
            {
              name: 'Reunion T-Shirt (Youth)',
              description: 'Reunion T-Shirt (Youth)',
              price_cents: YOUTH_PRICE,
              currency: 'usd',
              active: true,
              position: 99
            }
          ])
          .select()
          .single();
        if (insertError) {
          console.error(insertError);
          throw new Error('Unable to create youth T-shirt ticket');
        }
        youthTicket = inserted as TicketRow;
      }

      if (tshirtCounts.adult > 0 && adultTicket) {
        totalCents += adultTicket.price_cents * tshirtCounts.adult;
        orderItems.push({
          ticket_type_id: adultTicket.id,
          quantity: tshirtCounts.adult,
          unit_amount: adultTicket.price_cents,
          name: adultTicket.name
        });
      }
      if (tshirtCounts.youth > 0 && youthTicket) {
        totalCents += youthTicket.price_cents * tshirtCounts.youth;
        orderItems.push({
          ticket_type_id: youthTicket.id,
          quantity: tshirtCounts.youth,
          unit_amount: youthTicket.price_cents,
          name: youthTicket.name
        });
      }
    }

    const ticketQuantitiesById = new Map(lineItems.map((item) => [item.ticket_type_id, item.quantity]));
    const ageBasedTickets = ticketRecords.filter(
      (ticket) => typeof ticket.age_min === 'number' || typeof ticket.age_max === 'number'
    );
    if (!skipTicketValidation) {
      if (!ageBasedTickets.length && attendingPeople.length) {
        return NextResponse.json({ error: 'Registration tickets are not available yet.' }, { status: 400 });
      }
      const ageTicketCounts = new Map<string, number>();
      ageBasedTickets.forEach((ticket) => ageTicketCounts.set(ticket.id, 0));
      for (const person of attendingPeople) {
        const age = getParticipantAge(person);
        if (age === null) {
          return NextResponse.json({ error: 'Age is required for every participant.' }, { status: 400 });
        }
        const ticket = selectTicketForAge(ageBasedTickets, age);
        if (!ticket) {
          return NextResponse.json({ error: `No ticket is configured for age ${age}.` }, { status: 400 });
        }
        ageTicketCounts.set(ticket.id, (ageTicketCounts.get(ticket.id) ?? 0) + 1);
      }
      for (const ticket of ageBasedTickets) {
        const requiredCount = ageTicketCounts.get(ticket.id) ?? 0;
        const selectedCount = ticketQuantitiesById.get(ticket.id) ?? 0;
        if (requiredCount !== selectedCount) {
          return NextResponse.json(
            {
              error: `Ticket quantity for ${ticket.name} must be ${requiredCount} to cover all attendees in that age range.`
            },
            { status: 400 }
          );
        }
      }
    }

    if (donationCents > 0) {
      totalCents += donationCents;
    }
    const subtotalCents = totalCents;
    const stripeProcessingFeeCents =
      paymentMethod === 'stripe' ? calculateStripeProcessingFeeCents(subtotalCents) : 0;
    if (stripeProcessingFeeCents > 0) {
      totalCents += stripeProcessingFeeCents;
      answers.stripe_processing_fee_cents = stripeProcessingFeeCents;
    } else if ('stripe_processing_fee_cents' in answers) {
      delete answers.stripe_processing_fee_cents;
    }
    if (totalCents > 0 && (paymentMethod === 'paypal' || paymentMethod === 'venmo') && !paymentAccountUsername) {
      return NextResponse.json({ error: `${paymentMethod === 'paypal' ? 'PayPal' : 'Venmo'} username is required.` }, { status: 400 });
    }
    if (totalCents > 0 && paymentMethod === 'check' && !checkMailingAddressConfirmed) {
      return NextResponse.json({ error: 'Please confirm the check mailing address before submitting.' }, { status: 400 });
    }

    const orderItemInserts: OrderItemPayload[] = orderItems.map((item) => ({
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity
    }));

    const { data: order, error: orderError } = await (supabaseAdmin as any).rpc('create_order_with_items', {
      p_purchaser_email: parsed.purchaser_email,
      p_purchaser_name: parsed.purchaser_name,
      p_status: 'pending',
      p_total_cents: totalCents,
      p_form_answers: answers,
      p_payment_method: paymentMethod,
      p_items: orderItemInserts
    });

    if (orderError || !order) {
      console.error(orderError);
      throw new Error('Unable to create order');
    }

    const orderRecord = order as OrderRow;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

    const cleanEmail = (value: unknown) => {
      if (typeof value !== 'string') return null;
      const result = validateEmailAddress(value);
      if (!result.isValid) return null;
      return normalizeEmail(value);
    };
    const peopleEmails = people
      .map((person) => cleanEmail((person as Record<string, unknown>)?.email))
      .filter((email): email is string => Boolean(email));
    const purchaserEmail = cleanEmail(parsed.purchaser_email);
    const uniqueEmails = Array.from(new Set([...(purchaserEmail ? [purchaserEmail] : []), ...peopleEmails]));

    const { data: siteSettings } = await supabaseAdmin
      .from('site_settings')
      .select('gallery_json')
      .eq('id', SITE_SETTINGS_ID)
      .maybeSingle();
    const extras = getSiteExtras(siteSettings ?? null);

    const sesConfigured = Boolean(process.env.SES_REGION || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION);
    const useSendPulse = shouldUseSendPulse();
    const canSendEmail = uniqueEmails.length && (sesConfigured || useSendPulse);

    if (canSendEmail) {
      try {
        const formatCurrency = (valueCents: number) =>
          new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(valueCents / 100);
        const formattedTotal = formatCurrency(totalCents);
        const receiptFromEmail =
          extras.receipt_from_email?.trim() || process.env.RECEIPT_FROM_EMAIL || 'ohana@kekoolanireunion.com';
        const pdfFromEmail = extras.pdf_from_email?.trim() || process.env.PDF_FROM_EMAIL || receiptFromEmail;
        const fromName = process.env.EMAIL_FROM_NAME || 'Kekoʻolani Reunion';
        const emailAssetsDir = 'email';
        const pdfFiles = listPublicAssetsByExt(['.pdf'], emailAssetsDir);
        const pdfLinks = pdfFiles.map((file) => ({
          label: file,
          href: `${baseUrl}/assets/${emailAssetsDir}/${encodeURIComponent(file)}`
        }));
        const jadeImageUrl = `${baseUrl}/assets/${emailAssetsDir}/Jade.jpeg`;
        const jadeAttachment = useSendPulse
          ? null
          : buildInlineImageAttachmentFromPublicAsset('Jade.jpeg', emailAssetsDir, 'jade-photo');
        const jadeImageSrc = jadeAttachment ? 'cid:jade-photo' : jadeImageUrl;
        const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_JWT_SECRET || '';
        const buildUnsubscribeToken = (email: string) =>
          crypto.createHmac('sha256', unsubscribeSecret).update(email).digest('hex');
        const buildUnsubscribeLink = (email: string) =>
          unsubscribeSecret
            ? `${baseUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${buildUnsubscribeToken(email)}`
            : '';
        const buildUnsubscribeHtml = (email?: string | null) => {
          if (!email) {
            return '<p>If you would like to opt out of reunion emails, please email kokua@kekoolanireunion.com.</p>';
          }
          const link = buildUnsubscribeLink(email);
          return link
            ? `<p>If you would like to opt out of reunion emails, please click <a href="${link}">unsubscribe</a> or email kokua@kekoolanireunion.com.</p>`
            : '<p>If you would like to opt out of reunion emails, please email kokua@kekoolanireunion.com.</p>';
        };
        const buildUnsubscribeText = (email?: string | null) => {
          if (!email) {
            return 'If you would like to opt out of reunion emails, please email kokua@kekoolanireunion.com.';
          }
          const link = buildUnsubscribeLink(email);
          return link
            ? `If you would like to opt out of reunion emails, please unsubscribe here: ${link} or email kokua@kekoolanireunion.com.`
            : 'If you would like to opt out of reunion emails, please email kokua@kekoolanireunion.com.';
        };
        const allNotAttending = attendingPeople.length === 0;
        const paymentAccountLine =
          paymentMethod === 'paypal'
            ? `PayPal username: ${paymentAccountUsername || 'Not provided'}`
            : paymentMethod === 'venmo'
              ? `Venmo username: ${paymentAccountUsername || 'Not provided'}`
              : '';
        const pdfLinksHtml = pdfLinks.length
          ? `<p><strong>Genealogy Links:</strong></p><ul>${pdfLinks
              .map((link) => `<li><a href="${link.href}">${link.label}</a></li>`)
              .join('')}</ul>`
          : '';
        const pdfLinksText = pdfLinks.length
          ? ['Genealogy Links:', ...pdfLinks.map((link) => `- ${link.label}: ${link.href}`)].join('\n')
          : '';
        const jadeAddressHtml = `<p><strong>Jade's Home Address:</strong><br/>${JADE_HOME_ADDRESS_LINES.join('<br/>')}</p>`;
        const jadeAddressText = [`Jade's Home Address:`, ...JADE_HOME_ADDRESS_LINES].join('\n');
        const checkAddressHtml = `<p><strong>Mail to:</strong> ${CHECK_MAILING_ADDRESS}<br/><strong>Mailing Address:</strong><br/>${CHECK_MAILING_ADDRESS_LINES.join('<br/>')}</p>`;
        const checkAddressText = ['Mail to: ' + CHECK_MAILING_ADDRESS, 'Mailing Address:', ...CHECK_MAILING_ADDRESS_LINES].join('\n');
        const checkPaymentInstructionsHtml =
          paymentMethod === 'check' && totalCents > 0
            ? `<p><strong>Mail-in Check Instructions:</strong><br/><strong>Amount to mail:</strong> ${formattedTotal}</p>${checkAddressHtml}`
            : '';
        const checkPaymentInstructionsText =
          paymentMethod === 'check' && totalCents > 0
            ? `Mail-in Check Instructions:\nAmount to mail: ${formattedTotal}\n${checkAddressText}`
            : '';

        const tshirtLineItems: string[] = [];
        people.forEach((person) => {
          const record = person as Record<string, unknown>;
          const quantityRaw = record.tshirt_quantity;
          const quantity = typeof quantityRaw === 'number' ? quantityRaw : typeof quantityRaw === 'string' ? Number(quantityRaw) : 0;
          if (!Number.isFinite(quantity) || quantity <= 0) return;
          const name = typeof record.full_name === 'string' ? record.full_name : 'Participant';
          const category = typeof record.tshirt_category === 'string' ? record.tshirt_category : 'mens';
          const style = typeof record.tshirt_style === 'string' ? record.tshirt_style : '';
          const size = typeof record.tshirt_size === 'string' ? record.tshirt_size : '';
          const label = `${name} — ${category}${style ? ` ${style}` : ''}${size ? ` (${size})` : ''} × ${quantity}`;
          tshirtLineItems.push(label);
        });
        tshirtOrders.forEach((order) => {
          const quantityRaw = order?.quantity;
          const quantity = typeof quantityRaw === 'number' ? quantityRaw : typeof quantityRaw === 'string' ? Number(quantityRaw) : 0;
          if (!Number.isFinite(quantity) || quantity <= 0) return;
          const category = typeof order?.category === 'string' ? order.category : 'mens';
          const style = typeof order?.style === 'string' ? order.style : '';
          const size = typeof order?.size === 'string' ? order.size : '';
          const label = `Additional — ${category}${style ? ` ${style}` : ''}${size ? ` (${size})` : ''} × ${quantity}`;
          tshirtLineItems.push(label);
        });
        const tshirtListHtml = tshirtLineItems.length
          ? `<ul>${tshirtLineItems.map((line) => `<li>${line}</li>`).join('')}</ul>`
          : '<p>No T-shirt items listed.</p>';
        const tshirtListText = tshirtLineItems.length ? tshirtLineItems.map((line) => `- ${line}`).join('\n') : 'No T-shirt items listed.';
        const ticketSummary = orderItems.length
          ? orderItems.map((item) => `${item.quantity} × ${item.name}`).join('; ')
          : 'No tickets selected.';
        const donationLine = donationCents > 0 ? `Donation: ${formatCurrency(donationCents)}` : '';
        const stripeFeeLine =
          stripeProcessingFeeCents > 0 ? `Card processing fee: ${formatCurrency(stripeProcessingFeeCents)}` : '';
        const orderSummaryHtml = `
<p><strong>Order details:</strong></p>
<ul>
  <li>Tickets: ${ticketSummary}</li>
  ${donationCents > 0 ? `<li>${donationLine}</li>` : ''}
  ${stripeProcessingFeeCents > 0 ? `<li>${stripeFeeLine}</li>` : ''}
  ${paymentAccountLine ? `<li>${paymentAccountLine}</li>` : ''}
  <li>Total attendees: ${attendingPeople.length}</li>
</ul>`;
        const orderSummaryText = [
          'Order details:',
          `Tickets: ${ticketSummary}`,
          donationCents > 0 ? donationLine : '',
          stripeProcessingFeeCents > 0 ? stripeFeeLine : '',
          paymentAccountLine ? paymentAccountLine : '',
          `Total attendees: ${attendingPeople.length}`
        ]
          .filter(Boolean)
          .join('\n');
        const orderLineItems = [
          ...orderItems.map((item) => {
            const lineTotal = item.unit_amount * item.quantity;
            return {
              label: item.name,
              quantity: item.quantity,
              unit: formatCurrency(item.unit_amount),
              total: formatCurrency(lineTotal)
            };
          }),
          ...(stripeProcessingFeeCents > 0
            ? [
                {
                  label: 'Card Processing Fee',
                  quantity: 1,
                  unit: formatCurrency(stripeProcessingFeeCents),
                  total: formatCurrency(stripeProcessingFeeCents)
                }
              ]
            : [])
        ];
        const orderLineItemsHtml = orderLineItems.length
          ? `<ul>${orderLineItems
              .map((item) => `<li>${item.label} — ${item.quantity} × ${item.unit} = ${item.total}</li>`)
              .join('')}</ul>`
          : '<p>No ticket or shirt line items.</p>';
        const orderLineItemsText = orderLineItems.length
          ? orderLineItems.map((item) => `- ${item.label}: ${item.quantity} × ${item.unit} = ${item.total}`).join('\n')
          : 'No ticket or shirt line items.';

        if (purchaserEmail) {
          const unsubscribeHtml = buildUnsubscribeHtml(purchaserEmail);
          const unsubscribeText = buildUnsubscribeText(purchaserEmail);

          const receiptSubject = tshirtOnly
            ? 'Kekoʻolani Reunion T-shirt Order Receipt'
            : 'Kekoʻolani Reunion Registration Receipt';
          const receiptHtml = tshirtOnly
            ? `<p>Aloha ${parsed.purchaser_name},</p>
<p>Mahalo for your T-shirt order.</p>
<p><strong>Order ID:</strong> ${orderRecord.id}<br/>
<strong>Total:</strong> ${formattedTotal}<br/>
<strong>Payment method:</strong> ${paymentMethod}</p>
<p><strong>Shirt order details:</strong></p>
${tshirtListHtml}
<p><strong>Line items:</strong></p>
${orderLineItemsHtml}
${orderSummaryHtml}
${checkPaymentInstructionsHtml}

${unsubscribeHtml}

${pdfLinksHtml}

${jadeAddressHtml}

<p>Me ka haʻahaʻa,<br/>Kekoʻolani Reunion Team</p>`
            : `<p>Aloha ${parsed.purchaser_name},</p>

<p>Mahalo for registering for the Kekoʻolani Family Reunion.</p>

<p><strong>Order ID:</strong> ${orderRecord.id}<br/>
<strong>Total:</strong> ${formattedTotal}<br/>
<strong>Payment method:</strong> ${paymentMethod}</p>

<p><strong>Line items:</strong></p>
${orderLineItemsHtml}
${tshirtLineItems.length ? `<p><strong>Shirt order details:</strong></p>${tshirtListHtml}` : ''}
${orderSummaryHtml}
${checkPaymentInstructionsHtml}

<p>We will follow up with any next steps as we get closer to the event.</p>

${unsubscribeHtml}

${pdfLinksHtml}

${jadeAddressHtml}

<p>Me ka haʻahaʻa,<br/>Kekoʻolani Reunion Team</p>`;
          const receiptText = tshirtOnly
            ? `Aloha ${parsed.purchaser_name},\n\nMahalo for your T-shirt order.\n\nOrder ID: ${orderRecord.id}\nTotal: ${formattedTotal}\nPayment method: ${paymentMethod}\n\nShirt order details:\n${tshirtListText}\n\nLine items:\n${orderLineItemsText}\n\n${orderSummaryText}${checkPaymentInstructionsText ? `\n\n${checkPaymentInstructionsText}` : ''}\n\n${unsubscribeText}\n\n${pdfLinksText}\n\n${jadeAddressText}\n\nMe ka haʻahaʻa,\nKekoʻolani Reunion Team`
            : `Aloha ${parsed.purchaser_name},\n\nMahalo for registering for the Kekoʻolani Family Reunion.\n\nOrder ID: ${orderRecord.id}\nTotal: ${formattedTotal}\nPayment method: ${paymentMethod}\n\nLine items:\n${orderLineItemsText}\n\n${tshirtLineItems.length ? `Shirt order details:\n${tshirtListText}\n\n` : ''}${orderSummaryText}${checkPaymentInstructionsText ? `\n\n${checkPaymentInstructionsText}` : ''}\n\n${unsubscribeText}\n\n${pdfLinksText}\n\n${jadeAddressText}\n\nMe ka haʻahaʻa,\nKekoʻolani Reunion Team`;

          await sendEmail({
            from: { name: fromName, email: receiptFromEmail },
            to: [{ email: purchaserEmail, name: parsed.purchaser_name }],
            subject: receiptSubject,
            html: receiptHtml,
            text: receiptText
          });
        }

        const thankYouSubject = allNotAttending
          ? 'Mahalo for ordering a shirt — Kekoʻolani Reunion'
          : 'Mahalo for registering — Kekoʻolani Reunion';
        const thankYouHtml = allNotAttending
          ? `<p>Aloha,</p>

<p>We will miss you at the reunion. Mahalo for ordering a shirt. Even if you do not plan to attend the reunion, could you please complete the family group record to keep our records updated. Please Let me know if you have any questions.</p>

${pdfLinksHtml}

${checkPaymentInstructionsHtml}

${jadeAddressHtml}

<p>Me ke aloha nui,</p>
<p>Jade Pumehana Silva</p>
<p><img src="${jadeImageSrc}" alt="Jade Pumehana Silva" style="max-width:240px; border-radius:12px;" /></p>`
          : `<p>Aloha,</p>

<p>Mahalo for registering to attend E hoʻi ka piko, our Kekoʻolani Reunion 2026! I am looking forward to our time together. In preparation for our reunion, could you please help update our family records by completing the family group record at the link below. If you have any questions, please let me know.</p>

${pdfLinksHtml}

${checkPaymentInstructionsHtml}

${jadeAddressHtml}

<p>Me ke aloha nui,</p>
<p>Jade Pumehana Silva</p>
<p><img src="${jadeImageSrc}" alt="Jade Pumehana Silva" style="max-width:240px; border-radius:12px;" /></p>`;
        const thankYouText = allNotAttending
          ? `Aloha,\n\nWe will miss you at the reunion. Mahalo for ordering a shirt. Even if you do not plan to attend the reunion, could you please complete the family group record to keep our records updated. Please Let me know if you have any questions.\n\n${pdfLinksText}${checkPaymentInstructionsText ? `\n\n${checkPaymentInstructionsText}` : ''}\n\n${jadeAddressText}\n\nMe ke aloha nui,\nJade Pumehana Silva`
          : `Aloha,\n\nMahalo for registering to attend E hoʻi ka piko, our Kekoʻolani Reunion 2026! I am looking forward to our time together. In preparation for our reunion, could you please help update our family records by completing the family group record at the link below. If you have any questions, please let me know.\n\n${pdfLinksText}${checkPaymentInstructionsText ? `\n\n${checkPaymentInstructionsText}` : ''}\n\n${jadeAddressText}\n\nMe ke aloha nui,\nJade Pumehana Silva`;
        const thankYouAttachments = jadeAttachment ? [jadeAttachment] : [];

        if (!tshirtOnly) {
          await Promise.all(
            uniqueEmails.map((email) => {
              const unsubscribeHtml = buildUnsubscribeHtml(email);
              const unsubscribeText = buildUnsubscribeText(email);
              return sendEmail({
                from: { name: fromName, email: pdfFromEmail },
                to: [{ email }],
                subject: thankYouSubject,
                html: thankYouHtml.replace(
                  '</p><p>Me ke aloha nui,',
                  `</p>${unsubscribeHtml}<p>Me ke aloha nui,`
                ),
                text: `${thankYouText}\n\n${unsubscribeText}`,
                attachments: !useSendPulse && thankYouAttachments.length ? thankYouAttachments : undefined
              });
            })
          );
        }
      } catch (emailError) {
        console.error('[ses]', emailError);
      }
    }
    const redirectUrl = `${baseUrl}/success?order=${orderRecord.id}&status=pending&method=${paymentMethod}&amount=${totalCents}`;
    const stripeEnabled = paymentMethod === 'stripe' && isStripeCheckoutEnabled();

    if (!stripeEnabled) {
      const attendeeInserts: AttendeeInsert[] = Array.from({ length: attendingPeople.length }).map(() => ({
        order_id: orderRecord.id,
        answers: orderRecord.form_answers ?? {}
      }));
      if (attendeeInserts.length) {
        await (supabaseAdmin.from('attendees') as any).insert(attendeeInserts);
      }
      return NextResponse.json({ redirectUrl });
    }

    if (!orderItems.length && donationCents <= 0) {
      return NextResponse.json({ redirectUrl });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ redirectUrl });
    }

    const stripeAccountId = extras.stripe_account_id?.trim() || null;

    const stripe = getStripeClient();

    const stripeLineItems = orderItems.map((item) => ({
      price_data: {
        currency: ticketsById.get(item.ticket_type_id)?.currency ?? 'usd',
        unit_amount: item.unit_amount,
        product_data: {
          name: item.name
        }
      },
      quantity: item.quantity
    }));

    if (donationCents > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'usd',
          unit_amount: donationCents,
          product_data: {
            name: 'Reunion Donation'
          }
        },
        quantity: 1
      });
    }
    if (stripeProcessingFeeCents > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'usd',
          unit_amount: stripeProcessingFeeCents,
          product_data: {
            name: 'Card Processing Fee'
          }
        },
        quantity: 1
      });
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: `${baseUrl}/api/stripe/complete?session_id={CHECKOUT_SESSION_ID}&amount=${totalCents}`,
        cancel_url: `${baseUrl}/register?canceled=1`,
        customer_email: parsed.purchaser_email,
        metadata: {
          order_id: orderRecord.id
        },
        line_items: stripeLineItems
      },
      stripeAccountId ? { stripeAccount: stripeAccountId } : undefined
    );

    await (supabaseAdmin
      .from('orders') as any)
      .update({ stripe_session_id: session.id })
      .eq('id', orderRecord.id);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error('[checkout]', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid form submission', details: error.flatten() }, { status: 422 });
    }

    return NextResponse.json({ error: 'Unable to start checkout' }, { status: 500 });
  }
}
