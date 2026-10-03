-- Qareeb: limit how precisely other users learn a helper's position.
--
-- qareeb_find_helpers accepted any coordinates and returned each helper's distance to
-- 10 m, so three queries from different points could pinpoint a helper (often at home)
-- without any booking. qareeb_my_bookings kept returning the helper's live distance to
-- the customer's address even after the job had ended.
--
-- Now:
-- - helper listings show distance rounded up to whole kilometres (enough for "~3 km away");
-- - a booking shows the precise distance only while the helper is travelling to the job
--   (Accepted, On-the-way, Arrived); a pending request shows whole kilometres;
--   finished, rejected or cancelled bookings show none.
-- Coordinates themselves are still never returned to other users.

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
