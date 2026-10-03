-- Qareeb: booking chat (Messages) and in-app Notifications.
--
-- Messages: one thread per booking between its customer and helper (admins can read).
--   Sending is allowed while the booking is pending/ongoing and for 3 days after it is
--   completed; never for rejected or cancelled bookings. Messages cannot be edited or
--   deleted; recipients mark them read through qareeb_mark_messages_read.
-- Notifications: written only by database triggers (booking requests and status changes,
--   cash payments, new messages). Users read their own and can only mark them read.
-- Both tables are published to Supabase Realtime; RLS decides who receives each row.
-- SMS delivery of notifications is not wired: it needs the production SMS provider.

-- ---------------------------------------------------------------------------
-- 1. Messages
-- ---------------------------------------------------------------------------
create table public."Messages" (
  "ID" uuid primary key default gen_random_uuid(),
  "Booking-id" uuid not null references public."Bookings" ("ID") on delete cascade,
  "Sender-id" uuid not null default auth.uid() references public."Profiles" ("ID") on delete cascade,
  "Body" text not null check (char_length(btrim("Body")) between 1 and 2000),
  "Created-at" timestamptz not null default now(),
  "Read-at" timestamptz
);

alter table public."Messages" enable row level security;
create index "Messages_Booking_created_idx" on public."Messages" ("Booking-id", "Created-at");

create or replace function public.qareeb_is_booking_party(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public."Bookings"
    where "ID" = p_booking_id and auth.uid() in ("User-id", "Helper-id")
  );
$$;

create or replace function public.qareeb_booking_chat_open(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public."Bookings"
    where "ID" = p_booking_id
      and ("Status" in ('Pending', 'Accepted', 'On-the-way', 'Arrived', 'In-progress')
           or ("Status" = 'Completed' and "Completed-at" > now() - interval '3 days'))
  );
$$;

revoke all on function public.qareeb_is_booking_party(uuid) from public, anon;
revoke all on function public.qareeb_booking_chat_open(uuid) from public, anon;
grant execute on function public.qareeb_is_booking_party(uuid) to authenticated, service_role;
grant execute on function public.qareeb_booking_chat_open(uuid) to authenticated, service_role;

create policy "Messages: booking parties or admin read" on public."Messages"
  for select to authenticated
  using (public.qareeb_is_booking_party("Booking-id") or (select public.qareeb_is_admin()));

create policy "Messages: booking parties send while the booking is open" on public."Messages"
  for insert to authenticated
  with check (
    "Sender-id" = (select auth.uid())
    and public.qareeb_is_booking_party("Booking-id")
    and public.qareeb_booking_chat_open("Booking-id")
  );
-- No update/delete policies: messages are immutable for clients.

create or replace function public.qareeb_guard_message()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new."Sender-id" := auth.uid();
    new."Created-at" := now();
    new."Read-at" := null;
    new."Body" := btrim(new."Body");
  end if;
  return new;
end;
$$;

create trigger qareeb_guard_message
  before insert on public."Messages"
  for each row execute function public.qareeb_guard_message();

create or replace function public.qareeb_mark_messages_read(p_booking_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public."Messages" set "Read-at" = now()
    where "Booking-id" = p_booking_id
      and "Sender-id" <> auth.uid()
      and "Read-at" is null
      and public.qareeb_is_booking_party(p_booking_id)
    returning 1
  )
  select count(*)::integer from updated;
$$;

revoke all on function public.qareeb_mark_messages_read(uuid) from public, anon;
grant execute on function public.qareeb_mark_messages_read(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Notifications
-- ---------------------------------------------------------------------------
create table public."Notifications" (
  "ID" uuid primary key default gen_random_uuid(),
  "User-id" uuid not null references public."Profiles" ("ID") on delete cascade,
  "Type" text not null check ("Type" ~ '^[a-z_]{1,40}$'),
  "Title" text not null,
  "Body" text,
  "Booking-id" uuid references public."Bookings" ("ID") on delete cascade,
  "Created-at" timestamptz not null default now(),
  "Read-at" timestamptz
);

alter table public."Notifications" enable row level security;
create index "Notifications_User_created_idx" on public."Notifications" ("User-id", "Created-at" desc);

create policy "Notifications: read own" on public."Notifications"
  for select to authenticated
  using ("User-id" = (select auth.uid()));
-- No insert/update/delete policies: created by triggers, marked read via the function below.

create or replace function public.qareeb_mark_notifications_read(p_ids uuid[] default null)
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public."Notifications" set "Read-at" = now()
    where "User-id" = auth.uid()
      and "Read-at" is null
      and (p_ids is null or "ID" = any (p_ids))
    returning 1
  )
  select count(*)::integer from updated;
$$;

revoke all on function public.qareeb_mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.qareeb_mark_notifications_read(uuid[]) to authenticated, service_role;

create or replace function public.qareeb_notify(p_user uuid, p_type text, p_title text, p_body text, p_booking uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public."Notifications" ("User-id", "Type", "Title", "Body", "Booking-id")
  values (p_user, p_type, p_title, p_body, p_booking);
$$;

revoke all on function public.qareeb_notify(uuid, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.qareeb_notify_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_title text;
  helper_name text;
  customer_name text;
begin
  if tg_op = 'UPDATE' and new."Status" is not distinct from old."Status" then
    return null;
  end if;

  select coalesce(nullif("Title", ''), 'your task') into task_title from public."Tasks" where "ID" = new."Task-id";
  select coalesce(nullif("Full-name", ''), 'Your helper') into helper_name from public."Profiles" where "ID" = new."Helper-id";
  select coalesce(nullif("Full-name", ''), 'The customer') into customer_name from public."Profiles" where "ID" = new."User-id";

  if tg_op = 'INSERT' then
    perform public.qareeb_notify(new."Helper-id", 'booking_request', 'New booking request',
      customer_name || ' requested you for "' || task_title || '".', new."ID");
    return null;
  end if;

  case new."Status"
    when 'Accepted' then
      perform public.qareeb_notify(new."User-id", 'booking_accepted', 'Booking accepted',
        helper_name || ' accepted "' || task_title || '".', new."ID");
    when 'Rejected' then
      perform public.qareeb_notify(new."User-id", 'booking_rejected', 'Request declined',
        helper_name || ' declined "' || task_title || '". You can choose another helper.', new."ID");
    when 'On-the-way' then
      perform public.qareeb_notify(new."User-id", 'booking_on_the_way', 'Helper on the way',
        helper_name || ' is on the way.', new."ID");
    when 'Arrived' then
      perform public.qareeb_notify(new."User-id", 'booking_arrived', 'Helper arrived',
        helper_name || ' has arrived.', new."ID");
    when 'In-progress' then
      perform public.qareeb_notify(new."User-id", 'booking_in_progress', 'Work started',
        helper_name || ' started working on "' || task_title || '".', new."ID");
    when 'Completed' then
      perform public.qareeb_notify(new."User-id", 'booking_completed', 'Job completed',
        '"' || task_title || '" is done. Please pay and rate ' || helper_name || '.', new."ID");
    when 'Cancelled' then
      perform public.qareeb_notify(new."Helper-id", 'booking_cancelled', 'Booking cancelled',
        customer_name || ' cancelled "' || task_title || '".', new."ID");
    else
      null;
  end case;
  return null;
end;
$$;

create trigger qareeb_notify_booking
  after insert or update on public."Bookings"
  for each row execute function public.qareeb_notify_booking();

create or replace function public.qareeb_notify_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new."Status" is not distinct from old."Status" then
    return null;
  end if;
  if new."Status" = 'Awaiting-confirmation' then
    perform public.qareeb_notify(new."Payee-id", 'payment_cash_pending', 'Cash payment to confirm',
      'The customer will pay Rs. ' || new."Amount" || ' in cash. Confirm it in your Wallet once received.', new."Booking-id");
  elsif new."Status" = 'Paid' then
    perform public.qareeb_notify(new."Payer-id", 'payment_confirmed', 'Payment confirmed',
      'Your payment of Rs. ' || new."Amount" || ' was confirmed.', new."Booking-id");
  end if;
  return null;
end;
$$;

create trigger qareeb_notify_payment
  after update on public."Payments"
  for each row execute function public.qareeb_notify_payment();

create or replace function public.qareeb_notify_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
  sender_name text;
begin
  select "User-id", "Helper-id" into b from public."Bookings" where "ID" = new."Booking-id";
  select coalesce(nullif("Full-name", ''), 'Someone') into sender_name from public."Profiles" where "ID" = new."Sender-id";
  perform public.qareeb_notify(
    case when new."Sender-id" = b."User-id" then b."Helper-id" else b."User-id" end,
    'message', 'New message from ' || sender_name, left(new."Body", 120), new."Booking-id");
  return null;
end;
$$;

create trigger qareeb_notify_message
  after insert on public."Messages"
  for each row execute function public.qareeb_notify_message();

revoke all on function public.qareeb_notify_booking() from public, anon, authenticated;
revoke all on function public.qareeb_notify_payment() from public, anon, authenticated;
revoke all on function public.qareeb_notify_message() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public."Messages";
alter publication supabase_realtime add table public."Notifications";
