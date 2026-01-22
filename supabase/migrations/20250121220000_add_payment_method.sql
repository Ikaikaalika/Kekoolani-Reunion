alter table orders
  add column if not exists payment_method text;
