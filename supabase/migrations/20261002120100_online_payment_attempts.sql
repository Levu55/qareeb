-- Qareeb: server-side structure for online payments (provider still to be chosen).
--
-- Flow:
--   customer app -> payment-checkout Edge Function (JWT) -> qareeb_start_online_payment
--     -> provider checkout (secret keys stay in the Edge Function)
--   provider -> payment-webhook Edge Function (signature verified) -> qareeb_record_provider_payment
--     -> "Payment-attempts" + "Payments" -> wallet Earning (ledger trigger) -> notifications
--
-- "Payment-attempts": one row per checkout. Its "ID" is the order reference sent to the
-- provider, so a callback can only settle the attempt (and amount) the server created.
--   Initiated    -> waiting for the provider (expires after 15 minutes)
--   Succeeded    -> provider confirmed; the payment is Paid
--   Failed       -> provider declined, the checkout could not be created, the attempt
--                   expired, or a newer attempt replaced it
--   Needs-review -> provider took money we cannot apply (payment already settled, or a
--                   different amount/currency): an admin refunds or resolves it manually
-- Repeated callbacks are idempotent. A success after Failed is still applied (the
-- provider took the money). Clients can read their own attempts and never write them.
--
-- Cash stays as before, but cash cannot be chosen while an online attempt is pending and
-- the helper cannot confirm cash once the customer switched to an online method, so one
-- job cannot be paid twice through a race.
--
-- qareeb_record_provider_payment(booking, ...) from 20260930120400 is replaced: nothing
-- called it, and it trusted the booking id and amount from the callback.
-- The admin dashboard now counts Failed payments as still open (they are unpaid).

-- ---------------------------------------------------------------------------
-- 1. Payment attempts
-- ---------------------------------------------------------------------------
create table public."Payment-attempts" (
  "ID" uuid primary key default gen_random_uuid(),
  "Payment-id" uuid not null references public."Payments" ("ID"),
  "Payer-id" uuid not null references public."Profiles" ("ID"),
  "Provider" text not null check ("Provider" ~ '^[a-z_]{1,30}$'),
  "Method" text not null check ("Method" in ('Easypaisa', 'JazzCash', 'Card')),
  "Amount" numeric not null check ("Amount" > 0),
  "Currency" text not null,
  "Status" text not null default 'Initiated'
    check ("Status" in ('Initiated', 'Succeeded', 'Failed', 'Needs-review')),
  "Provider-ref" text check ("Provider-ref" is null or char_length("Provider-ref") between 1 and 200),
  "Note" text check ("Note" is null or char_length("Note") <= 300),
  "Created-at" timestamptz not null default now(),
  "Expires-at" timestamptz not null,
  "Updated-at" timestamptz not null default now(),
  "Settled-at" timestamptz,
  constraint "Payment-attempts_Provider-ref_key" unique ("Provider", "Provider-ref")
);

alter table public."Payment-attempts" enable row level security;

create index "Payment-attempts_Payment-id_idx" on public."Payment-attempts" ("Payment-id");
create index "Payment-attempts_Payer-id_idx" on public."Payment-attempts" ("Payer-id");
create index "Payment-attempts_review_idx" on public."Payment-attempts" ("Created-at")
  where "Status" = 'Needs-review';
-- At most one checkout waiting for the provider per payment
create unique index "Payment-attempts_one_open_per_payment" on public."Payment-attempts" ("Payment-id")
  where "Status" = 'Initiated';

create policy "Payment attempts: read as payer or admin" on public."Payment-attempts"
  for select to authenticated
  using ("Payer-id" = (select auth.uid()) or (select public.qareeb_is_admin()));
-- No insert/update/delete policies: written only by the functions below.

-- ---------------------------------------------------------------------------
-- 2. Start a checkout (called by the payment-checkout Edge Function with the
--    verified caller id; not executable by clients)
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_start_online_payment(
  p_payer_id uuid,
  p_booking_id uuid,
  p_method text,
  p_provider text
)
returns table (attempt_id uuid, amount numeric, currency text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay public."Payments"%rowtype;
  att public."Payment-attempts"%rowtype;
begin
  if p_method not in ('Easypaisa', 'JazzCash', 'Card') then
    raise exception 'Unknown online payment method' using errcode = '22023';
  end if;

  select * into pay from public."Payments"
  where "Booking-id" = p_booking_id and "Payer-id" = p_payer_id
  for update;
  if not found then
    raise exception 'Payment not found' using errcode = '42501';
  end if;
  if pay."Status" = 'Paid' then
    raise exception 'This payment is already paid' using errcode = '42501';
  end if;
  if pay."Amount" <= 0 then
    raise exception 'Nothing to pay for this job' using errcode = '22023';
  end if;

  -- Replace any checkout still waiting (a late success for it is handled as Needs-review)
  update public."Payment-attempts"
  set "Status" = 'Failed', "Updated-at" = now(), "Settled-at" = now(),
      "Note" = case when "Expires-at" <= now() then 'Expired' else 'Replaced by a new payment attempt' end
  where "Payment-id" = pay."ID" and "Status" = 'Initiated';

  insert into public."Payment-attempts"
    ("Payment-id", "Payer-id", "Provider", "Method", "Amount", "Currency", "Expires-at")
  values (pay."ID", p_payer_id, p_provider, p_method, pay."Amount", pay."Currency", now() + interval '15 minutes')
  returning * into att;

  -- Leaving cash: the helper can no longer confirm a cash payment for this job
  update public."Payments"
  set "Method" = p_method, "Status" = 'Due', "Updated-at" = now()
  where "ID" = pay."ID";

  return query select att."ID", att."Amount", att."Currency", att."Expires-at";
end;
$$;

-- The checkout could not be created at the provider (or the customer abandoned it before
-- paying): close the attempt so cash can be chosen again straight away.
create or replace function public.qareeb_cancel_payment_attempt(p_attempt_id uuid, p_note text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  att public."Payment-attempts"%rowtype;
begin
  select * into att from public."Payment-attempts" where "ID" = p_attempt_id for update;
  if not found then
    raise exception 'Payment attempt not found' using errcode = 'P0002';
  end if;
  if att."Status" <> 'Initiated' then
    return att."Status";
  end if;
  update public."Payment-attempts"
  set "Status" = 'Failed', "Note" = left(coalesce(nullif(p_note, ''), 'Cancelled'), 300),
      "Updated-at" = now(), "Settled-at" = now()
  where "ID" = att."ID";
  return 'Failed';
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Provider result (called by the payment-webhook Edge Function after it verified
--    the provider's signature; not executable by clients)
-- ---------------------------------------------------------------------------
drop function public.qareeb_record_provider_payment(uuid, text, text, text, numeric, boolean);

create or replace function public.qareeb_record_provider_payment(
  p_attempt_id uuid,
  p_provider text,
  p_provider_ref text,
  p_amount numeric,
  p_currency text,
  p_success boolean,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  att public."Payment-attempts"%rowtype;
  pay public."Payments"%rowtype;
  review_note text;
begin
  if coalesce(p_provider_ref, '') = '' or p_success is null then
    raise exception 'Invalid provider result' using errcode = '22023';
  end if;

  select * into att from public."Payment-attempts" where "ID" = p_attempt_id for update;
  if not found then
    raise exception 'Payment attempt not found' using errcode = 'P0002';
  end if;
  if att."Provider" <> p_provider then
    raise exception 'Payment attempt belongs to another provider' using errcode = '22023';
  end if;
  if att."Provider-ref" is not null and att."Provider-ref" <> p_provider_ref then
    raise exception 'Provider reference does not match this payment attempt' using errcode = '22023';
  end if;

  -- Callbacks can be delivered more than once and out of order
  if att."Status" in ('Succeeded', 'Needs-review') or (att."Status" = 'Failed' and not p_success) then
    return att."Status";
  end if;

  select * into pay from public."Payments" where "ID" = att."Payment-id" for update;

  if not p_success then
    update public."Payment-attempts"
    set "Status" = 'Failed', "Provider-ref" = p_provider_ref, "Note" = left(coalesce(nullif(p_reason, ''), 'Declined by the provider'), 300),
        "Updated-at" = now(), "Settled-at" = now()
    where "ID" = att."ID";
    -- Show the failure unless the job is paid or a newer checkout is still running
    if pay."Status" <> 'Paid' and not exists (
        select 1 from public."Payment-attempts"
        where "Payment-id" = pay."ID" and "Status" = 'Initiated' and "ID" <> att."ID") then
      update public."Payments" set "Status" = 'Failed', "Updated-at" = now() where "ID" = pay."ID";
    end if;
    return 'Failed';
  end if;

  if p_amount is distinct from att."Amount" or coalesce(p_currency, att."Currency") <> att."Currency" then
    review_note := format('Provider reported %s %s, expected %s %s', p_amount, coalesce(p_currency, '?'), att."Amount", att."Currency");
  elsif pay."Status" = 'Paid' then
    review_note := 'The job was already paid; refund this provider payment';
  end if;

  if review_note is not null then
    update public."Payment-attempts"
    set "Status" = 'Needs-review', "Provider-ref" = p_provider_ref, "Note" = review_note,
        "Updated-at" = now(), "Settled-at" = now()
    where "ID" = att."ID";
    perform public.qareeb_write_admin_log('payment.needs_review', 'Payment-attempts', att."ID"::text,
      jsonb_build_object('payment_id', pay."ID", 'booking_id', pay."Booking-id", 'provider', p_provider,
                         'provider_ref', p_provider_ref, 'amount', p_amount, 'currency', p_currency, 'note', review_note));
    return 'Needs-review';
  end if;

  update public."Payment-attempts"
  set "Status" = 'Succeeded', "Provider-ref" = p_provider_ref, "Note" = null,
      "Updated-at" = now(), "Settled-at" = now()
  where "ID" = att."ID";

  -- Triggers credit the helper's wallet (Earning) and notify both parties
  update public."Payments"
  set "Status" = 'Paid', "Method" = att."Method", "Provider" = att."Provider", "Provider-ref" = p_provider_ref,
      "Paid-at" = now(), "Updated-at" = now()
  where "ID" = pay."ID";

  return 'Succeeded';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Cash cannot race an online payment
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
    if exists (select 1 from public."Payment-attempts"
               where "Payment-id" = pay."ID" and "Status" = 'Initiated' and "Expires-at" > now()) then
      raise exception 'An online payment for this job is in progress. Try again in a few minutes.'
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
-- 5. Admin dashboard: a payment whose online attempt failed is still owed
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_admin_stats()
returns table (
  customers bigint,
  helpers_approved bigint,
  helpers_pending bigint,
  bookings_active bigint,
  bookings_completed_today bigint,
  job_value_completed_today numeric,
  payments_paid_today numeric,
  payments_open bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.qareeb_is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
  select
    (select count(*) from public."Profiles" where "Role" = 'user'),
    (select count(*) from public."Helpers" where "Verify-status" = 'Approved'),
    (select count(*) from public."Helpers" where "Verify-status" = 'Pending'),
    (select count(*) from public."Bookings" where "Status" in ('Pending', 'Accepted', 'On-the-way', 'Arrived', 'In-progress')),
    (select count(*) from public."Bookings" where "Status" = 'Completed'
       and ("Completed-at" at time zone 'Asia/Karachi')::date = (now() at time zone 'Asia/Karachi')::date),
    (select coalesce(sum(t."Price"), 0) from public."Bookings" b join public."Tasks" t on t."ID" = b."Task-id"
       where b."Status" = 'Completed'
         and (b."Completed-at" at time zone 'Asia/Karachi')::date = (now() at time zone 'Asia/Karachi')::date),
    (select coalesce(sum("Amount"), 0) from public."Payments" where "Status" = 'Paid'
       and ("Paid-at" at time zone 'Asia/Karachi')::date = (now() at time zone 'Asia/Karachi')::date),
    (select count(*) from public."Payments" where "Status" in ('Due', 'Awaiting-confirmation', 'Failed'));
end;
$$;

revoke all on function public.qareeb_admin_stats() from public, anon;
grant execute on function public.qareeb_admin_stats() to authenticated, service_role;

revoke all on function public.qareeb_start_online_payment(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.qareeb_cancel_payment_attempt(uuid, text) from public, anon, authenticated;
revoke all on function public.qareeb_record_provider_payment(uuid, text, text, numeric, text, boolean, text) from public, anon, authenticated;
revoke all on function public.qareeb_choose_payment_method(uuid, text) from public, anon;
grant execute on function public.qareeb_start_online_payment(uuid, uuid, text, text) to service_role;
grant execute on function public.qareeb_cancel_payment_attempt(uuid, text) to service_role;
grant execute on function public.qareeb_record_provider_payment(uuid, text, text, numeric, text, boolean, text) to service_role;
grant execute on function public.qareeb_choose_payment_method(uuid, text) to authenticated, service_role;
