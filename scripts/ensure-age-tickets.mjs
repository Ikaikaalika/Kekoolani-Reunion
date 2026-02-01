import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
let envFile = '';
try {
  envFile = readFileSync(envPath, 'utf8');
} catch (error) {
  console.error('Unable to read .env.local.');
  process.exit(1);
}

const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const index = trimmed.indexOf('=');
  if (index === -1) continue;
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const LEGACY_TICKET_NAMES = ['Keiki (3-10)', 'Reunion T-Shirt'];

const desiredTickets = [
  {
    name: 'Keiki (0-3)',
    description: 'Reunion admission for ages 0-3.',
    price_cents: 0,
    age_min: 0,
    age_max: 3,
    currency: 'usd',
    active: true,
    position: 1
  },
  {
    name: 'Keiki (4-10)',
    description: 'Reunion admission for ages 4-10.',
    price_cents: 2500,
    age_min: 4,
    age_max: 10,
    currency: 'usd',
    active: true,
    position: 2
  },
  {
    name: 'General (11+)',
    description: 'Reunion admission for ages 11 and up.',
    price_cents: 3500,
    age_min: 11,
    age_max: null,
    currency: 'usd',
    active: true,
    position: 3
  },
  {
    name: 'Reunion T-Shirt (Adult)',
    description: 'Reunion T-Shirt (Adult)',
    price_cents: 2500,
    age_min: null,
    age_max: null,
    currency: 'usd',
    active: true,
    position: 98
  },
  {
    name: 'Reunion T-Shirt (Youth)',
    description: 'Reunion T-Shirt (Youth)',
    price_cents: 1500,
    age_min: null,
    age_max: null,
    currency: 'usd',
    active: true,
    position: 99
  }
];

const { data: existingTickets, error: fetchError } = await supabase
  .from('ticket_types')
  .select('id, name')
  .in('name', [...desiredTickets.map((ticket) => ticket.name), ...LEGACY_TICKET_NAMES]);

if (fetchError) {
  console.error('Unable to fetch tickets:', fetchError.message);
  process.exit(1);
}

const byName = new Map();
for (const ticket of existingTickets ?? []) {
  if (!byName.has(ticket.name)) {
    byName.set(ticket.name, ticket.id);
  }
}

const upserts = desiredTickets.map((ticket) => {
  let id = byName.get(ticket.name);
  if (!id && ticket.name === 'Keiki (4-10)') {
    id = byName.get('Keiki (3-10)');
  }
  if (!id && ticket.name === 'Reunion T-Shirt (Adult)') {
    id = byName.get('Reunion T-Shirt');
  }
  return { ...ticket, id: id ?? crypto.randomUUID() };
});

const { error: upsertError } = await supabase.from('ticket_types').upsert(upserts);

if (upsertError) {
  console.error('Unable to upsert tickets:', upsertError.message);
  process.exit(1);
}

console.log('Age-based tickets ensured.');
