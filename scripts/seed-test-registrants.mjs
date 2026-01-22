import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const timestamp = Date.now();

const photoPool = [
  '/assets/IMG_0644.JPG',
  '/assets/IMG_0647.JPG',
  '/assets/IMG_0721.JPG',
  '/assets/IMG_2937.JPG',
  '/assets/IMG_2972.JPG',
  '/assets/Hilo.jpg',
  '/assets/Hilo-1.jpg',
  '/assets/Keiki_LoiKalo.jpg',
  '/assets/LoiKalo1.jpg',
  '/assets/LoiKalo2.jpeg',
  '/assets/LoiKalo3.jpg',
  '/assets/MaunaKea.jpg'
];

const groups = [
  ['Kaleo TEST', 'Leilani TEST'],
  ['Malia TEST', 'Kaimana TEST'],
  ['Nohea TEST', 'Keoni TEST'],
  ['Pua TEST', 'Makana TEST']
];

const lineageOptions = ['Nawai', 'Katherine', 'Amy'];
const tshirtSizes = ['S', 'M', 'L', 'XL'];

const makePerson = (fullName, index, groupIndex) => {
  const lower = fullName.toLowerCase().replace(/\s+/g, '.');
  const email = `${lower}+${timestamp}@example.com`;
  const phone = `808-555-01${(index + groupIndex * 2).toString().padStart(2, '0')}`;
  const address = `PO Box ${1000 + index + groupIndex * 2}, Hilo, HI 96720`;

  return {
    full_name: fullName,
    age: String(18 + index + groupIndex * 3),
    relationship: index % 2 === 0 ? 'Grandchild' : 'Great-grandchild',
    lineage: lineageOptions[(index + groupIndex) % lineageOptions.length],
    lineage_other: null,
    attendance_days: ['Friday', 'Saturday', 'Sunday'],
    tshirt_size: tshirtSizes[(index + groupIndex) % tshirtSizes.length],
    tshirt_quantity: 1,
    email,
    phone,
    address,
    same_contact: false
  };
};

const seed = async () => {
  const { data: ticketTypes, error: ticketError } = await supabase
    .from('ticket_types')
    .select('id, price_cents, currency, name')
    .eq('active', true)
    .order('position', { ascending: true })
    .limit(1);

  if (ticketError) {
    console.error('Unable to fetch tickets:', ticketError.message);
    process.exit(1);
  }

  let ticket = ticketTypes?.[0] ?? null;

  if (!ticket) {
    const { data: createdTicket, error: createError } = await supabase
      .from('ticket_types')
      .insert({
        name: 'Reunion Registration',
        description: 'Meals, reunion t-shirt, and weekend activities.',
        price_cents: 6000,
        currency: 'usd',
        active: true,
        position: 1
      })
      .select('id, price_cents, currency, name')
      .single();

    if (createError) {
      console.error('Failed to create a default ticket type:', createError.message);
      console.warn('No active ticket types found. Orders will be created without ticket items.');
    } else {
      ticket = createdTicket;
    }
  }

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const names = groups[groupIndex];
    const people = names.map((name, index) => makePerson(name, index, groupIndex));
    const photo_urls = names.map((_, idx) => photoPool[(groupIndex * 2 + idx) % photoPool.length]);
    const quantity = people.length;

    const orderInsert = {
      purchaser_name: people[0].full_name,
      purchaser_email: people[0].email,
      status: 'paid',
      total_cents: ticket ? ticket.price_cents * quantity : 0,
      form_answers: {
        people,
        photo_urls,
        donation_note: 'Seeded test data'
      }
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsert)
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Failed to create order:', orderError?.message ?? 'unknown error');
      continue;
    }

    if (ticket) {
      const { error: itemError } = await supabase.from('order_items').insert({
        order_id: order.id,
        ticket_type_id: ticket.id,
        quantity
      });

      if (itemError) {
        console.error('Failed to create order items:', itemError.message);
      }
    }

    const attendeeRows = people.map(() => ({
      order_id: order.id,
      answers: orderInsert.form_answers
    }));

    const { error: attendeeError } = await supabase.from('attendees').insert(attendeeRows);

    if (attendeeError) {
      console.error('Failed to create attendee rows:', attendeeError.message);
    }
  }

  console.log('Seeded test registrants with last name TEST.');
};

seed();
