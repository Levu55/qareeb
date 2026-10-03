-- Full booking flow at database level: task creation, booking rules, strangers,
-- acceptance, progress, location, completion and reviews.
-- C = customer, H = approved helper, A = admin (not a helper), X = stranger.
-- @fixtures
-- @checks: 49

-- Setup (as postgres): H approved + available, as review-cnic would do.
update public."Helpers" set "Verify-status" = 'Approved', "Is-available" = true where "ID" = pg_temp.c('H');

-- 1. customer creates a task, trying to spoof status/helper
select pg_temp.as_user(pg_temp.c('C'));
insert into public."Tasks"("Title","Description","Price","Category","Location","Status","Helper-id")
  values ('E2E test','clean kitchen',1200,'cleaning','G-10 Islamabad','Completed',pg_temp.c('H'));
insert into ctx select 'task', "ID" from public."Tasks" where "Title" = 'E2E test';
insert into r(test, expected, result) select 'task stored', 'Open helper=null owner_ok=true', "Status" || ' helper=' || coalesce("Helper-id"::text,'null') || ' owner_ok=' || ("User-id" = auth.uid()) from public."Tasks" where "ID" = pg_temp.c('task');
insert into r(test, expected, result) select 'find_helpers(cleaning)', 'Test Helper r=0', coalesce(string_agg(full_name || ' r=' || rating, ', '), 'none') from public.qareeb_find_helpers('cleaning', false, null, null) where helper_id = pg_temp.c('H');

-- 2. booking attempts
select pg_temp.as_user(pg_temp.c('C'), 'pending');
select pg_temp.try('book without CNIC approval', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('task'), pg_temp.c('H')), 'ERR 42501: new row violates row-level security policy for table "Bookings"');
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('book a non-helper (admin)', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('task'), pg_temp.c('A')), 'ERR 42501: Task or helper not found');
select pg_temp.try('book self as helper', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('task'), pg_temp.c('C')), 'ERR 42501: Task or helper not found');
select pg_temp.try('book approved helper (spoof Completed)', format('insert into public."Bookings"("Task-id","Helper-id","Status") values (%L, %L, %L)', pg_temp.c('task'), pg_temp.c('H'), 'Completed'), 'OK rows=1');
insert into ctx select 'bk', "ID" from public."Bookings" where "Task-id" = pg_temp.c('task');
insert into r(test, expected, result) select 'booking stored', 'Pending cust_ok=true helper_ok=true', "Status" || ' cust_ok=' || ("User-id" = auth.uid()) || ' helper_ok=' || ("Helper-id" = pg_temp.c('H')) from public."Bookings" where "ID" = pg_temp.c('bk');
select pg_temp.try('duplicate booking same task', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('task'), pg_temp.c('H')), 'ERR 23505: duplicate key value violates unique constraint "Bookings_one_active_per_task"');
select pg_temp.try('customer sets Accepted', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Accepted', pg_temp.c('bk')), 'ERR 42501: Booking status cannot change from "Pending" to "Accepted"');
select pg_temp.try('customer sets Completed', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Completed', pg_temp.c('bk')), 'ERR 42501: Booking status cannot change from "Pending" to "Completed"');
select pg_temp.try('review before completion', format('insert into public."Reviews"("Booking-id","Rating") values (%L, 5)', pg_temp.c('bk')), 'ERR 42501: Reviews can only be left for completed bookings');

-- 3. stranger
select pg_temp.as_user(pg_temp.c('X'));
select pg_temp.try('stranger reads booking', format('select 1 from public."Bookings" where "ID" = %L', pg_temp.c('bk')), 'OK rows=0');
select pg_temp.try('stranger cancels booking', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Cancelled', pg_temp.c('bk')), 'OK rows=0');
select pg_temp.try('stranger reads task', format('select 1 from public."Tasks" where "ID" = %L', pg_temp.c('task')), 'OK rows=0');
select pg_temp.try('stranger my_bookings', 'select 1 from public.qareeb_my_bookings()', 'OK rows=0');

-- 4. helper sees and accepts
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('helper reads task', format('select 1 from public."Tasks" where "ID" = %L', pg_temp.c('task')), 'OK rows=1');
insert into r(test, expected, result) select 'helper my_bookings', 'Pending/helper/Test Customer', coalesce(string_agg(status || '/' || my_role || '/' || counterpart_name, ', '), 'none') from public.qareeb_my_bookings();
select pg_temp.try('helper Pending->Completed', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Completed', pg_temp.c('bk')), 'ERR 42501: Booking status cannot change from "Pending" to "Completed"');
select pg_temp.try('helper edits task price', format('update public."Tasks" set "Price" = 1 where "ID" = %L', pg_temp.c('task')), 'OK rows=0');
select pg_temp.try('helper accepts', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Accepted', pg_temp.c('bk')), 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'task after accept', 'Assigned helper_ok=true', "Status" || ' helper_ok=' || ("Helper-id" = pg_temp.c('H')) from public."Tasks" where "ID" = pg_temp.c('task');

-- 5. customer tries to edit the assigned task
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('customer edits assigned task', format('update public."Tasks" set "Price" = 1 where "ID" = %L', pg_temp.c('task')), 'ERR 42501: Only open tasks can be edited (task is Assigned)');

-- 6. progress + location
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('helper Accepted->Arrived (skip)', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Arrived', pg_temp.c('bk')), 'ERR 42501: Booking status cannot change from "Accepted" to "Arrived"');
select pg_temp.try('helper ->On-the-way', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'On-the-way', pg_temp.c('bk')), 'OK rows=1');
select pg_temp.try('helper updates own location', format('update public."Helpers" set "Latitude" = 33.68, "Longitude" = 73.04, "Location-updated-at" = now() where "ID" = %L', pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('helper sets own Verify/Rating (silently kept)', format('update public."Helpers" set "Verify-status" = ''Approved'', "Rating" = 5 where "ID" = %L', pg_temp.c('H')), 'OK rows=1');
select pg_temp.as_user(pg_temp.c('C'));
insert into r(test, expected, result) select 'customer sees distance', 'null', coalesce(helper_distance_km::text, 'null') from public.qareeb_my_bookings() where booking_id = pg_temp.c('bk');
select pg_temp.try('customer cancels while On-the-way', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Cancelled', pg_temp.c('bk')), 'ERR 42501: Booking status cannot change from "On-the-way" to "Cancelled"');
select pg_temp.try('customer moves helper location', format('update public."Helpers" set "Latitude" = 0, "Longitude" = 0 where "ID" = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('customer reads helper row', format('select 1 from public."Helpers" where "ID" = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('customer reads helper profile', format('select 1 from public."Profiles" where "ID" = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('customer reads helper wallet', format('select 1 from public."Wallets" where "User-id" = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('customer calls helper earnings (own only)', 'select 1 from public.qareeb_helper_earnings(7) where amount > 0', 'OK rows=0');
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('helper ->Arrived', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Arrived', pg_temp.c('bk')), 'OK rows=1');
select pg_temp.try('helper ->In-progress', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'In-progress', pg_temp.c('bk')), 'OK rows=1');
select pg_temp.try('helper spoofs Completed-at', format('update public."Bookings" set "Completed-at" = now() where "ID" = %L', pg_temp.c('bk')), 'ERR 42501: Booking task, customer, helper and timestamps cannot be changed');
select pg_temp.try('helper ->Completed', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Completed', pg_temp.c('bk')), 'OK rows=1');
select pg_temp.try('helper Completed->Cancelled', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Cancelled', pg_temp.c('bk')), 'ERR 42501: Booking status cannot change from "Completed" to "Cancelled"');
reset role;
insert into r(test, expected, result) select 'after complete', 'Completed completed_at_set=true task=Completed', b."Status" || ' completed_at_set=' || (b."Completed-at" is not null) || ' task=' || t."Status" from public."Bookings" b join public."Tasks" t on t."ID" = b."Task-id" where b."ID" = pg_temp.c('bk');
select pg_temp.as_user(pg_temp.c('H'));
insert into r(test, expected, result) select 'helper earnings today', '1:1200', string_agg(jobs || ':' || amount, ', ') from public.qareeb_helper_earnings(1);

-- 7. reviews
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('customer review rating 6', format('insert into public."Reviews"("Booking-id","Rating") values (%L, 6)', pg_temp.c('bk')), 'ERR 23514');
select pg_temp.try('customer review (spoof reviewee)', format('insert into public."Reviews"("Booking-id","Rating","Reviewee-id") values (%L, 4, %L)', pg_temp.c('bk'), pg_temp.c('A')), 'OK rows=1');
insert into r(test, expected, result) select 'review stored', '4 reviewee_is_helper=true reviewer_ok=true', "Rating" || ' reviewee_is_helper=' || ("Reviewee-id" = pg_temp.c('H')) || ' reviewer_ok=' || ("Reviewer-id" = auth.uid()) from public."Reviews" where "Booking-id" = pg_temp.c('bk');
select pg_temp.try('customer duplicate review', format('insert into public."Reviews"("Booking-id","Rating") values (%L, 5)', pg_temp.c('bk')), 'ERR 23505: duplicate key value violates unique constraint "Reviews_one_per_booking_reviewer"');
select pg_temp.as_user(pg_temp.c('X'));
select pg_temp.try('stranger reviews booking', format('insert into public."Reviews"("Booking-id","Rating") values (%L, 1)', pg_temp.c('bk')), 'ERR 42501: You can only review bookings you took part in');
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('helper edits customer review', format('update public."Reviews" set "Rating" = 5 where "Booking-id" = %L and "Reviewer-id" = %L', pg_temp.c('bk'), pg_temp.c('C')), 'OK rows=0');
select pg_temp.try('helper deletes review', format('delete from public."Reviews" where "Booking-id" = %L', pg_temp.c('bk')), 'OK rows=0');
select pg_temp.try('helper reviews customer', format('insert into public."Reviews"("Booking-id","Rating") values (%L, 5)', pg_temp.c('bk')), 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'helper Rating now', '4.00', "Rating"::text from public."Helpers" where "ID" = pg_temp.c('H');
