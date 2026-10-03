-- Qareeb: fix service-role detection in the audit log triggers.
--
-- Inside SECURITY DEFINER functions current_user is the function owner, so the
-- previous checks never recognised the service role: review-cnic decisions were logged
-- twice (once by the function, once by the Helpers trigger as "database").
-- The request's role now comes from the JWT (auth.role()), which PostgREST sets for
-- every API call. Helper entries also list only the fields that actually changed.

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
      when auth.role() = 'service_role' then 'service'
      else 'database'
    end,
    p_action, p_table, p_target, coalesce(p_details, '{}'::jsonb)
  );
$$;

revoke all on function public.qareeb_write_admin_log(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.qareeb_audit_helper()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changes jsonb := '{}'::jsonb;
begin
  -- The review-cnic function (service role) writes its own, more detailed entry
  if auth.role() = 'service_role' then
    return null;
  end if;
  if new."Verify-status" is distinct from old."Verify-status" then
    changes := changes || jsonb_build_object('verify_status', jsonb_build_object('from', old."Verify-status", 'to', new."Verify-status"));
  end if;
  if new."Is-female" is distinct from old."Is-female" then
    changes := changes || jsonb_build_object('is_female', jsonb_build_object('from', old."Is-female", 'to', new."Is-female"));
  end if;
  if changes <> '{}'::jsonb then
    perform public.qareeb_write_admin_log('helper.verification_changed', 'Helpers', new."ID"::text, changes);
  end if;
  return null;
end;
$$;

revoke all on function public.qareeb_audit_helper() from public, anon, authenticated;
