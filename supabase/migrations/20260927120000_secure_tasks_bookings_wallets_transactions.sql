-- Qareeb: secure relationships and RLS for Tasks, Bookings, Wallets, Transactions.
--
-- Fixes:
-- - Every existing policy on these tables compared auth.uid() to the row's own "ID"
--   (primary key) instead of "User-id", so they could not work as intended.
-- - Transactions INSERT was open to role {public}; Wallets INSERT let users choose
--   their own "Balance". Users can no longer create transactions or wallets.
-- - No foreign keys existed; Transactions FK columns defaulted to random UUIDs.
-- - Helpers could not see bookings assigned to them; admins had no access.
--
-- Booking lifecycle (matches the app's tracking screens):
--   Pending -> Accepted | Rejected                          (helper)
--   Accepted -> On-the-way -> Arrived -> In-progress -> Completed (helper)
--   Pending | Accepted -> Cancelled                         (customer)
-- Task status follows its booking: Open -> Assigned -> Completed; back to Open when
-- a booking is rejected or cancelled. Customers can cancel an Open task.
--
-- Tables were empty when written; no rows are deleted. RLS stays enabled.

-- ---------------------------------------------------------------------------
-- 1. Role helpers (SECURITY DEFINER: read Profiles/Helpers without RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public."Profiles"
    where "ID" = auth.uid() and "Role" in ('admin', 'superadmin')
  );
$$;

create or replace function public.qareeb_helper_is_bookable(helper_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public."Helpers"
    where "ID" = helper_id and "Verify-status" = 'Approved'
  );
$$;

-- Cross-table checks used by Tasks/Bookings policies. Evaluating them through RLS
-- would make the Tasks and Bookings policies reference each other (infinite recursion).
create or replace function public.qareeb_is_task_helper(task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public."Bookings"
    where "Task-id" = task_id and "Helper-id" = auth.uid()
  );
$$;

create or replace function public.qareeb_owns_open_task(task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public."Tasks"
    where "ID" = task_id and "User-id" = auth.uid() and "Status" = 'Open'
  );
$$;

revoke all on function public.qareeb_is_admin() from public, anon;
revoke all on function public.qareeb_helper_is_bookable(uuid) from public, anon;
revoke all on function public.qareeb_is_task_helper(uuid) from public, anon;
revoke all on function public.qareeb_owns_open_task(uuid) from public, anon;
grant execute on function public.qareeb_is_admin() to authenticated, service_role;
grant execute on function public.qareeb_helper_is_bookable(uuid) to authenticated, service_role;
grant execute on function public.qareeb_is_task_helper(uuid) to authenticated, service_role;
grant execute on function public.qareeb_owns_open_task(uuid) to authenticated, service_role;

-- Admins (Profiles."Role" admin/superadmin) may manage roles and helper review
-- fields through the API; everyone else keeps the existing restrictions.
create or replace function public.qareeb_guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if public.qareeb_is_admin() then
    -- Admins manage user/helper/admin roles; only a superadmin grants or removes superadmin
    if (coalesce(new."Role", '') = 'superadmin'
        or (tg_op = 'UPDATE' and coalesce(old."Role", '') = 'superadmin'))
      and (tg_op = 'INSERT' or new."Role" is distinct from old."Role")
      and not exists (
        select 1 from public."Profiles" where "ID" = auth.uid() and "Role" = 'superadmin'
      ) then
      raise exception 'Only a superadmin can grant or remove the superadmin role'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new."Role", 'user') not in ('user', 'helper') then
      raise exception 'Role "%" can only be assigned by an administrator', new."Role"
        using errcode = '42501';
    end if;
  elsif new."Role" is distinct from old."Role"
    and (coalesce(new."Role", 'user') not in ('user', 'helper')
         or coalesce(old."Role", 'user') not in ('user', 'helper')) then
    raise exception 'Role "%" can only be changed by an administrator', coalesce(old."Role", 'user')
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.qareeb_guard_helper_review_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.qareeb_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new."Verify-status" := 'Pending';
    new."Rating" := 0;
  else
    new."Verify-status" := old."Verify-status";
    new."Rating" := old."Rating";
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Relationships, defaults and constraints
-- ---------------------------------------------------------------------------
alter table public."Profiles"
  add constraint "Profiles_ID_fkey" foreign key ("ID") references auth.users (id) on delete cascade;

alter table public."Helpers"
  add constraint "Helpers_ID_fkey" foreign key ("ID") references public."Profiles" ("ID") on delete cascade,
  add constraint "Helpers_User-id_matches_ID" check ("User-id" = "ID");

-- Tasks
alter table public."Tasks"
  alter column "User-id" set default auth.uid(),
  alter column "User-id" set not null,
  alter column "Status" set default 'Open',
  alter column "Status" set not null,
  alter column "Created-at" set not null,
  add constraint "Tasks_User-id_fkey" foreign key ("User-id") references public."Profiles" ("ID") on delete cascade,
  add constraint "Tasks_Helper-id_fkey" foreign key ("Helper-id") references public."Helpers" ("ID") on delete set null,
  add constraint "Tasks_Status_check" check ("Status" in ('Open', 'Assigned', 'Completed', 'Cancelled')),
  add constraint "Tasks_Price_check" check ("Price" is null or "Price" >= 0);

-- Bookings
alter table public."Bookings"
  alter column "User-id" set default auth.uid(),
  alter column "User-id" set not null,
  alter column "Task-id" set not null,
  alter column "Helper-id" set not null,
  alter column "Status" set not null,
  alter column "Created-at" set not null,
  add constraint "Bookings_Task-id_fkey" foreign key ("Task-id") references public."Tasks" ("ID") on delete cascade,
  add constraint "Bookings_User-id_fkey" foreign key ("User-id") references public."Profiles" ("ID") on delete cascade,
  add constraint "Bookings_Helper-id_fkey" foreign key ("Helper-id") references public."Helpers" ("ID"),
  add constraint "Bookings_not_self" check ("Helper-id" <> "User-id"),
  add constraint "Bookings_Status_check" check ("Status" in
    ('Pending', 'Accepted', 'Rejected', 'On-the-way', 'Arrived', 'In-progress', 'Completed', 'Cancelled'));

-- At most one active booking per task
create unique index "Bookings_one_active_per_task"
  on public."Bookings" ("Task-id")
  where "Status" in ('Pending', 'Accepted', 'On-the-way', 'Arrived', 'In-progress');

-- Wallets: one per user, created by the system
alter table public."Wallets"
  alter column "User-id" set not null,
  alter column "Balance" set not null,
  alter column "Currency" set not null,
  add constraint "Wallets_User-id_key" unique ("User-id"),
  add constraint "Wallets_User-id_fkey" foreign key ("User-id") references public."Profiles" ("ID") on delete cascade,
  add constraint "Wallets_Balance_check" check ("Balance" >= 0);

-- Transactions: financial records, never cascaded away
alter table public."Transactions"
  alter column "Wallet-id" drop default,
  alter column "User-id" drop default,
  alter column "Booking-id" drop default,
  alter column "User-id" set not null,
  alter column "Amount" set not null,
  alter column "Status" set not null,
  add constraint "Transactions_Wallet-id_fkey" foreign key ("Wallet-id") references public."Wallets" ("ID"),
  add constraint "Transactions_User-id_fkey" foreign key ("User-id") references public."Profiles" ("ID"),
  add constraint "Transactions_Booking-id_fkey" foreign key ("Booking-id") references public."Bookings" ("ID") on delete set null;

-- Indexes for foreign keys / RLS lookups
create index "Tasks_User-id_idx" on public."Tasks" ("User-id");
create index "Tasks_Helper-id_idx" on public."Tasks" ("Helper-id");
create index "Bookings_User-id_idx" on public."Bookings" ("User-id");
create index "Bookings_Helper-id_idx" on public."Bookings" ("Helper-id");
create index "Bookings_Task-id_idx" on public."Bookings" ("Task-id");
create index "Transactions_User-id_idx" on public."Transactions" ("User-id");
create index "Transactions_Wallet-id_idx" on public."Transactions" ("Wallet-id");
create index "Transactions_Booking-id_idx" on public."Transactions" ("Booking-id");

-- ---------------------------------------------------------------------------
-- 3. Wallet provisioning: every profile gets a zero-balance wallet
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_create_wallet_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public."Wallets" ("User-id") values (new."ID")
  on conflict ("User-id") do nothing;
  return new;
end;
$$;

revoke all on function public.qareeb_create_wallet_for_profile() from public, anon, authenticated;

create trigger qareeb_create_wallet_for_profile
  after insert on public."Profiles"
  for each row execute function public.qareeb_create_wallet_for_profile();

insert into public."Wallets" ("User-id")
select p."ID" from public."Profiles" p
on conflict ("User-id") do nothing;

-- ---------------------------------------------------------------------------
-- 4. Field guards for API callers (admins and server roles are not restricted)
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_guard_task()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.qareeb_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new."Status" := 'Open';
    new."Helper-id" := null;
    new."Created-at" := now();
    return new;
  end if;

  if new."ID" is distinct from old."ID"
    or new."User-id" is distinct from old."User-id"
    or new."Helper-id" is distinct from old."Helper-id"
    or new."Created-at" is distinct from old."Created-at" then
    raise exception 'Task owner, helper and creation time cannot be changed' using errcode = '42501';
  end if;

  if old."Status" <> 'Open' then
    raise exception 'Only open tasks can be edited (task is %)', old."Status" using errcode = '42501';
  end if;

  if new."Status" is distinct from old."Status" and new."Status" <> 'Cancelled' then
    raise exception 'Task status "%" is set by its booking', new."Status" using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger qareeb_guard_task
  before insert or update on public."Tasks"
  for each row execute function public.qareeb_guard_task();

create or replace function public.qareeb_guard_booking()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if current_user not in ('anon', 'authenticated') or public.qareeb_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new."Status" := 'Pending';
    new."Created-at" := now();
    return new;
  end if;

  if new."ID" is distinct from old."ID"
    or new."Task-id" is distinct from old."Task-id"
    or new."User-id" is distinct from old."User-id"
    or new."Helper-id" is distinct from old."Helper-id"
    or new."Created-at" is distinct from old."Created-at" then
    raise exception 'Booking task, customer, helper and creation time cannot be changed'
      using errcode = '42501';
  end if;

  if new."Scheduled-at" is distinct from old."Scheduled-at"
    and not (uid = old."User-id" and old."Status" = 'Pending' and new."Status" = old."Status") then
    raise exception 'Schedule can only be changed by the customer while the booking is pending'
      using errcode = '42501';
  end if;

  if new."Status" is not distinct from old."Status" then
    return new;
  end if;

  if uid = old."Helper-id" and (old."Status", new."Status") in (
      ('Pending', 'Accepted'), ('Pending', 'Rejected'),
      ('Accepted', 'On-the-way'), ('On-the-way', 'Arrived'),
      ('Arrived', 'In-progress'), ('In-progress', 'Completed')) then
    return new;
  end if;

  if uid = old."User-id" and new."Status" = 'Cancelled' and old."Status" in ('Pending', 'Accepted') then
    return new;
  end if;

  raise exception 'Booking status cannot change from "%" to "%"', old."Status", new."Status"
    using errcode = '42501';
end;
$$;

create trigger qareeb_guard_booking
  before insert or update on public."Bookings"
  for each row execute function public.qareeb_guard_booking();

-- Keep the task in step with its booking (runs as owner, bypassing the task guard)
create or replace function public.qareeb_sync_task_from_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new."Status" is not distinct from old."Status" then
    return new;
  end if;

  if new."Status" = 'Accepted' then
    update public."Tasks" set "Status" = 'Assigned', "Helper-id" = new."Helper-id"
    where "ID" = new."Task-id" and "Status" = 'Open';
  elsif new."Status" = 'Completed' then
    update public."Tasks" set "Status" = 'Completed'
    where "ID" = new."Task-id";
  elsif new."Status" in ('Rejected', 'Cancelled') then
    update public."Tasks" set "Status" = 'Open', "Helper-id" = null
    where "ID" = new."Task-id" and "Status" = 'Assigned' and "Helper-id" = new."Helper-id";
  end if;

  return new;
end;
$$;

revoke all on function public.qareeb_sync_task_from_booking() from public, anon, authenticated;

create trigger qareeb_sync_task_from_booking
  after update on public."Bookings"
  for each row execute function public.qareeb_sync_task_from_booking();

-- ---------------------------------------------------------------------------
-- 5. RLS policies (replacing the ones that compared auth.uid() to "ID")
-- ---------------------------------------------------------------------------
drop policy "Users can create own tasks" on public."Tasks";
drop policy "Users can view own tasks" on public."Tasks";
drop policy "Users can update own tasks" on public."Tasks";
drop policy "Users can create own bookings" on public."Bookings";
drop policy "Users can view own bookings" on public."Bookings";
drop policy "Users can update own bookings" on public."Bookings";
drop policy "Users can create own wallet" on public."Wallets";
drop policy "Users can view own wallet" on public."Wallets";
drop policy "Users can create their own transactions" on public."Transactions";
drop policy "Users can view their own transactions" on public."Transactions";

-- Tasks
create policy "Tasks: read own, booked, or admin" on public."Tasks"
  for select to authenticated
  using (
    "User-id" = (select auth.uid())
    or "Helper-id" = (select auth.uid())
    or public.qareeb_is_task_helper("ID")
    or (select public.qareeb_is_admin())
  );

create policy "Tasks: customers create their own" on public."Tasks"
  for insert to authenticated
  with check ("User-id" = (select auth.uid()));

create policy "Tasks: owner or admin updates" on public."Tasks"
  for update to authenticated
  using ("User-id" = (select auth.uid()) or (select public.qareeb_is_admin()))
  with check ("User-id" = (select auth.uid()) or (select public.qareeb_is_admin()));

create policy "Tasks: admin deletes" on public."Tasks"
  for delete to authenticated
  using ((select public.qareeb_is_admin()));

-- Bookings
create policy "Bookings: read as customer, helper, or admin" on public."Bookings"
  for select to authenticated
  using (
    "User-id" = (select auth.uid())
    or "Helper-id" = (select auth.uid())
    or (select public.qareeb_is_admin())
  );

create policy "Bookings: CNIC-verified customers book approved helpers for their open tasks"
  on public."Bookings"
  for insert to authenticated
  with check (
    "User-id" = (select auth.uid())
    and "Helper-id" <> (select auth.uid())
    and ((select auth.jwt()) -> 'app_metadata' ->> 'cnic_status') = 'approved'
    and public.qareeb_helper_is_bookable("Helper-id")
    and public.qareeb_owns_open_task("Task-id")
  );

create policy "Bookings: customer, helper, or admin updates" on public."Bookings"
  for update to authenticated
  using (
    "User-id" = (select auth.uid())
    or "Helper-id" = (select auth.uid())
    or (select public.qareeb_is_admin())
  )
  with check (
    "User-id" = (select auth.uid())
    or "Helper-id" = (select auth.uid())
    or (select public.qareeb_is_admin())
  );

create policy "Bookings: admin deletes" on public."Bookings"
  for delete to authenticated
  using ((select public.qareeb_is_admin()));

-- Wallets: read own; balances change only via admin/server
create policy "Wallets: read own or admin" on public."Wallets"
  for select to authenticated
  using ("User-id" = (select auth.uid()) or (select public.qareeb_is_admin()));

create policy "Wallets: admin creates" on public."Wallets"
  for insert to authenticated
  with check ((select public.qareeb_is_admin()));

create policy "Wallets: admin updates" on public."Wallets"
  for update to authenticated
  using ((select public.qareeb_is_admin()))
  with check ((select public.qareeb_is_admin()));

-- Transactions: read own; written only by admin/server
create policy "Transactions: read own or admin" on public."Transactions"
  for select to authenticated
  using ("User-id" = (select auth.uid()) or (select public.qareeb_is_admin()));

create policy "Transactions: admin creates" on public."Transactions"
  for insert to authenticated
  with check ((select public.qareeb_is_admin()));

create policy "Transactions: admin updates" on public."Transactions"
  for update to authenticated
  using ((select public.qareeb_is_admin()))
  with check ((select public.qareeb_is_admin()));

-- Admin read/manage for users and helpers (own-row policies stay as they are)
create policy "Profiles: admin reads all" on public."Profiles"
  for select to authenticated
  using ((select public.qareeb_is_admin()));

create policy "Profiles: admin updates all" on public."Profiles"
  for update to authenticated
  using ((select public.qareeb_is_admin()))
  with check ((select public.qareeb_is_admin()));

create policy "Helpers: admin reads all" on public."Helpers"
  for select to authenticated
  using ((select public.qareeb_is_admin()));

create policy "Helpers: admin updates all" on public."Helpers"
  for update to authenticated
  using ((select public.qareeb_is_admin()))
  with check ((select public.qareeb_is_admin()));
