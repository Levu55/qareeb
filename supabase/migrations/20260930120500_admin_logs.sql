-- Qareeb: append-only audit log for sensitive and administrative actions.
--
-- Entries are written by database triggers (so no client can skip them) and by the
-- review-cnic Edge Function (CNIC decisions live in auth metadata, not in a table).
-- Admins can read the log; nobody can change or delete entries, including the
-- service role (a trigger blocks UPDATE/DELETE/TRUNCATE).
--
-- Logged:
--   profile.role_changed            any change of Profiles."Role"
--   helper.verification_changed     Helpers."Verify-status" / "Is-female" changed by an admin
--                                   session or SQL (the review-cnic function logs its own entry)
--   booking.admin_update / delete   an admin changing a booking they are not part of
--   task.admin_update / delete      an admin changing a task they do not own
--   review.admin_update / delete    an admin editing or removing someone else's review
--   setting.changed                 any Settings change
--   cnic.approved/rejected/revoked  from the review-cnic Edge Function

create table public."Admin-logs" (
  "ID" uuid primary key default gen_random_uuid(),
  "Actor-id" uuid references public."Profiles" ("ID") on delete set null,
  "Actor-role" text not null,
  "Action" text not null check ("Action" ~ '^[a-z_]+\.[a-z_]+$'),
  "Target-table" text,
  "Target-id" text,
  "Details" jsonb not null default '{}'::jsonb,
  "Created-at" timestamptz not null default now()
);

alter table public."Admin-logs" enable row level security;

create index "Admin-logs_Created-at_idx" on public."Admin-logs" ("Created-at" desc);
create index "Admin-logs_Target_idx" on public."Admin-logs" ("Target-table", "Target-id");

create policy "Admin logs: admins read" on public."Admin-logs"
  for select to authenticated
  using ((select public.qareeb_is_admin()));
-- No insert/update/delete policies: clients cannot write the log directly.

create or replace function public.qareeb_block_admin_log_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Admin log entries cannot be changed or deleted' using errcode = '42501';
end;
$$;

create trigger qareeb_block_admin_log_changes
  before update or delete on public."Admin-logs"
  for each row execute function public.qareeb_block_admin_log_changes();

create trigger qareeb_block_admin_log_truncate
  before truncate on public."Admin-logs"
  for each statement execute function public.qareeb_block_admin_log_changes();

-- Internal writer used by the triggers below (not callable by clients)
create or replace function public.qareeb_write_admin_log(
  p_action text, p_table text, p_target text, p_details jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public."Admin-logs" ("Actor-id", "Actor-role", "Action", "Target-table", "Target-id", "Details")
  values (
    (select p."ID" from public."Profiles" p where p."ID" = auth.uid()),
    case
      when auth.uid() is not null then coalesce((select p."Role" from public."Profiles" p where p."ID" = auth.uid()), 'user')
      when current_user = 'service_role' then 'service'
      else 'database'
    end,
    p_action, p_table, p_target, coalesce(p_details, '{}'::jsonb)
  );
$$;

revoke all on function public.qareeb_write_admin_log(text, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_audit_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new."Role" is distinct from old."Role" then
    perform public.qareeb_write_admin_log('profile.role_changed', 'Profiles', new."ID"::text,
      jsonb_build_object('from', old."Role", 'to', new."Role"));
  end if;
  return null;
end;
$$;

create trigger qareeb_audit_profile
  after update on public."Profiles"
  for each row execute function public.qareeb_audit_profile();

create or replace function public.qareeb_audit_helper()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The review-cnic function (service role) writes its own, more detailed entry
  if current_user = 'service_role' then
    return null;
  end if;
  if new."Verify-status" is distinct from old."Verify-status" or new."Is-female" is distinct from old."Is-female" then
    perform public.qareeb_write_admin_log('helper.verification_changed', 'Helpers', new."ID"::text,
      jsonb_build_object(
        'verify_status', jsonb_build_object('from', old."Verify-status", 'to', new."Verify-status"),
        'is_female', jsonb_build_object('from', old."Is-female", 'to', new."Is-female")));
  end if;
  return null;
end;
$$;

create trigger qareeb_audit_helper
  after update on public."Helpers"
  for each row execute function public.qareeb_audit_helper();

-- Admin actions on records the admin is not a party to
create or replace function public.qareeb_audit_admin_override()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  row_data jsonb := to_jsonb(coalesce(new, old));
  is_party boolean;
  entity text := case tg_table_name when 'Bookings' then 'booking' when 'Tasks' then 'task' else 'review' end;
  changes jsonb := '{}'::jsonb;
begin
  if uid is null or not public.qareeb_is_admin() then
    return null;
  end if;

  is_party := case tg_table_name
    when 'Bookings' then uid::text in (row_data ->> 'User-id', row_data ->> 'Helper-id')
    when 'Tasks' then uid::text = row_data ->> 'User-id'
    else uid::text = row_data ->> 'Reviewer-id'
  end;
  if is_party then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', o.value, 'to', n.value)), '{}'::jsonb)
    into changes
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o on o.key = n.key
    where n.value is distinct from o.value;
  else
    changes := jsonb_build_object('deleted', row_data);
  end if;

  perform public.qareeb_write_admin_log(entity || case when tg_op = 'DELETE' then '.admin_delete' else '.admin_update' end,
    tg_table_name, row_data ->> 'ID', changes);
  return null;
end;
$$;

create trigger qareeb_audit_admin_override
  after update or delete on public."Bookings"
  for each row execute function public.qareeb_audit_admin_override();
create trigger qareeb_audit_admin_override
  after update or delete on public."Tasks"
  for each row execute function public.qareeb_audit_admin_override();
create trigger qareeb_audit_admin_override
  after update or delete on public."Reviews"
  for each row execute function public.qareeb_audit_admin_override();

create or replace function public.qareeb_audit_setting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.qareeb_write_admin_log('setting.changed', 'Settings', coalesce(new."Key", old."Key"),
    jsonb_build_object('from', case when tg_op <> 'INSERT' then old."Value" end,
                       'to', case when tg_op <> 'DELETE' then new."Value" end));
  return null;
end;
$$;

create trigger qareeb_audit_setting
  after insert or update or delete on public."Settings"
  for each row execute function public.qareeb_audit_setting();

revoke all on function public.qareeb_audit_profile() from public, anon, authenticated;
revoke all on function public.qareeb_audit_helper() from public, anon, authenticated;
revoke all on function public.qareeb_audit_admin_override() from public, anon, authenticated;
revoke all on function public.qareeb_audit_setting() from public, anon, authenticated;
revoke all on function public.qareeb_block_admin_log_changes() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin dashboard figures (admins only; counts, no personal data)
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
    (select count(*) from public."Payments" where "Status" in ('Due', 'Awaiting-confirmation'));
end;
$$;

revoke all on function public.qareeb_admin_stats() from public, anon;
grant execute on function public.qareeb_admin_stats() to authenticated, service_role;
