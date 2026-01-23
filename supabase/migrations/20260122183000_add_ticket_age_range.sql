alter table ticket_types
  add column if not exists age_min integer,
  add column if not exists age_max integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ticket_types_age_bounds_check') then
    alter table ticket_types
      add constraint ticket_types_age_bounds_check
      check (
        (age_min is null or age_min >= 0)
        and (age_max is null or age_max >= 0)
        and (age_min is null or age_max is null or age_min <= age_max)
      );
  end if;
end $$;
