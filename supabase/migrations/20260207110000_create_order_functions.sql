create or replace function public.create_order_with_items(
  p_purchaser_email text,
  p_purchaser_name text,
  p_status text,
  p_total_cents integer,
  p_form_answers jsonb,
  p_payment_method text,
  p_items jsonb
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order public.orders;
begin
  insert into public.orders (
    purchaser_email,
    purchaser_name,
    status,
    total_cents,
    form_answers,
    payment_method
  ) values (
    p_purchaser_email,
    p_purchaser_name,
    p_status,
    p_total_cents,
    p_form_answers,
    p_payment_method
  )
  returning * into new_order;

  if p_items is not null and jsonb_typeof(p_items) = 'array' then
    insert into public.order_items (order_id, ticket_type_id, quantity)
    select
      new_order.id,
      (item->>'ticket_type_id')::uuid,
      (item->>'quantity')::integer
    from jsonb_array_elements(p_items) as item
    where (item->>'ticket_type_id') is not null;
  end if;

  return new_order;
end;
$$;

create or replace function public.decrement_ticket_inventory(
  p_order_id uuid
) returns void
language sql
security definer
set search_path = public
as $$
  update public.ticket_types as t
  set inventory = greatest(t.inventory - oi.quantity, 0)
  from public.order_items as oi
  where oi.order_id = p_order_id
    and oi.ticket_type_id = t.id
    and t.inventory is not null;
$$;
