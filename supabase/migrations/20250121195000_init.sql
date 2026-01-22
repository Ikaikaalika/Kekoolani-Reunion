create extension if not exists "pgcrypto";

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists site_settings (
  id uuid primary key default gen_random_uuid(),
  hero_title text not null,
  hero_subtitle text,
  event_dates text,
  location text,
  about_html text,
  schedule_json jsonb,
  gallery_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  show_schedule boolean not null default true,
  show_gallery boolean not null default true,
  show_purpose boolean not null default true,
  show_costs boolean not null default true,
  show_logistics boolean not null default true,
  show_committees boolean not null default false
);

create table if not exists content_sections (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text,
  content jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists registration_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  field_type text not null,
  options jsonb,
  required boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registration_questions_field_type_check
    check (field_type in ('text', 'textarea', 'select', 'checkbox', 'date'))
);

create table if not exists ticket_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null,
  currency text not null default 'usd',
  inventory integer,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text,
  purchaser_email text not null,
  purchaser_name text not null,
  status text not null default 'pending',
  total_cents integer not null,
  form_answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (status in ('pending', 'paid', 'canceled'))
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id) on delete restrict,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists attendees (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_site_settings_updated_at') then
    create trigger set_site_settings_updated_at before update on site_settings
    for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_content_sections_updated_at') then
    create trigger set_content_sections_updated_at before update on content_sections
    for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_registration_questions_updated_at') then
    create trigger set_registration_questions_updated_at before update on registration_questions
    for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_ticket_types_updated_at') then
    create trigger set_ticket_types_updated_at before update on ticket_types
    for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_orders_updated_at') then
    create trigger set_orders_updated_at before update on orders
    for each row execute function set_updated_at();
  end if;
end $$;
