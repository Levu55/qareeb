-- Qareeb: prevent users from escalating their own role or approving themselves.
--
-- Existing RLS lets an authenticated user INSERT/UPDATE their own "Profiles" and
-- "Helpers" rows, including "Role", "Verify-status" and "Rating". These triggers
-- restrict only those fields, and only for API callers (anon/authenticated).
-- service_role (Edge Functions / admin tooling) and the postgres role
-- (Dashboard / SQL editor) are not restricted.
--
-- No tables, policies, grants or data are dropped or modified.

-- 1. Profiles."Role": users may only hold 'user' or 'helper'; 'admin'/'superadmin'
--    can only be granted (or removed) by a privileged role.
create or replace function public.qareeb_guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
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

create trigger qareeb_guard_profile_role
  before insert or update on public."Profiles"
  for each row execute function public.qareeb_guard_profile_role();

-- 2. Helpers."Verify-status" and "Rating": set only by admins / the review and
--    rating system. For API callers, inserts get the column defaults and updates
--    keep the existing values (silently, so the app's upsert keeps working).
create or replace function public.qareeb_guard_helper_review_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
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

create trigger qareeb_guard_helper_review_fields
  before insert or update on public."Helpers"
  for each row execute function public.qareeb_guard_helper_review_fields();
