-- Qareeb: fields the existing task/helper screens collect, plus safe read functions.
--
-- Tasks:   "Category" (service id), "Location", "Female-only" (Post Task steps 1, 3, 4)
-- Helpers: "Categories" (services chosen in Become a Helper), "Is-female" (women-only
--          filter; safety-relevant, so only admins/server can set it)
-- Reads:   customers cannot read other users' Profiles/Helpers rows, so helper search
--          and booking lists go through SECURITY DEFINER functions that return only
--          the fields the UI shows (no phone numbers).

alter table public."Tasks"
  add column "Category" text,
  add column "Location" text,
  add column "Female-only" boolean not null default false,
  add constraint "Tasks_Category_format" check ("Category" is null or "Category" ~ '^[a-z_]{1,40}$'),
  add constraint "Tasks_Location_length" check ("Location" is null or char_length("Location") <= 300);

alter table public."Helpers"
  add column "Categories" text[] not null default '{}',
  add column "Is-female" boolean not null default false,
  add constraint "Helpers_Categories_limit" check (cardinality("Categories") <= 20);

create index "Tasks_Category_idx" on public."Tasks" ("Category");
create index "Helpers_Categories_idx" on public."Helpers" using gin ("Categories");

-- "Is-female" joins the admin-controlled review fields
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
    new."Is-female" := false;
  else
    new."Verify-status" := old."Verify-status";
    new."Rating" := old."Rating";
    new."Is-female" := old."Is-female";
  end if;

  return new;
end;
$$;

-- Approved, available helpers for a service (caller excluded)
create or replace function public.qareeb_find_helpers(p_category text default null, p_female_only boolean default false)
returns table (
  helper_id uuid,
  full_name text,
  rating numeric,
  categories text[],
  is_female boolean,
  completed_jobs bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select h."ID", p."Full-name", coalesce(h."Rating", 0), h."Categories", h."Is-female",
         (select count(*) from public."Bookings" b where b."Helper-id" = h."ID" and b."Status" = 'Completed')
  from public."Helpers" h
  join public."Profiles" p on p."ID" = h."ID"
  where h."Verify-status" = 'Approved'
    and h."Is-available" is true
    and h."ID" <> auth.uid()
    and (p_category is null or p_category = any (h."Categories"))
    and (not coalesce(p_female_only, false) or h."Is-female")
  order by coalesce(h."Rating", 0) desc, p."Full-name";
$$;

-- The caller's bookings (as customer or helper) with task details and the other party's name
create or replace function public.qareeb_my_bookings()
returns table (
  booking_id uuid,
  task_id uuid,
  status text,
  scheduled_at timestamptz,
  created_at timestamptz,
  my_role text,
  counterpart_id uuid,
  counterpart_name text,
  title text,
  description text,
  category text,
  location text,
  price numeric,
  female_only boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select b."ID", b."Task-id", b."Status", b."Scheduled-at", b."Created-at",
         case when b."User-id" = auth.uid() then 'customer' else 'helper' end,
         case when b."User-id" = auth.uid() then b."Helper-id" else b."User-id" end,
         p."Full-name",
         t."Title", t."Description", t."Category", t."Location", t."Price", t."Female-only"
  from public."Bookings" b
  join public."Tasks" t on t."ID" = b."Task-id"
  left join public."Profiles" p
    on p."ID" = case when b."User-id" = auth.uid() then b."Helper-id" else b."User-id" end
  where auth.uid() is not null
    and (b."User-id" = auth.uid() or b."Helper-id" = auth.uid())
  order by b."Created-at" desc;
$$;

revoke all on function public.qareeb_find_helpers(text, boolean) from public, anon;
revoke all on function public.qareeb_my_bookings() from public, anon;
grant execute on function public.qareeb_find_helpers(text, boolean) to authenticated, service_role;
grant execute on function public.qareeb_my_bookings() to authenticated, service_role;
