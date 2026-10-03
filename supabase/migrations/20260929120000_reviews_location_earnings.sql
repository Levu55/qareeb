-- Qareeb: reviews, task/helper location for distance & ETA, and helper earnings.
--
-- Reviews:  one review per participant per COMPLETED booking. The reviewee is derived
--           from the booking (customer <-> helper), never chosen by the client.
--           Helpers."Rating" is recalculated from reviews written by customers.
-- Location: task coordinates (geocoded service address) and the helper's last known
--           position. Customers never receive helper coordinates, only a distance.
-- Earnings: Bookings."Completed-at" is stamped by the database when a booking completes.
--           Earnings = value of completed jobs; no payment/transaction data is involved.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
alter table public."Tasks"
  add column "Latitude" double precision,
  add column "Longitude" double precision,
  add constraint "Tasks_coordinates_check" check (
    ("Latitude" is null and "Longitude" is null)
    or ("Latitude" between -90 and 90 and "Longitude" between -180 and 180)
  );

alter table public."Helpers"
  add column "Latitude" double precision,
  add column "Longitude" double precision,
  add column "Location-updated-at" timestamptz,
  add constraint "Helpers_coordinates_check" check (
    ("Latitude" is null and "Longitude" is null)
    or ("Latitude" between -90 and 90 and "Longitude" between -180 and 180)
  );

alter table public."Bookings"
  add column "Completed-at" timestamptz;

create index "Bookings_Helper_completed_idx" on public."Bookings" ("Helper-id", "Completed-at")
  where "Status" = 'Completed';

-- ---------------------------------------------------------------------------
-- 2. Booking completion timestamp (set by the database, not the client)
-- ---------------------------------------------------------------------------
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
    return new;
  end if;

  if uid = old."User-id" and new."Status" = 'Cancelled' and old."Status" in ('Pending', 'Accepted') then
    return new;
  end if;

  raise exception 'Booking status cannot change from "%" to "%"', old."Status", new."Status"
    using errcode = '42501';
end;
$$;

-- Runs after the guard (trigger names fire alphabetically)
create or replace function public.qareeb_stamp_booking_completion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new."Status" = 'Completed' and old."Status" is distinct from 'Completed' then
    new."Completed-at" := now();
  end if;
  return new;
end;
$$;

create trigger qareeb_stamp_booking_completion
  before update on public."Bookings"
  for each row execute function public.qareeb_stamp_booking_completion();

-- ---------------------------------------------------------------------------
-- 3. Reviews
-- ---------------------------------------------------------------------------
create table public."Reviews" (
  "ID" uuid primary key default gen_random_uuid(),
  "Booking-id" uuid not null references public."Bookings" ("ID") on delete cascade,
  "Reviewer-id" uuid not null default auth.uid() references public."Profiles" ("ID") on delete cascade,
  "Reviewee-id" uuid not null references public."Profiles" ("ID") on delete cascade,
  "Rating" smallint not null check ("Rating" between 1 and 5),
  "Comment" text check ("Comment" is null or char_length("Comment") <= 1000),
  "Created-at" timestamptz not null default now(),
  "Updated-at" timestamptz not null default now(),
  constraint "Reviews_one_per_booking_reviewer" unique ("Booking-id", "Reviewer-id"),
  constraint "Reviews_not_self" check ("Reviewer-id" <> "Reviewee-id")
);

alter table public."Reviews" enable row level security;

create index "Reviews_Reviewee-id_idx" on public."Reviews" ("Reviewee-id");
create index "Reviews_Reviewer-id_idx" on public."Reviews" ("Reviewer-id");

create or replace function public.qareeb_guard_review()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  b record;
begin
  if current_user not in ('anon', 'authenticated') or public.qareeb_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select "User-id", "Helper-id", "Status" into b
    from public."Bookings" where "ID" = new."Booking-id";

    if not found or uid is null or (uid <> b."User-id" and uid <> b."Helper-id") then
      raise exception 'You can only review bookings you took part in' using errcode = '42501';
    end if;
    if b."Status" <> 'Completed' then
      raise exception 'Reviews can only be left for completed bookings' using errcode = '42501';
    end if;

    new."Reviewer-id" := uid;
    new."Reviewee-id" := case when uid = b."User-id" then b."Helper-id" else b."User-id" end;
    new."Created-at" := now();
    new."Updated-at" := now();
    return new;
  end if;

  if new."ID" is distinct from old."ID"
    or new."Booking-id" is distinct from old."Booking-id"
    or new."Reviewer-id" is distinct from old."Reviewer-id"
    or new."Reviewee-id" is distinct from old."Reviewee-id"
    or new."Created-at" is distinct from old."Created-at" then
    raise exception 'Only the rating and comment of a review can be changed' using errcode = '42501';
  end if;
  new."Updated-at" := now();
  return new;
end;
$$;

create trigger qareeb_guard_review
  before insert or update on public."Reviews"
  for each row execute function public.qareeb_guard_review();

-- Keep Helpers."Rating" equal to the average rating customers gave that helper
create or replace function public.qareeb_refresh_helper_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid := coalesce(new."Reviewee-id", old."Reviewee-id");
begin
  update public."Helpers" h
  set "Rating" = coalesce((
    select round(avg(r."Rating")::numeric, 2)
    from public."Reviews" r
    join public."Bookings" b on b."ID" = r."Booking-id"
    where r."Reviewee-id" = h."ID" and b."Helper-id" = h."ID"
  ), 0)
  where h."ID" = affected;
  return null;
end;
$$;

revoke all on function public.qareeb_refresh_helper_rating() from public, anon, authenticated;

create trigger qareeb_refresh_helper_rating
  after insert or update or delete on public."Reviews"
  for each row execute function public.qareeb_refresh_helper_rating();

create policy "Reviews: read as reviewer, reviewee, or admin" on public."Reviews"
  for select to authenticated
  using (
    "Reviewer-id" = (select auth.uid())
    or "Reviewee-id" = (select auth.uid())
    or (select public.qareeb_is_admin())
  );

create policy "Reviews: participants review completed bookings" on public."Reviews"
  for insert to authenticated
  with check ("Reviewer-id" = (select auth.uid()));

create policy "Reviews: reviewer or admin edits" on public."Reviews"
  for update to authenticated
  using ("Reviewer-id" = (select auth.uid()) or (select public.qareeb_is_admin()))
  with check ("Reviewer-id" = (select auth.uid()) or (select public.qareeb_is_admin()));

create policy "Reviews: admin deletes" on public."Reviews"
  for delete to authenticated
  using ((select public.qareeb_is_admin()));

-- ---------------------------------------------------------------------------
-- 4. Distance helper (straight-line / haversine, km)
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_distance_km(lat1 double precision, lng1 double precision,
                                                     lat2 double precision, lng2 double precision)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else round((2 * 6371 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    )))::numeric, 2)
  end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Read functions (replaced: new output columns)
-- ---------------------------------------------------------------------------
drop function public.qareeb_find_helpers(text, boolean);

-- Helper locations older than this are treated as unknown
create or replace function public.qareeb_find_helpers(
  p_category text default null,
  p_female_only boolean default false,
  p_lat double precision default null,
  p_lng double precision default null
)
returns table (
  helper_id uuid,
  full_name text,
  rating numeric,
  categories text[],
  is_female boolean,
  completed_jobs bigint,
  review_count bigint,
  distance_km numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select h."ID", p."Full-name", coalesce(h."Rating", 0), h."Categories", h."Is-female",
         (select count(*) from public."Bookings" b where b."Helper-id" = h."ID" and b."Status" = 'Completed'),
         (select count(*) from public."Reviews" r join public."Bookings" b on b."ID" = r."Booking-id"
           where r."Reviewee-id" = h."ID" and b."Helper-id" = h."ID"),
         case when h."Location-updated-at" > now() - interval '24 hours'
              then public.qareeb_distance_km(p_lat, p_lng, h."Latitude", h."Longitude") end
  from public."Helpers" h
  join public."Profiles" p on p."ID" = h."ID"
  where h."Verify-status" = 'Approved'
    and h."Is-available" is true
    and h."ID" <> auth.uid()
    and (p_category is null or p_category = any (h."Categories"))
    and (not coalesce(p_female_only, false) or h."Is-female")
  order by 8 asc nulls last, coalesce(h."Rating", 0) desc, p."Full-name";
$$;

drop function public.qareeb_my_bookings();

create or replace function public.qareeb_my_bookings()
returns table (
  booking_id uuid,
  task_id uuid,
  status text,
  scheduled_at timestamptz,
  created_at timestamptz,
  completed_at timestamptz,
  my_role text,
  counterpart_id uuid,
  counterpart_name text,
  title text,
  description text,
  category text,
  location text,
  price numeric,
  female_only boolean,
  task_latitude double precision,
  task_longitude double precision,
  helper_distance_km numeric,
  helper_location_updated_at timestamptz,
  my_review_rating smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select b."ID", b."Task-id", b."Status", b."Scheduled-at", b."Created-at", b."Completed-at",
         case when b."User-id" = auth.uid() then 'customer' else 'helper' end,
         case when b."User-id" = auth.uid() then b."Helper-id" else b."User-id" end,
         p."Full-name",
         t."Title", t."Description", t."Category", t."Location", t."Price", t."Female-only",
         t."Latitude", t."Longitude",
         case when h."Location-updated-at" > now() - interval '24 hours'
              then public.qareeb_distance_km(t."Latitude", t."Longitude", h."Latitude", h."Longitude") end,
         h."Location-updated-at",
         (select r."Rating" from public."Reviews" r where r."Booking-id" = b."ID" and r."Reviewer-id" = auth.uid())
  from public."Bookings" b
  join public."Tasks" t on t."ID" = b."Task-id"
  left join public."Helpers" h on h."ID" = b."Helper-id"
  left join public."Profiles" p
    on p."ID" = case when b."User-id" = auth.uid() then b."Helper-id" else b."User-id" end
  where auth.uid() is not null
    and (b."User-id" = auth.uid() or b."Helper-id" = auth.uid())
  order by b."Created-at" desc;
$$;

-- Helper's completed-job value per day (Asia/Karachi), most recent p_days days incl. today.
-- This is the value of completed bookings, not payouts: no payment data exists yet.
create or replace function public.qareeb_helper_earnings(p_days integer default 7)
returns table (day date, jobs bigint, amount numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select generate_series(
      (now() at time zone 'Asia/Karachi')::date - (least(greatest(coalesce(p_days, 7), 1), 90) - 1),
      (now() at time zone 'Asia/Karachi')::date,
      interval '1 day'
    )::date as day
  )
  select d.day,
         count(b."ID"),
         coalesce(sum(t."Price"), 0)
  from days d
  left join public."Bookings" b
    on b."Helper-id" = auth.uid()
   and b."Status" = 'Completed'
   and (b."Completed-at" at time zone 'Asia/Karachi')::date = d.day
  left join public."Tasks" t on t."ID" = b."Task-id"
  where auth.uid() is not null
  group by d.day
  order by d.day;
$$;

revoke all on function public.qareeb_find_helpers(text, boolean, double precision, double precision) from public, anon;
revoke all on function public.qareeb_my_bookings() from public, anon;
revoke all on function public.qareeb_helper_earnings(integer) from public, anon;
grant execute on function public.qareeb_find_helpers(text, boolean, double precision, double precision) to authenticated, service_role;
grant execute on function public.qareeb_my_bookings() to authenticated, service_role;
grant execute on function public.qareeb_helper_earnings(integer) to authenticated, service_role;
