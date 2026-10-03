-- Qareeb: wallet ledger. "Transactions" becomes an append-only ledger and
-- Wallets."Balance" always equals the sum of the wallet's completed ledger entries.
--
-- Before this migration:
-- - Transactions."Type" and "Status" were free text, "Amount" was unchecked, and nothing
--   tied a transaction's "Wallet-id" to its "User-id" or prevented duplicate entries.
-- - Server-side writers (service role, SQL) could set Wallets."Balance" without a ledger
--   entry, and could edit or delete completed transactions.
-- - Wallets."Updated-id" was a timestamp with a misspelt name (not used by the app).
--
-- Now, enforced by the database for every role (including service_role):
-- - Entry types and signs:  Earning (+)   job paid online, credited to the helper
--                           Commission (-) platform fee        (rule not decided yet)
--                           Payout (-)     withdrawal          (payout provider pending)
--                           Refund (-)     online payment refunded after it was credited
--                           Adjustment (+/-) server-side correction
-- - Status: Pending -> Completed | Failed, once. Only Completed entries move the balance.
--   Completed and Failed entries are immutable; no entry can be deleted or truncated.
-- - Every entry has a unique "Idempotency-key", so a retried operation cannot post twice.
-- - Posting locks the wallet row, refuses to overdraw it, and records "Balance-after".
-- - A balance change that does not match the ledger is rejected.
-- - Post one entry per statement: entries for the same wallet in one multi-row INSERT
--   are rejected (the balance check runs per row).
--
-- Clients still cannot write wallets or transactions (no insert/update/delete policies).
-- Cash payments do not touch wallets: cash goes from the customer straight to the helper.
-- Transactions was empty and wallets all had a zero balance when this was written.

-- ---------------------------------------------------------------------------
-- 1. Wallets
-- ---------------------------------------------------------------------------
alter table public."Wallets" rename column "Updated-id" to "Updated-at";

update public."Wallets" set "Created-at" = now() where "Created-at" is null;
update public."Wallets" set "Updated-at" = now() where "Updated-at" is null;

alter table public."Wallets"
  alter column "Created-at" set not null,
  alter column "Updated-at" set not null,
  add constraint "Wallets_ID_User-id_key" unique ("ID", "User-id");

-- ---------------------------------------------------------------------------
-- 2. Transactions
-- ---------------------------------------------------------------------------
alter table public."Transactions"
  add column "Payment-id" uuid references public."Payments" ("ID"),
  add column "Idempotency-key" text not null,
  add column "Description" text,
  add column "Balance-after" numeric,
  add column "Completed-at" timestamptz,
  add column "Created-by" uuid;

alter table public."Transactions"
  alter column "Type" set not null,
  alter column "Created-at" set not null,
  drop constraint "Transactions_Wallet-id_fkey",
  drop constraint "Transactions_Booking-id_fkey",
  add constraint "Transactions_Wallet_owner_fkey" foreign key ("Wallet-id", "User-id")
    references public."Wallets" ("ID", "User-id"),
  add constraint "Transactions_Booking-id_fkey" foreign key ("Booking-id")
    references public."Bookings" ("ID"),
  add constraint "Transactions_Idempotency-key_key" unique ("Idempotency-key"),
  add constraint "Transactions_Idempotency-key_check"
    check (char_length("Idempotency-key") between 1 and 200),
  add constraint "Transactions_Status_check" check ("Status" in ('Pending', 'Completed', 'Failed')),
  add constraint "Transactions_Type_Amount_check" check (
    ("Type" = 'Earning' and "Amount" > 0)
    or ("Type" in ('Commission', 'Payout', 'Refund') and "Amount" < 0)
    or ("Type" = 'Adjustment' and "Amount" <> 0)
  ),
  add constraint "Transactions_Description_check"
    check ("Description" is null or char_length("Description") <= 300),
  add constraint "Transactions_completion_check" check (
    ("Status" = 'Completed') = ("Completed-at" is not null and "Balance-after" is not null)
  );

create index "Transactions_Payment-id_idx" on public."Transactions" ("Payment-id");
create index "Transactions_Wallet_completed_idx" on public."Transactions" ("Wallet-id")
  where "Status" = 'Completed';

-- ---------------------------------------------------------------------------
-- 3. Ledger guards
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_guard_transaction()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  bal numeric;
  fixed constant text[] := array['Status', 'Balance-after', 'Completed-at'];
begin
  -- No client policies exist either; this gives client writes a clear reason
  if current_user in ('anon', 'authenticated') then
    raise exception 'Wallet transactions can only be recorded by the server' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new."Status" not in ('Pending', 'Completed') then
      raise exception 'A new wallet transaction must be Pending or Completed' using errcode = '23514';
    end if;
    if new."Wallet-id" is null then
      select w."ID" into new."Wallet-id" from public."Wallets" w where w."User-id" = new."User-id";
    end if;
    new."Created-at" := now();
    new."Created-by" := auth.uid();
    new."Balance-after" := null;
    new."Completed-at" := null;
  else
    if old."Status" <> 'Pending' then
      raise exception 'Completed or failed wallet transactions cannot be changed' using errcode = '42501';
    end if;
    if new."Status" not in ('Completed', 'Failed')
      or (to_jsonb(new) - fixed) is distinct from (to_jsonb(old) - fixed) then
      raise exception 'A pending wallet transaction can only be completed or failed' using errcode = '42501';
    end if;
    new."Balance-after" := null;
    new."Completed-at" := null;
  end if;

  if new."Status" = 'Completed' then
    -- Serialises postings per wallet
    select w."Balance" into bal from public."Wallets" w
    where w."ID" = new."Wallet-id" and w."User-id" = new."User-id"
    for update;
    if not found then
      raise exception 'Wallet not found for this user' using errcode = '23503';
    end if;
    if bal + new."Amount" < 0 then
      raise exception 'Insufficient wallet balance' using errcode = '23514';
    end if;
    new."Balance-after" := bal + new."Amount";
    new."Completed-at" := now();
  end if;

  return new;
end;
$$;

create trigger qareeb_guard_transaction
  before insert or update on public."Transactions"
  for each row execute function public.qareeb_guard_transaction();

-- Moves the balance once an entry is completed (after the row exists, so the wallet
-- guard below can check the new balance against the ledger)
create or replace function public.qareeb_apply_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new."Status" = 'Completed' and (tg_op = 'INSERT' or old."Status" <> 'Completed') then
    update public."Wallets"
    set "Balance" = new."Balance-after", "Updated-at" = now()
    where "ID" = new."Wallet-id";
  end if;
  return null;
end;
$$;

create trigger qareeb_apply_transaction
  after insert or update on public."Transactions"
  for each row execute function public.qareeb_apply_transaction();

create or replace function public.qareeb_block_ledger_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Wallet transactions cannot be deleted' using errcode = '42501';
end;
$$;

create trigger qareeb_block_ledger_delete
  before delete on public."Transactions"
  for each row execute function public.qareeb_block_ledger_delete();

create trigger qareeb_block_ledger_truncate
  before truncate on public."Transactions"
  for each statement execute function public.qareeb_block_ledger_delete();

create or replace function public.qareeb_guard_wallet()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Money only arrives through ledger entries
    new."Balance" := 0;
    new."Created-at" := now();
    new."Updated-at" := now();
    return new;
  end if;

  if new."ID" is distinct from old."ID"
    or new."User-id" is distinct from old."User-id"
    or new."Currency" is distinct from old."Currency"
    or new."Created-at" is distinct from old."Created-at" then
    raise exception 'Wallet owner, currency and creation time cannot be changed' using errcode = '42501';
  end if;

  if new."Balance" is distinct from old."Balance" and new."Balance" is distinct from (
      select coalesce(sum(t."Amount"), 0) from public."Transactions" t
      where t."Wallet-id" = old."ID" and t."Status" = 'Completed') then
    raise exception 'Wallet balance can only change through wallet transactions' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger qareeb_guard_wallet
  before insert or update on public."Wallets"
  for each row execute function public.qareeb_guard_wallet();

-- ---------------------------------------------------------------------------
-- 4. Online payments credit the helper's wallet (once per payment)
--    Commission is not deducted: the commission rule has not been decided. When it is,
--    a Commission entry is posted next to the Earning with its own idempotency key.
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_credit_online_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new."Status" = 'Paid' and old."Status" is distinct from 'Paid'
    and new."Method" in ('Easypaisa', 'JazzCash', 'Card') and new."Amount" > 0 then
    insert into public."Wallets" ("User-id") values (new."Payee-id")
    on conflict ("User-id") do nothing;

    insert into public."Transactions"
      ("User-id", "Type", "Amount", "Status", "Booking-id", "Payment-id", "Idempotency-key", "Description")
    values
      (new."Payee-id", 'Earning', new."Amount", 'Completed', new."Booking-id", new."ID",
       'payment:' || new."ID" || ':earning', 'Online payment for a completed job (' || new."Method" || ')')
    on conflict ("Idempotency-key") do nothing;
  end if;
  return null;
end;
$$;

create trigger qareeb_credit_online_payment
  after update on public."Payments"
  for each row execute function public.qareeb_credit_online_payment();

-- ---------------------------------------------------------------------------
-- 5. Admin oversight: wallets whose balance does not match their ledger (normally none)
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_admin_wallet_mismatches()
returns table (wallet_id uuid, user_id uuid, balance numeric, ledger_total numeric)
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
  select w."ID", w."User-id", w."Balance", coalesce(l.total, 0)
  from public."Wallets" w
  left join (
    select t."Wallet-id", sum(t."Amount") as total
    from public."Transactions" t where t."Status" = 'Completed'
    group by t."Wallet-id"
  ) l on l."Wallet-id" = w."ID"
  where w."Balance" is distinct from coalesce(l.total, 0);
end;
$$;

revoke all on function public.qareeb_guard_transaction() from public, anon, authenticated;
revoke all on function public.qareeb_apply_transaction() from public, anon, authenticated;
revoke all on function public.qareeb_block_ledger_delete() from public, anon, authenticated;
revoke all on function public.qareeb_guard_wallet() from public, anon, authenticated;
revoke all on function public.qareeb_credit_online_payment() from public, anon, authenticated;
revoke all on function public.qareeb_admin_wallet_mismatches() from public, anon;
grant execute on function public.qareeb_admin_wallet_mismatches() to authenticated, service_role;
