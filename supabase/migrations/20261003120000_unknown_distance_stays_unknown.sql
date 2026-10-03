-- Qareeb: a distance that cannot be computed stays unknown.
--
-- 20260930120300_location_privacy rounds listing distances up with
-- greatest(1, ceil(distance)). When the task has no coordinates the distance is NULL, but
-- greatest() ignores NULL arguments, so every helper with a recent location was reported
-- as "1 km away". Found by supabase/tests/reviews_location_earnings.test.sql
-- ("no task coordinates -> no distances").
--
-- Both functions are re-created exactly as before, except that the whole-kilometre value is
-- only produced when a distance exists. Signatures, security and grants are unchanged.

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
                   and public.qareeb_distance_km(p_lat, p_lng, h."Latitude", h."Longitude") is not null
              then greatest(1, ceil(public.qareeb_distance_km(p_lat, p_lng, h."Latitude", h."Longitude"))) end
  from public."Helpers" h
  join public."Profiles" p on p."ID" = h."ID"
  where h."Verify-status" = 'Approved'
    and h."Is-available" is true
    and h."ID" <> auth.uid()
    and (p_category is null or p_category = any (h."Categories"))
    and (not coalesce(p_female_only, false) or h."Is-female")
  order by 8 asc nulls last, coalesce(h."Rating", 0) desc, p."Full-name";
$$;

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
         case
           when h."Location-updated-at" is null or h."Location-updated-at" <= now() - interval '24 hours' then null
           when b."Status" in ('Accepted', 'On-the-way', 'Arrived')
             then public.qareeb_distance_km(t."Latitude", t."Longitude", h."Latitude", h."Longitude")
           when b."Status" = 'Pending'
                and public.qareeb_distance_km(t."Latitude", t."Longitude", h."Latitude", h."Longitude") is not null
             then greatest(1, ceil(public.qareeb_distance_km(t."Latitude", t."Longitude", h."Latitude", h."Longitude")))
         end,
         case when b."Status" in ('Pending', 'Accepted', 'On-the-way', 'Arrived') then h."Location-updated-at" end,
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
