-- Qareeb: final hardening from the security pass.
--
-- 1. Payments: clients could never write them, but server roles could still change the
--    amount or parties of a payment, edit a paid payment, or delete one. Now, for every
--    role: amount, currency, payer, payee and booking are fixed; a Paid payment is final;
--    payments cannot be deleted or truncated.
-- 2. Payment-attempts: the order the provider was given (payment, payer, provider, method,
--    amount, currency) is fixed; a provider reference cannot be swapped; Succeeded and
--    Needs-review attempts are final; attempts cannot be deleted or truncated.
-- 3. Profiles."Created at" / Helpers."Created-at" were editable by their owners (shown to
--    admins as the join date). For API callers they are now set by the database.
-- 4. Table privileges: anon/authenticated held TRUNCATE (which bypasses RLS), REFERENCES
--    and TRIGGER on every table. Clients never need them. Write privileges are also
--    removed on tables that clients never write (money, audit log, notifications);
--    RLS already refused those writes, so app behaviour does not change.

-- ---------------------------------------------------------------------------
-- 1. Payments
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_guard_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('DELETE', 'TRUNCATE') then
    raise exception 'Payment records cannot be deleted' using errcode = '42501';
  end if;

  if new."ID" is distinct from old."ID"
    or new."Booking-id" is distinct from old."Booking-id"
    or new."Payer-id" is distinct from old."Payer-id"
    or new."Payee-id" is distinct from old."Payee-id"
    or new."Amount" is distinct from old."Amount"
    or new."Currency" is distinct from old."Currency"
    or new."Created-at" is distinct from old."Created-at" then
    raise exception 'The amount and parties of a payment cannot be changed' using errcode = '42501';
  end if;

  if old."Status" = 'Paid' and (to_jsonb(new) - 'Updated-at') is distinct from (to_jsonb(old) - 'Updated-at') then
    raise exception 'A paid payment cannot be changed' using errcode = '42501';
  end if;

  if new."Status" = 'Paid' and new."Paid-at" is null then
    new."Paid-at" := now();
  end if;
  return new;
end;
$$;

create trigger qareeb_guard_payment
  before update or delete on public."Payments"
  for each row execute function public.qareeb_guard_payment();

create trigger qareeb_block_payment_truncate
  before truncate on public."Payments"
  for each statement execute function public.qareeb_guard_payment();

-- ---------------------------------------------------------------------------
-- 2. Payment attempts
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_guard_payment_attempt()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('DELETE', 'TRUNCATE') then
    raise exception 'Payment attempts cannot be deleted' using errcode = '42501';
  end if;

  if new."ID" is distinct from old."ID"
    or new."Payment-id" is distinct from old."Payment-id"
    or new."Payer-id" is distinct from old."Payer-id"
    or new."Provider" is distinct from old."Provider"
    or new."Method" is distinct from old."Method"
    or new."Amount" is distinct from old."Amount"
    or new."Currency" is distinct from old."Currency"
    or new."Created-at" is distinct from old."Created-at" then
    raise exception 'The order details of a payment attempt cannot be changed' using errcode = '42501';
  end if;

  if old."Provider-ref" is not null and new."Provider-ref" is distinct from old."Provider-ref" then
    raise exception 'The provider reference of a payment attempt cannot be changed' using errcode = '42501';
  end if;

  if old."Status" in ('Succeeded', 'Needs-review')
    and (to_jsonb(new) - 'Updated-at') is distinct from (to_jsonb(old) - 'Updated-at') then
    raise exception 'A settled payment attempt cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger qareeb_guard_payment_attempt
  before update or delete on public."Payment-attempts"
  for each row execute function public.qareeb_guard_payment_attempt();

create trigger qareeb_block_payment_attempt_truncate
  before truncate on public."Payment-attempts"
  for each statement execute function public.qareeb_guard_payment_attempt();

-- ---------------------------------------------------------------------------
-- 3. Creation dates are set by the database for API callers
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_guard_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text := tg_argv[0];
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, jsonb_build_object(col, now()));
  else
    new := jsonb_populate_record(new, jsonb_build_object(col, to_jsonb(old) -> col));
  end if;
  return new;
end;
$$;

create trigger qareeb_guard_created_at
  before insert or update on public."Profiles"
  for each row execute function public.qareeb_guard_created_at('Created at');
create trigger qareeb_guard_created_at
  before insert or update on public."Helpers"
  for each row execute function public.qareeb_guard_created_at('Created-at');

revoke all on function public.qareeb_guard_payment() from public, anon, authenticated;
revoke all on function public.qareeb_guard_payment_attempt() from public, anon, authenticated;
revoke all on function public.qareeb_guard_created_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Table privileges
-- ---------------------------------------------------------------------------
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

revoke insert, update, delete on
  public."Wallets", public."Transactions", public."Payments", public."Payment-attempts",
  public."Admin-logs", public."Notifications"
from anon, authenticated;
-- Messages are sent by clients but never edited or deleted
revoke update, delete on public."Messages" from anon, authenticated;
