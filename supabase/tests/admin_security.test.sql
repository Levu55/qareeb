-- Admin-only operations, audit coverage, financial record integrity, privileges and CNIC storage.
-- @fixtures
-- @checks: 52

create temp table seen_logs as select "ID" from public."Admin-logs";
create or replace function pg_temp.new_logs() returns text language sql as $$
  select coalesce(string_agg("Action" || ' by ' || "Actor-role" || coalesce(' ' || (select string_agg(k, ',' order by k) from jsonb_object_keys("Details") k), ''), ' | ' order by "Action"), '(none)')
  from public."Admin-logs" where "ID" not in (select "ID" from seen_logs);
$$;
insert into ctx select 'b1', pg_temp.complete_job('admin test job', 700);
insert into ctx select 'p1', "ID" from public."Payments" where "Booking-id" = pg_temp.c('b1');

-- normal users cannot use admin operations
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('C admin stats', 'select * from public.qareeb_admin_stats()', 'ERR 42501: Admins only');
select pg_temp.try('C wallet mismatches', 'select * from public.qareeb_admin_wallet_mismatches()', 'ERR 42501: Admins only');
select pg_temp.try('C reads audit log', 'select 1 from public."Admin-logs"', 'OK rows=0');
select pg_temp.try('C writes audit log', 'insert into public."Admin-logs"("Actor-role","Action") values (''admin'',''fake.entry'')', 'ERR 42501: permission denied for table Admin-logs');
select pg_temp.try('C makes self admin', format('update public."Profiles" set "Role" = %L where "ID" = %L', 'admin', pg_temp.c('C')), 'ERR 42501: Role "user" can only be changed by an administrator');
select pg_temp.try('C edits H profile', format('update public."Profiles" set "Full-name" = %L where "ID" = %L', 'hacked', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('C reads H profile', format('select 1 from public."Profiles" where "ID" = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('C reads H helper row', format('select 1 from public."Helpers" where "ID" = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('C changes setting', 'update public."Settings" set "Value" = ''999999''', 'OK rows=0');
select pg_temp.try('C adds setting', 'insert into public."Settings"("Key","Value") values (''x'', ''1'')', 'ERR 42501: new row violates row-level security policy for table "Settings"');
select pg_temp.try('C truncates Tasks', 'truncate public."Tasks"', 'ERR 42501: permission denied for table Tasks');
-- accepted, but the database keeps the original creation date (checked below)
select pg_temp.try('C backdates own Created at', format('update public."Profiles" set "Created at" = %L where "ID" = %L', '2020-01-01', pg_temp.c('C')), 'OK rows=1');
select pg_temp.as_user(pg_temp.c('H'));
-- accepted, but rating, Is-female and Verify-status stay admin-controlled (checked below)
select pg_temp.try('H self-sets rating/female', format('update public."Helpers" set "Rating" = 1, "Is-female" = true, "Verify-status" = %L where "ID" = %L', 'Approved', pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('H backdates helper Created-at', format('update public."Helpers" set "Created-at" = %L where "ID" = %L', '2020-01-01', pg_temp.c('H')), 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'C profile after', 'role=user created_changed=false', 'role=' || "Role" || ' created_changed=' || ("Created at" < '2021-01-01') from public."Profiles" where "ID" = pg_temp.c('C');
insert into r(test, expected, result) select 'H helper after', 'rating=0 female=false created_changed=null', 'rating=' || coalesce("Rating"::text, 'null') || ' female=' || "Is-female" || ' created_changed=' || coalesce(("Created-at" < '2021-01-01')::text, 'null') from public."Helpers" where "ID" = pg_temp.c('H');
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select pg_temp.try('anon reads profiles', 'select 1 from public."Profiles"', 'OK rows=0');
select pg_temp.try('anon reads bookings', 'select 1 from public."Bookings"', 'OK rows=0');
select pg_temp.try('anon admin stats', 'select * from public.qareeb_admin_stats()', 'ERR 42501: permission denied for function qareeb_admin_stats');
reset role;

-- admin actions are audited
delete from seen_logs; insert into seen_logs select "ID" from public."Admin-logs";
select pg_temp.as_user(pg_temp.c('A'));
select pg_temp.try('A renames C', format('update public."Profiles" set "Full-name" = "Full-name" || %L where "ID" = %L', ' (checked)', pg_temp.c('C')), 'OK rows=1');
-- the original account was a helper made a user; the test customer is a user made a helper
select pg_temp.try('A changes C role only', format('update public."Profiles" set "Role" = %L where "ID" = %L', 'helper', pg_temp.c('C')), 'OK rows=1');
select pg_temp.try('A grants superadmin', format('update public."Profiles" set "Role" = %L where "ID" = %L', 'superadmin', pg_temp.c('C')), 'ERR 42501: Only a superadmin can grant or remove the superadmin role');
select pg_temp.try('A edits H services', format('update public."Helpers" set "Categories" = array[%L,%L] where "ID" = %L', 'cleaning', 'cooking', pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('A sets H verify-status', format('update public."Helpers" set "Verify-status" = %L where "ID" = %L', 'Approved', pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('A no-op booking update', format('update public."Bookings" set "Status" = "Status" where "ID" = %L', pg_temp.c('b1')), 'OK rows=1');
select pg_temp.try('A edits audit log', 'update public."Admin-logs" set "Action" = ''x.y''', 'ERR 42501: permission denied for table Admin-logs');
select pg_temp.try('A deletes audit log', 'delete from public."Admin-logs"', 'ERR 42501: permission denied for table Admin-logs');
select pg_temp.try('A marks payment paid', format('update public."Payments" set "Status" = %L where "ID" = %L', 'Paid', pg_temp.c('p1')), 'ERR 42501: permission denied for table Payments');
-- scoped to the test users so the counts do not depend on real data
select pg_temp.try('A reads all payments', format('select 1 from public."Payments" where "Payer-id" = %L', pg_temp.c('C')), 'OK rows=1');
select pg_temp.try('A reads all wallets', format('select 1 from public."Wallets" where "User-id" in (%L, %L, %L)', pg_temp.c('C'), pg_temp.c('H'), pg_temp.c('A')), 'OK rows=3');
reset role;
insert into r(test, expected, result) select 'audit entries',
  'helper.admin_update by admin Categories | profile.admin_update by admin Full-name | profile.role_changed by admin from,to',
  pg_temp.new_logs();

-- server roles: audit log and financial records stay intact
set local role service_role;
select pg_temp.try('svc edits audit log', 'update public."Admin-logs" set "Action" = ''x.y''', 'ERR 42501: Admin log entries cannot be changed or deleted');
select pg_temp.try('svc truncates audit log', 'truncate public."Admin-logs"', 'ERR 42501: Admin log entries cannot be changed or deleted');
select pg_temp.try('svc changes payment amount', format('update public."Payments" set "Amount" = 1 where "ID" = %L', pg_temp.c('p1')), 'ERR 42501: The amount and parties of a payment cannot be changed');
select pg_temp.try('svc changes payment payee', format('update public."Payments" set "Payee-id" = %L where "ID" = %L', pg_temp.c('C'), pg_temp.c('p1')), 'ERR 42501: The amount and parties of a payment cannot be changed');
select pg_temp.try('svc deletes payment', format('delete from public."Payments" where "ID" = %L', pg_temp.c('p1')), 'ERR 42501: Payment records cannot be deleted');
select pg_temp.try('svc truncates payments', 'truncate public."Payments" cascade', 'ERR 42501: Payment records cannot be deleted');
reset role;
select pg_temp.as_user(pg_temp.c('C'));
select public.qareeb_choose_payment_method(pg_temp.c('b1'), 'Cash');
select pg_temp.as_user(pg_temp.c('H'));
select public.qareeb_confirm_cash_received(pg_temp.c('b1'));
reset role;
set local role service_role;
select pg_temp.try('svc reopens paid payment', format('update public."Payments" set "Status" = %L where "ID" = %L', 'Due', pg_temp.c('p1')), 'ERR 42501: A paid payment cannot be changed');
select pg_temp.try('svc changes paid method', format('update public."Payments" set "Method" = %L where "ID" = %L', 'Card', pg_temp.c('p1')), 'ERR 42501: A paid payment cannot be changed');
-- attempts on a second job
reset role;
insert into ctx select 'b2', pg_temp.complete_job('admin test job 2', 600);
set local role service_role;
select * from public.qareeb_start_online_payment(pg_temp.c('C'), pg_temp.c('b2'), 'JazzCash', 'testpay');
reset role;
insert into ctx select 'a1', "ID" from public."Payment-attempts" where "Payment-id" = (select "ID" from public."Payments" where "Booking-id" = pg_temp.c('b2'));
set local role service_role;
select pg_temp.try('svc changes attempt amount', format('update public."Payment-attempts" set "Amount" = 1 where "ID" = %L', pg_temp.c('a1')), 'ERR 42501: The order details of a payment attempt cannot be changed');
select pg_temp.try('svc deletes attempt', format('delete from public."Payment-attempts" where "ID" = %L', pg_temp.c('a1')), 'ERR 42501: Payment attempts cannot be deleted');
select public.qareeb_record_provider_payment(pg_temp.c('a1'), 'testpay', 'SEC-1', 600, 'PKR', true);
select pg_temp.try('svc swaps provider ref', format('update public."Payment-attempts" set "Provider-ref" = %L where "ID" = %L', 'SEC-2', pg_temp.c('a1')), 'ERR 42501: The provider reference of a payment attempt cannot be changed');
select pg_temp.try('svc reopens succeeded attempt', format('update public."Payment-attempts" set "Status" = %L where "ID" = %L', 'Initiated', pg_temp.c('a1')), 'ERR 42501: A settled payment attempt cannot be changed');
reset role;
insert into r(test, expected, result) select 'job payments', 'Paid 600 JazzCash; Paid 700 Cash', string_agg("Status" || ' ' || "Amount" || ' ' || coalesce("Method", '-'), '; ' order by "Amount") from public."Payments" where "Booking-id" in (pg_temp.c('b1'), pg_temp.c('b2'));

-- CNIC storage (fixtures give C and H one uploaded photo each)
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('C lists H CNIC files', format('select 1 from storage.objects where bucket_id = %L and name like %L', 'cnic-verifications', pg_temp.c('H') || '/%'), 'OK rows=0');
select pg_temp.try('C lists own CNIC files', format('select 1 from storage.objects where bucket_id = %L and name like %L', 'cnic-verifications', pg_temp.c('C') || '/%'), 'OK rows=1');
select pg_temp.try('C uploads into H folder', format('insert into storage.objects(bucket_id, name, owner_id) values (%L, %L, %L)', 'cnic-verifications', pg_temp.c('H') || '/front_1.jpg', pg_temp.c('C')), 'ERR 42501: new row violates row-level security policy for table "objects"');
select pg_temp.try('C overwrites own CNIC', format('update storage.objects set name = name where bucket_id = %L', 'cnic-verifications'), 'OK rows=0');
select pg_temp.try('C deletes own CNIC', format('delete from storage.objects where bucket_id = %L', 'cnic-verifications'), 'ERR 42501: Direct deletion from storage tables is not allowed');
select pg_temp.as_user(pg_temp.c('A'));
-- scoped to the test users' folders so the count does not depend on real uploads
select pg_temp.try('A lists all CNIC files', format('select 1 from storage.objects where bucket_id = %L and (name like %L or name like %L)', 'cnic-verifications', pg_temp.c('C') || '/%', pg_temp.c('H') || '/%'), 'OK rows=2');
select pg_temp.try('A admin stats', 'select * from public.qareeb_admin_stats()', 'OK rows=1');
select pg_temp.try('A wallet mismatches', 'select * from public.qareeb_admin_wallet_mismatches()', 'OK rows=0');
reset role;
