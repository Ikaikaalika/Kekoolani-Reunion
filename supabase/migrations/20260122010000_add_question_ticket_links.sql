create table if not exists registration_question_tickets (
  question_id uuid not null references registration_questions(id) on delete cascade,
  ticket_type_id uuid not null references ticket_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, ticket_type_id)
);

create index if not exists registration_question_tickets_ticket_type_id_idx
  on registration_question_tickets(ticket_type_id);
