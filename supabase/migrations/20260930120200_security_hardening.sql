-- Qareeb: security fixes from the RLS audit.
--
-- 1. Profiles."Phone" was freely editable, and the admin CNIC review shows it. A user
--    could present a different number to the reviewer. For API callers it now always
--    equals the phone number verified by Supabase Auth.
-- 2. CNIC documents could be overwritten after upload (storage UPDATE policy), so an
--    approved photo could be swapped for another image. Uploads use unique file names,
--    so no update permission is needed; documents are now write-once.
-- 3. Admins could set wallet balances and create transactions straight from the
--    browser. Money records now change only through server-side code (service role /
--    SECURITY DEFINER functions). Admins keep read access.

-- ---------------------------------------------------------------------------
-- 1. Profile phone = verified auth phone
-- ---------------------------------------------------------------------------
create or replace function public.qareeb_auth_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when u.phone is null or u.phone = '' then null else '+' || ltrim(u.phone, '+') end
  from auth.users u
  where u.id = auth.uid();
$$;

revoke all on function public.qareeb_auth_phone() from public, anon;
grant execute on function public.qareeb_auth_phone() to authenticated, service_role;

create or replace function public.qareeb_guard_profile_phone()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  verified text;
begin
  if current_user not in ('anon', 'authenticated') or public.qareeb_is_admin() then
    return new;
  end if;

  verified := public.qareeb_auth_phone();
  if verified is not null then
    new."Phone" := verified;
  elsif tg_op = 'UPDATE' then
    new."Phone" := old."Phone";
  end if;
  return new;
end;
$$;

create trigger qareeb_guard_profile_phone
  before insert or update on public."Profiles"
  for each row execute function public.qareeb_guard_profile_phone();

-- ---------------------------------------------------------------------------
-- 2. CNIC documents are write-once for users
-- ---------------------------------------------------------------------------
drop policy "CNIC: users replace own documents" on storage.objects;

-- ---------------------------------------------------------------------------
-- 3. No direct money writes from client sessions (including admins)
-- ---------------------------------------------------------------------------
drop policy "Wallets: admin creates" on public."Wallets";
drop policy "Wallets: admin updates" on public."Wallets";
drop policy "Transactions: admin creates" on public."Transactions";
drop policy "Transactions: admin updates" on public."Transactions";
