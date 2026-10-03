-- Qareeb: close gaps in the booking state machine (found in the end-to-end test).
--
-- Before this migration, through the API:
-- A. A customer could cancel an Open task while its booking was Pending, and the
--    helper could still accept it (task Cancelled, booking Accepted).
-- B. A helper could accept several jobs at once (double booking).
-- C. A helper whose verification was rejected/revoked could still accept and start jobs.
-- D. A customer could change the price of a task while a helper was deciding on it.
-- E. A customer could book a helper for a service the helper does not offer.
-- F. A female-only task could be booked with a helper who is not marked female.
--
-- Statuses are unchanged. RLS stays enabled; admins and server roles keep full control.

-- ---------------------------------------------------------------------------
-- 1. Lookups used by the guards (SECURITY DEFINER: callers cannot read the other
--    party's Helpers row, and Tasks/Bookings policies must not recurse)
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_task_has_active_booking(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public."Bookings"
    where "Task-id" = p_task_id
      and "Status" in ('Pending', 'Accepted', 'On-the-way', 'Arrived', 'In-progress')
  );
$$;

create or replace function public.qareeb_task_is_open(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public."Tasks" where "ID" = p_task_id and "Status" = 'Open');
$$;

-- Null when the booking is allowed, otherwise the reason it is not. Only answers for the
-- caller's own task, so it cannot be used to probe other helpers' details.
create or replace function public.qareeb_booking_mismatch(p_task_id uuid, p_helper_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when t."ID" is null or h."ID" is null or t."User-id" is distinct from auth.uid()
      then 'Task or helper not found'
    when t."Category" is not null and not (t."Category" = any (h."Categories"))
      then 'This helper does not offer this service'
    when t."Female-only" and not h."Is-female"
      then 'This task is for female helpers only'
  end
  from (select 1) one
  left join public."Tasks" t on t."ID" = p_task_id
  left join public."Helpers" h on h."ID" = p_helper_id;
$$;

revoke all on function public.qareeb_task_has_active_booking(uuid) from public, anon;
revoke all on function public.qareeb_task_is_open(uuid) from public, anon;
revoke all on function public.qareeb_booking_mismatch(uuid, uuid) from public, anon;
grant execute on function public.qareeb_task_has_active_booking(uuid) to authenticated, service_role;
grant execute on function public.qareeb_task_is_open(uuid) to authenticated, service_role;
grant execute on function public.qareeb_booking_mismatch(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. B: a helper holds at most one accepted/ongoing job. Enforced by a unique index,
--    so two simultaneous accepts cannot both succeed.
-- ---------------------------------------------------------------------------
create unique index "Bookings_one_active_job_per_helper"
  on public."Bookings" ("Helper-id")
  where "Status" in ('Accepted', 'On-the-way', 'Arrived', 'In-progress');

-- ---------------------------------------------------------------------------
-- 3. Booking guard (A, C, E, F). Same transitions as before:
--    Pending -> Accepted | Rejected                                 (helper)
--    Accepted -> On-the-way -> Arrived -> In-progress -> Completed  (helper)
--    Pending | Accepted -> Cancelled                                (customer)
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_guard_booking()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  mismatch text;
begin
  if current_user not in ('anon', 'authenticated') or public.qareeb_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    mismatch := public.qareeb_booking_mismatch(new."Task-id", new."Helper-id");
    if mismatch is not null then
      raise exception '%', mismatch using errcode = '42501';
    end if;
    new."Status" := 'Pending';
    new."Created-at" := now();
    new."Completed-at" := null;
    return new;
  end if;

  if new."ID" is distinct from old."ID"
    or new."Task-id" is distinct from old."Task-id"
    or new."User-id" is distinct from old."User-id"
    or new."Helper-id" is distinct from old."Helper-id"
    or new."Created-at" is distinct from old."Created-at"
    or new."Completed-at" is distinct from old."Completed-at" then
    raise exception 'Booking task, customer, helper and timestamps cannot be changed'
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

    -- Accepting or starting a job needs a currently approved helper; a job already
    -- under way at the customer's address can still be finished.
    if new."Status" in ('Accepted', 'On-the-way') and not public.qareeb_helper_is_bookable(uid) then
      raise exception 'Your helper verification is not approved, so you cannot take this job'
        using errcode = '42501';
    end if;

    if new."Status" = 'Accepted' and not public.qareeb_task_is_open(old."Task-id") then
      raise exception 'This task is no longer open' using errcode = '42501';
    end if;

    return new;
  end if;

  if uid = old."User-id" and new."Status" = 'Cancelled' and old."Status" in ('Pending', 'Accepted') then
    return new;
  end if;

  raise exception 'Booking status cannot change from "%" to "%"', old."Status", new."Status"
    using errcode = '42501';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Task guard (A, D): a task with a pending/ongoing booking is locked for the
--    customer; they cancel the booking first.
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

  if public.qareeb_task_has_active_booking(old."ID") then
    raise exception 'This task has an active booking. Cancel the booking before changing the task.'
      using errcode = '42501';
  end if;

  if new."Status" is distinct from old."Status" and new."Status" <> 'Cancelled' then
    raise exception 'Task status "%" is set by its booking', new."Status" using errcode = '42501';
  end if;

  return new;
end;
$$;
