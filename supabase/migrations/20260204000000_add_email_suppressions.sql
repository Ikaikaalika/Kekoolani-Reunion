create table if not exists email_suppressions (
  email text primary key,
  reason text not null,
  source text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_suppressions_created_at_idx
  on email_suppressions(created_at desc);
