-- Qareeb: payment records and platform settings.
--
-- No online payment provider is configured yet, so this migration prepares the
-- database side only:
-- - "Settings": platform values read by the app and by database rules (admin-editable).
-- - "Payments": one row per completed booking, created by the database with the task price.
--   Clients never write it directly; changes go through the functions below.
--     Due                   -> customer has not chosen how to pay
--     Awaiting-confirmation -> customer chose cash; the helper confirms receipt
--     Paid / Failed         -> final (Failed only from the provider path)
-- - Cash: customer picks it (allowed up to the digital-payment threshold), helper confirms.
-- - Online (Easypaisa/JazzCash/Card): refused until a provider is integrated. The provider's
--   webhook (a future Edge Function using the service role) will call
--   qareeb_record_provider_payment, which clients cannot execute.
-- Wallet balances and Transactions are NOT changed here: cash never passes through the
-- platform, and commission/payout rules have not been decided.

-- ---------------------------------------------------------------------------
-- 1. Settings
-- ---------------------------------------------------------------------------
create table public."Settings" (
  "Key" text primary key check ("Key" ~ '^[a-z_]{1,60}$'),
  "Value" jsonb not null,
  "Description" text,
  "Updated-at" timestamptz not null default now(),
  "Updated-by" uuid references public."Profiles" ("ID") on delete set null
);

alter table public."Settings" enable row level security;

create policy "Settings: signed-in users read" on public."Settings"
  for select to authenticated using (true);

create policy "Settings: admins update" on public."Settings"
  for update to authenticated
  using ((select public.qareeb_is_admin()))
  with check ((select public.qareeb_is_admin()));

create or replace function public.qareeb_stamp_setting()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new."Updated-at" := now();
  new."Updated-by" := auth.uid();
  return new;
end;
$$;

create trigger qareeb_stamp_setting
  before update on public."Settings"
  for each row execute function public.qareeb_stamp_setting();

insert into public."Settings" ("Key", "Value", "Description") values
  ('digital_payment_threshold', '1500',
   'Jobs priced above this amount (PKR) must be paid online; cash is accepted up to it.');

-- ---------------------------------------------------------------------------
-- 2. Payments
-- ---------------------------------------------------------------------------
create table public."Payments" (
  "ID" uuid primary key default gen_random_uuid(),
  "Booking-id" uuid not null unique references public."Bookings" ("ID"),
  "Payer-id" uuid not null references public."Profiles" ("ID"),
  "Payee-id" uuid not null references public."Profiles" ("ID"),
  "Amount" numeric not null check ("Amount" >= 0),
  "Currency" text not null default 'PKR',
  "Method" text check ("Method" in ('Cash', 'Easypaisa', 'JazzCash', 'Card')),
  "Status" text not null default 'Due'
    check ("Status" in ('Due', 'Awaiting-confirmation', 'Paid', 'Failed')),
  "Provider" text,
  "Provider-ref" text unique,
  "Created-at" timestamptz not null default now(),
  "Updated-at" timestamptz not null default now(),
  "Paid-at" timestamptz
);

alter table public."Payments" enable row level security;

create index "Payments_Payer-id_idx" on public."Payments" ("Payer-id");
create index "Payments_Payee-id_idx" on public."Payments" ("Payee-id");

-- Read-only for the two parties and admins; no client insert/update/delete policies
create policy "Payments: read as payer, payee, or admin" on public."Payments"
  for select to authenticated
  using (
    "Payer-id" = (select auth.uid())
    or "Payee-id" = (select auth.uid())
    or (select public.qareeb_is_admin())
  );

-- A completed booking gets its payment record
create or replace function public.qareeb_create_payment_for_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new."Status" = 'Completed' and old."Status" is distinct from 'Completed' then
    insert into public."Payments" ("Booking-id", "Payer-id", "Payee-id", "Amount")
    select new."ID", new."User-id", new."Helper-id", coalesce(t."Price", 0)
    from public."Tasks" t where t."ID" = new."Task-id"
    on conflict ("Booking-id") do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.qareeb_create_payment_for_booking() from public, anon, authenticated;

create trigger qareeb_create_payment_for_booking
  after update on public."Bookings"
  for each row execute function public.qareeb_create_payment_for_booking();

-- Bookings completed before this migration
insert into public."Payments" ("Booking-id", "Payer-id", "Payee-id", "Amount", "Created-at")
select b."ID", b."User-id", b."Helper-id", coalesce(t."Price", 0), coalesce(b."Completed-at", now())
from public."Bookings" b
join public."Tasks" t on t."ID" = b."Task-id"
where b."Status" = 'Completed'
on conflict ("Booking-id") do nothing;

-- ---------------------------------------------------------------------------
-- 3. Customer chooses how to pay
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_choose_payment_method(p_booking_id uuid, p_method text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public."Payments"%rowtype;
  threshold numeric;
begin
  select * into pay from public."Payments"
  where "Booking-id" = p_booking_id and "Payer-id" = auth.uid()
  for update;
  if not found then
    raise exception 'Payment not found' using errcode = '42501';
  end if;
  if pay."Status" not in ('Due', 'Awaiting-confirmation', 'Failed') then
    raise exception 'This payment is already %', lower(pay."Status") using errcode = '42501';
  end if;

  if p_method = 'Cash' then
    select ("Value" #>> '{}')::numeric into threshold
    from public."Settings" where "Key" = 'digital_payment_threshold';
    if threshold is not null and pay."Amount" > threshold then
      raise exception 'Cash is accepted up to Rs. %. This job needs online payment, which is not available yet.', threshold
        using errcode = '42501';
    end if;
    update public."Payments"
    set "Method" = 'Cash', "Status" = 'Awaiting-confirmation', "Updated-at" = now()
    where "ID" = pay."ID";
    return 'Awaiting-confirmation';
  elsif p_method in ('Easypaisa', 'JazzCash', 'Card') then
    raise exception 'Online payments are not available yet. Please pay in cash.' using errcode = '42501';
  end if;

  raise exception 'Unknown payment method' using errcode = '22023';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Helper confirms cash received
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_confirm_cash_received(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public."Payments"%rowtype;
begin
  select * into pay from public."Payments"
  where "Booking-id" = p_booking_id and "Payee-id" = auth.uid()
  for update;
  if not found then
    raise exception 'Payment not found' using errcode = '42501';
  end if;
  if pay."Status" = 'Paid' then
    return 'Paid';
  end if;
  if pay."Method" is distinct from 'Cash' or pay."Status" <> 'Awaiting-confirmation' then
    raise exception 'The customer has not chosen to pay in cash yet' using errcode = '42501';
  end if;
  update public."Payments"
  set "Status" = 'Paid', "Paid-at" = now(), "Updated-at" = now()
  where "ID" = pay."ID";
  return 'Paid';
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Server-only: result from an online payment provider (future webhook Edge Function)
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_record_provider_payment(
  p_booking_id uuid,
  p_method text,
  p_provider text,
  p_provider_ref text,
  p_amount numeric,
  p_success boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public."Payments"%rowtype;
begin
  if p_method not in ('Easypaisa', 'JazzCash', 'Card') or coalesce(p_provider_ref, '') = '' then
    raise exception 'Invalid provider result' using errcode = '22023';
  end if;

  select * into pay from public."Payments" where "Booking-id" = p_booking_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  -- Webhooks can be delivered more than once
  if pay."Provider-ref" = p_provider_ref or pay."Status" = 'Paid' then
    return pay."Status";
  end if;
  if p_success and p_amount <> pay."Amount" then
    raise exception 'Paid amount % does not match the amount due %', p_amount, pay."Amount" using errcode = '22023';
  end if;

  update public."Payments"
  set "Method" = p_method, "Provider" = p_provider, "Provider-ref" = p_provider_ref,
      "Status" = case when p_success then 'Paid' else 'Failed' end,
      "Paid-at" = case when p_success then now() end,
      "Updated-at" = now()
  where "ID" = pay."ID";
  return case when p_success then 'Paid' else 'Failed' end;
end;
$$;

revoke all on function public.qareeb_choose_payment_method(uuid, text) from public, anon;
revoke all on function public.qareeb_confirm_cash_received(uuid) from public, anon;
revoke all on function public.qareeb_record_provider_payment(uuid, text, text, text, numeric, boolean) from public, anon, authenticated;
grant execute on function public.qareeb_choose_payment_method(uuid, text) to authenticated, service_role;
grant execute on function public.qareeb_confirm_cash_received(uuid) to authenticated, service_role;
grant execute on function public.qareeb_record_provider_payment(uuid, text, text, text, numeric, boolean) to service_role;
