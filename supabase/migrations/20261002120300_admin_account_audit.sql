-- Qareeb: audit admin changes to other people's accounts.
--
-- Admins can update every profile and helper record (name, phone, services, availability,
-- location), but only role and verification changes were logged. The admin-override audit
-- now covers Profiles and Helpers too. Fields that already have their own entries
-- (profile.role_changed, helper.verification_changed) are left out, and updates that
-- change nothing are no longer logged.
--   profile.admin_update   an admin changed someone else's profile
--   helper.admin_update    an admin changed someone else's helper record

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
  entity text := case tg_table_name
    when 'Bookings' then 'booking' when 'Tasks' then 'task'
    when 'Profiles' then 'profile' when 'Helpers' then 'helper' else 'review' end;
  skip text[] := case tg_table_name
    when 'Profiles' then array['Role']
    when 'Helpers' then array['Verify-status', 'Is-female']
    else array[]::text[] end;
  changes jsonb := '{}'::jsonb;
begin
  if uid is null or not public.qareeb_is_admin() then
    return null;
  end if;

  is_party := case tg_table_name
    when 'Bookings' then uid::text in (row_data ->> 'User-id', row_data ->> 'Helper-id')
    when 'Tasks' then uid::text = row_data ->> 'User-id'
    when 'Profiles' then uid::text = row_data ->> 'ID'
    when 'Helpers' then uid::text = row_data ->> 'ID'
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
    where n.value is distinct from o.value and not (n.key = any (skip));
    if changes = '{}'::jsonb then
      return null;
    end if;
  else
    changes := jsonb_build_object('deleted', row_data);
  end if;

  perform public.qareeb_write_admin_log(entity || case when tg_op = 'DELETE' then '.admin_delete' else '.admin_update' end,
    tg_table_name, row_data ->> 'ID', changes);
  return null;
end;
$$;

create trigger qareeb_audit_admin_override
  after update on public."Profiles"
  for each row execute function public.qareeb_audit_admin_override();
create trigger qareeb_audit_admin_override
  after update on public."Helpers"
  for each row execute function public.qareeb_audit_admin_override();

revoke all on function public.qareeb_audit_admin_override() from public, anon, authenticated;
