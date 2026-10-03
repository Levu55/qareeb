-- Database-wide guarantees that a new table, grant or function could silently break:
-- RLS on every public table, no client write access to money/audit tables, server-only
-- functions closed to clients, and SECURITY DEFINER functions with a fixed search_path.
-- @checks: 9

-- every table in the public schema has row level security enabled
insert into r(test, expected, result)
select 'public tables without RLS', '(none)', coalesce(string_agg(c.relname, ', ' order by c.relname), '(none)')
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;

insert into r(test, expected, result)
select 'core tables present with RLS',
  'Admin-logs, Bookings, Helpers, Messages, Notifications, Payment-attempts, Payments, Profiles, Reviews, Settings, Tasks, Transactions, Wallets',
  string_agg(c.relname, ', ' order by c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and c.relname in ('Admin-logs', 'Bookings', 'Helpers', 'Messages', 'Notifications', 'Payment-attempts', 'Payments',
                    'Profiles', 'Reviews', 'Settings', 'Tasks', 'Transactions', 'Wallets');

-- clients (signed in or not) can never truncate, reference or add triggers to a table
insert into r(test, expected, result)
select 'client TRUNCATE/REFERENCES/TRIGGER grants', '(none)', coalesce(string_agg(format('%s:%s', g.grantee, g.table_name || '.' || g.privilege_type), ', '), '(none)')
from information_schema.role_table_grants g
where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated')
  and g.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER');

-- money, audit and notification rows are written only by the database and the server
insert into r(test, expected, result)
select 'client writes on money/audit/notification tables', '(none)', coalesce(string_agg(format('%s:%s.%s', g.grantee, g.table_name, g.privilege_type), ', ' order by g.table_name, g.privilege_type), '(none)')
from information_schema.role_table_grants g
where g.table_schema = 'public' and g.grantee in ('anon', 'authenticated')
  and g.table_name in ('Wallets', 'Transactions', 'Payments', 'Payment-attempts', 'Admin-logs', 'Notifications')
  and g.privilege_type in ('INSERT', 'UPDATE', 'DELETE');

-- no policy applies to signed-out users (or to every role), so anon reaches no rows at all
insert into r(test, expected, result)
select 'policies open to anon or public', '(none)', coalesce(string_agg(p.tablename || '.' || p.policyname, ', ' order by p.tablename, p.policyname), '(none)')
from pg_policies p
where p.schemaname = 'public' and ('anon' = any (p.roles) or 'public' = any (p.roles));

-- server-only functions (payment provider path, notifications, audit writer)
insert into r(test, expected, result)
select 'server-only functions callable by clients', '(none)', coalesce(string_agg(format('%s:%s', r.rolname, p.proname), ', ' order by p.proname, r.rolname), '(none)')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
cross join (select rolname from pg_roles where rolname in ('anon', 'authenticated')) r
where n.nspname = 'public'
  and p.proname in ('qareeb_start_online_payment', 'qareeb_record_provider_payment', 'qareeb_fail_online_payment',
                    'qareeb_notify', 'qareeb_write_admin_log')
  and has_function_privilege(r.rolname, p.oid, 'execute');

-- every SECURITY DEFINER function in public pins its search_path
insert into r(test, expected, result)
select 'SECURITY DEFINER functions without search_path', '(none)', coalesce(string_agg(p.proname, ', ' order by p.proname), '(none)')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');

-- private CNIC bucket
insert into r(test, expected, result)
select 'CNIC bucket private', 'false', public::text from storage.buckets where id = 'cnic-verifications';

-- every profile has a wallet (wallets are created by the database)
insert into r(test, expected, result)
select 'profiles without a wallet', '0', count(*)::text
from public."Profiles" p where not exists (select 1 from public."Wallets" w where w."User-id" = p."ID");
