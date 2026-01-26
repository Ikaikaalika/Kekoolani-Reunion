import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkoutSchema } from '@/lib/validators';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getStripeClient } from '@/lib/stripe';
import { getParticipantAge, getPeopleFromAnswers, isParticipantAttending, selectTicketForAge } from '@/lib/orderUtils';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['ticket_types']['Row'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
type AttendeeInsert = Database['public']['Tables']['attendees']['Insert'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.parse(body);
    const paymentMethod = parsed.payment_method;

    const lineItems = (parsed.tickets ?? []).filter((ticket) => ticket.quantity > 0);

    const answers = parsed.answers ?? {};
    const people = getPeopleFromAnswers(answers);
    const attendingPeople = people.filter((person) => isParticipantAttending(person));
    const tshirtOrders = Array.isArray((answers as Record<string, unknown>)?.tshirt_orders)
      ? ((answers as Record<string, unknown>).tshirt_orders as Array<Record<string, unknown>>)
      : [];
    const personTshirtQuantity = people.reduce((sum, person) => {
      const raw = person.tshirt_quantity;
      const quantity = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : 0;
      return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
    }, 0);
    const additionalTshirtQuantity = tshirtOrders.reduce((sum, order) => {
      const raw = order?.quantity;
      const quantity = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : 0;
      return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
    }, 0);
    const totalTshirtQuantity = personTshirtQuantity + additionalTshirtQuantity;

    if (!lineItems.length && attendingPeople.length > 0) {
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
        totalCents += ticket.price_cents * item.quantity;
        orderItems.push({
          ticket_type_id: ticket.id,
          quantity: item.quantity,
          unit_amount: ticket.price_cents,
          name: ticket.name
        });
      }
    }

    if (totalTshirtQuantity > 0 && !orderItems.some((item) => isTshirtTicketName(item.name))) {
      const TSHIRT_PRICE_CENTS = 2500;
      let tshirtTicket: TicketRow | null = null;

      const { data: tshirtTickets } = await supabaseAdmin
        .from('ticket_types')
        .select('*')
        .eq('active', true)
        .eq('price_cents', TSHIRT_PRICE_CENTS)
        .ilike('name', '%shirt%')
        .limit(1);

      if (tshirtTickets && tshirtTickets.length) {
        tshirtTicket = tshirtTickets[0] as TicketRow;
      }

      if (!tshirtTicket) {
        const { data: inserted, error: insertError } = await (supabaseAdmin
          .from('ticket_types') as any)
          .insert([
            {
              name: 'Reunion T-Shirt',
              description: 'Reunion T-Shirt',
              price_cents: TSHIRT_PRICE_CENTS,
              currency: 'usd',
              active: true,
              position: 99
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error(insertError);
          throw new Error('Unable to create T-shirt ticket');
        }

        tshirtTicket = inserted as TicketRow;
      }

      if (tshirtTicket) {
        totalCents += tshirtTicket.price_cents * totalTshirtQuantity;
        orderItems.push({
          ticket_type_id: tshirtTicket.id,
          quantity: totalTshirtQuantity,
          unit_amount: tshirtTicket.price_cents,
          name: tshirtTicket.name
        });
      }
    }

    const ticketQuantitiesById = new Map(lineItems.map((item) => [item.ticket_type_id, item.quantity]));
    const ageBasedTickets = ticketRecords.filter(
      (ticket) => typeof ticket.age_min === 'number' || typeof ticket.age_max === 'number'
    );
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

    const orderInsert: OrderInsert = {
      purchaser_email: parsed.purchaser_email,
      purchaser_name: parsed.purchaser_name,
      status: 'pending',
      total_cents: totalCents,
      form_answers: parsed.answers ?? {},
      payment_method: paymentMethod
    };

    const { data: order, error: orderError } = await (supabaseAdmin
      .from('orders') as any)
      .insert([orderInsert])
      .select()
      .single();

    if (orderError || !order) {
      console.error(orderError);
      throw new Error('Unable to create order');
    }

    const orderRecord = order as OrderRow;

    const orderItemInserts: OrderItemInsert[] = orderItems.map((item) => ({
      order_id: orderRecord.id,
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity
    }));

    const { error: itemsError } = await (supabaseAdmin.from('order_items') as any).insert(orderItemInserts);

    if (itemsError) {
      console.error(itemsError);
      throw new Error('Unable to create order items');
    }

    const origin = request.headers.get('origin');
    const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
    const fallbackHost = forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'http://localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin ?? fallbackHost;
    const redirectUrl = `${baseUrl}/success?order=${orderRecord.id}&status=pending&method=${paymentMethod}&amount=${totalCents}`;
    const stripeEnabled = paymentMethod === 'stripe' && process.env.STRIPE_CHECKOUT_ENABLED === 'true';

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

    if (!orderItems.length) {
      return NextResponse.json({ redirectUrl });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ redirectUrl });
    }

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${baseUrl}/success?order=${orderRecord.id}&status=paid&method=stripe&amount=${totalCents}`,
      cancel_url: `${baseUrl}/register?canceled=1`,
      customer_email: parsed.purchaser_email,
      metadata: {
        order_id: orderRecord.id
      },
      line_items: orderItems.map((item) => ({
        price_data: {
          currency: ticketsById.get(item.ticket_type_id)!.currency,
          unit_amount: item.unit_amount,
          product_data: {
            name: item.name
          }
        },
        quantity: item.quantity
      }))
    });

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
