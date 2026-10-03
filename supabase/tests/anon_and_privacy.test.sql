-- Signed-out (anon) access to every table, verified phone numbers, write-once CNIC
-- photos, and no money writes from an admin's browser session.
-- @fixtures
-- @checks: 17

-- anon (signed out) on every table
set local role anon;
select pg_temp.try('anon reads Profiles', 'select 1 from public."Profiles"', 'OK rows=0');
select pg_temp.try('anon reads Helpers', 'select 1 from public."Helpers"', 'OK rows=0');
select pg_temp.try('anon reads Tasks', 'select 1 from public."Tasks"', 'OK rows=0');
select pg_temp.try('anon reads Bookings', 'select 1 from public."Bookings"', 'OK rows=0');
select pg_temp.try('anon reads Wallets', 'select 1 from public."Wallets"', 'OK rows=0');
select pg_temp.try('anon reads Transactions', 'select 1 from public."Transactions"', 'OK rows=0');
select pg_temp.try('anon reads Reviews', 'select 1 from public."Reviews"', 'OK rows=0');
select pg_temp.try('anon inserts Tasks', 'insert into public."Tasks"("Title") values (''x'')', 'ERR 42501');
select pg_temp.try('anon calls find_helpers', 'select 1 from public.qareeb_find_helpers(null,false,null,null)', 'ERR 42501: permission denied for function qareeb_find_helpers');
select pg_temp.try('anon calls my_bookings', 'select 1 from public.qareeb_my_bookings()', 'ERR 42501: permission denied for function qareeb_my_bookings');
select pg_temp.try('anon reads cnic objects', 'select 1 from storage.objects where bucket_id = ''cnic-verifications''', 'OK rows=0');
reset role;

-- 1. customer fakes their phone number: the update runs, but Phone stays the verified auth phone
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('user sets fake Phone', format('update public."Profiles" set "Phone" = ''+920000000000'' where "ID" = %L', pg_temp.c('C')), 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'phone after', '+920000000101', "Phone" from public."Profiles" where "ID" = pg_temp.c('C');

-- 2. user overwrites an existing CNIC object (metadata-level check of the UPDATE policy)
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('user overwrites own CNIC object', format('update storage.objects set name = name where bucket_id = ''cnic-verifications'' and (storage.foldername(name))[1] = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('user deletes own CNIC object', format('delete from storage.objects where bucket_id = ''cnic-verifications'' and (storage.foldername(name))[1] = %L', pg_temp.c('H')), 'ERR 42501: Direct deletion from storage tables is not allowed');

-- 3. admin writes money directly from the browser session
select pg_temp.as_user(pg_temp.c('A'));
select pg_temp.try('admin sets a wallet balance', format('update public."Wallets" set "Balance" = 50000 where "User-id" = %L', pg_temp.c('H')), 'ERR 42501: permission denied for table Wallets');
select pg_temp.try('admin inserts a transaction', format('insert into public."Transactions"("Wallet-id","User-id","Amount","Status") select "ID", "User-id", 50000, ''Completed'' from public."Wallets" where "User-id" = %L', pg_temp.c('H')), 'ERR 42501: permission denied for table Transactions');
reset role;
