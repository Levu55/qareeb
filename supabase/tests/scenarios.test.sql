-- Real-world error scenarios 1-16: conflicting bookings, interference by other users,
-- unauthorized edits, fake payments, duplicate callbacks, ledger tampering, invalid
-- transitions and review abuse. H2 is a second approved helper.
-- @fixtures
-- @checks: 63

insert into ctx values ('H2', '00000000-0000-4000-8000-0000000000b2');
insert into auth.users (id, aud, role, phone) values (pg_temp.c('H2'), 'authenticated', 'authenticated', '920000000222');
insert into public."Profiles" ("ID", "Full-name", "Role") values (pg_temp.c('H2'), 'Second Helper', 'helper');
insert into public."Helpers" ("ID", "User-id", "Verify-status", "Is-available", "Categories") values (pg_temp.c('H2'), pg_temp.c('H2'), 'Approved', true, array['cleaning']);

-- 1. customer creates a booking
insert into ctx select 'b1', pg_temp.book_job('scenario job 1', 1000);
insert into ctx select 't1', "Task-id" from public."Bookings" where "ID" = pg_temp.c('b1');
insert into r(test, expected, result) select '1 customer creates booking', 'Pending', "Status" from public."Bookings" where "ID" = pg_temp.c('b1');

-- 2. conflicting booking actions
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('2a same task booked with a second helper', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('t1'), pg_temp.c('H2')), 'ERR 23505: duplicate key value violates unique constraint "Bookings_one_active_per_task"');
select pg_temp.try('2b customer cancels task with pending booking', format('update public."Tasks" set "Status" = %L where "ID" = %L', 'Cancelled', pg_temp.c('t1')), 'ERR 42501: This task has an active booking. Cancel the booking before changing the task.');
select pg_temp.try('2c customer reprices task during request', format('update public."Tasks" set "Price" = 1 where "ID" = %L', pg_temp.c('t1')), 'ERR 42501: This task has an active booking. Cancel the booking before changing the task.');
reset role;
insert into ctx select 'b2', pg_temp.book_job('scenario job 2', 800);

-- 3. helper accepts
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('3 helper accepts booking', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Accepted', pg_temp.c('b1')), 'OK rows=1');
select pg_temp.try('2d helper accepts a second job at once', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Accepted', pg_temp.c('b2')), 'ERR 23505: duplicate key value violates unique constraint "Bookings_one_active_job_per_helper"');
reset role;
insert into r(test, expected, result) select '3 task after accept', 'Assigned helper_is_H=true', "Status" || ' helper_is_H=' || ("Helper-id" = pg_temp.c('H')) from public."Tasks" where "ID" = pg_temp.c('t1');

-- 4. another helper interferes
select pg_temp.as_user(pg_temp.c('H2'));
select pg_temp.try('4a other helper reads booking', format('select 1 from public."Bookings" where "ID" = %L', pg_temp.c('b1')), 'OK rows=0');
select pg_temp.try('4b other helper accepts/advances it', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'On-the-way', pg_temp.c('b1')), 'OK rows=0');
select pg_temp.try('4c other helper takes it over', format('update public."Bookings" set "Helper-id" = %L where "ID" = %L', pg_temp.c('H2'), pg_temp.c('b1')), 'OK rows=0');
select pg_temp.try('4d other helper messages customer', format('insert into public."Messages"("Booking-id","Body") values (%L, %L)', pg_temp.c('b1'), 'hi'), 'ERR 42501: new row violates row-level security policy for table "Messages"');
select pg_temp.try('4e other helper edits the task', format('update public."Tasks" set "Price" = 1 where "ID" = %L', pg_temp.c('t1')), 'OK rows=0');

-- 5. customer unauthorized modifications
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('5a customer marks booking completed', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Completed', pg_temp.c('b1')), 'ERR 42501: Booking status cannot change from "Accepted" to "Completed"');
select pg_temp.try('5b customer swaps the helper', format('update public."Bookings" set "Helper-id" = %L where "ID" = %L', pg_temp.c('H2'), pg_temp.c('b1')), 'ERR 42501: Booking task, customer, helper and timestamps cannot be changed');
select pg_temp.try('5c customer fakes completion time', format('update public."Bookings" set "Completed-at" = now() where "ID" = %L', pg_temp.c('b1')), 'ERR 42501: Booking task, customer, helper and timestamps cannot be changed');
select pg_temp.try('5d customer reprices assigned task', format('update public."Tasks" set "Price" = 1 where "ID" = %L', pg_temp.c('t1')), 'ERR 42501: Only open tasks can be edited (task is Assigned)');

-- 6. helper unauthorized modifications
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('6a helper reprices task', format('update public."Tasks" set "Price" = 99999 where "ID" = %L', pg_temp.c('t1')), 'OK rows=0');
select pg_temp.try('6b helper cancels booking', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Cancelled', pg_temp.c('b1')), 'ERR 42501: Booking status cannot change from "Accepted" to "Cancelled"');
select pg_temp.try('6c helper skips to completed', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Completed', pg_temp.c('b1')), 'ERR 42501: Booking status cannot change from "Accepted" to "Completed"');
select pg_temp.try('6d helper reschedules', format('update public."Bookings" set "Scheduled-at" = now() + interval ''1 day'' where "ID" = %L', pg_temp.c('b1')), 'ERR 42501: Schedule can only be changed by the customer while the booking is pending');
select pg_temp.try('6e helper edits customer profile', format('update public."Profiles" set "Full-name" = %L where "ID" = %L', 'x', pg_temp.c('C')), 'OK rows=0');

-- 7. normal user calls admin operations
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('7a admin stats', 'select * from public.qareeb_admin_stats()', 'ERR 42501: Admins only');
select pg_temp.try('7b promote another user', format('update public."Profiles" set "Role" = %L where "ID" = %L', 'admin', pg_temp.c('H2')), 'OK rows=0');
select pg_temp.try('7c delete a booking', format('delete from public."Bookings" where "ID" = %L', pg_temp.c('b2')), 'OK rows=0');
select pg_temp.try('7d approve a helper', format('update public."Helpers" set "Verify-status" = %L where "ID" = %L', 'Approved', pg_temp.c('H2')), 'OK rows=0');

-- finish job 1 so payment/review scenarios can run
select pg_temp.as_user(pg_temp.c('H'));
update public."Bookings" set "Status" = 'On-the-way' where "ID" = pg_temp.c('b1');
update public."Bookings" set "Status" = 'Arrived' where "ID" = pg_temp.c('b1');
update public."Bookings" set "Status" = 'In-progress' where "ID" = pg_temp.c('b1');
update public."Bookings" set "Status" = 'Completed' where "ID" = pg_temp.c('b1');
reset role;
insert into ctx select 'p1', "ID" from public."Payments" where "Booking-id" = pg_temp.c('b1');

-- 8. wallet manipulation
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('8a set own balance', 'update public."Wallets" set "Balance" = 100000', 'ERR 42501: permission denied for table Wallets');
select pg_temp.try('8b create a funded wallet', format('insert into public."Wallets"("User-id","Balance") values (%L, 100000)', pg_temp.c('C')), 'ERR 42501: permission denied for table Wallets');

-- 9. fake successful payment
select pg_temp.try('9a mark payment paid', format('update public."Payments" set "Status" = %L where "ID" = %L', 'Paid', pg_temp.c('p1')), 'ERR 42501: permission denied for table Payments');
select pg_temp.try('9b insert a paid payment', format('insert into public."Payments"("Booking-id","Payer-id","Payee-id","Amount","Status") values (%L,%L,%L,1000,%L)', pg_temp.c('b1'), pg_temp.c('C'), pg_temp.c('H'), 'Paid'), 'ERR 42501: permission denied for table Payments');
select pg_temp.try('9c call provider result function', format('select public.qareeb_record_provider_payment(gen_random_uuid(), %L, %L, 1000, %L, true)', 'testpay', 'FAKE', 'PKR'), 'ERR 42501: permission denied for function qareeb_record_provider_payment');
select pg_temp.try('9d confirm own cash as payer', format('select public.qareeb_confirm_cash_received(%L)', pg_temp.c('b1')), 'ERR 42501: Payment not found');
select pg_temp.try('9e pay online without provider', format('select public.qareeb_choose_payment_method(%L, %L)', pg_temp.c('b1'), 'JazzCash'), 'ERR 42501: Online payments are not available yet. Please pay in cash.');
reset role;
insert into r(test, expected, result) select '9 payment still due', 'Due', "Status" from public."Payments" where "ID" = pg_temp.c('p1');

-- 13. duplicate provider callback (server, after signature check)
set local role service_role;
select * from public.qareeb_start_online_payment(pg_temp.c('C'), pg_temp.c('b1'), 'JazzCash', 'testpay');
reset role;
insert into ctx select 'a1', "ID" from public."Payment-attempts" where "Payment-id" = pg_temp.c('p1');
set local role service_role;
select pg_temp.try('13a first callback', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1000, %L, true)', pg_temp.c('a1'), 'testpay', 'SCN-1', 'PKR'), 'OK rows=1');
select pg_temp.try('13b same callback again', format('select public.qareeb_record_provider_payment(%L, %L, %L, 1000, %L, true)', pg_temp.c('a1'), 'testpay', 'SCN-1', 'PKR'), 'OK rows=1');
select pg_temp.try('13c replay against another attempt', format('select public.qareeb_record_provider_payment(gen_random_uuid(), %L, %L, 1000, %L, true)', 'testpay', 'SCN-1', 'PKR'), 'ERR P0002: Payment attempt not found');
reset role;
insert into r(test, expected, result) select '13 ledger entries for payment', '1 (Earning 1000)', count(*) || ' (' || coalesce(string_agg("Type" || ' ' || "Amount", ', '), '') || ')' from public."Transactions" where "Payment-id" = pg_temp.c('p1');
insert into r(test, expected, result) select '13 helper balance = ledger', 'true balance=1000', (w."Balance" = (select coalesce(sum("Amount"), 0) from public."Transactions" t where t."Wallet-id" = w."ID" and t."Status" = 'Completed'))::text || ' balance=' || w."Balance" from public."Wallets" w where w."User-id" = pg_temp.c('H');

-- 14. duplicate transaction
set local role service_role;
select pg_temp.try('14a re-post the earning', format('insert into public."Transactions"("User-id","Type","Amount","Status","Idempotency-key") values (%L,%L,1000,%L,%L)', pg_temp.c('H'), 'Earning', 'Completed', 'payment:' || pg_temp.c('p1') || ':earning'), 'ERR 23505: duplicate key value violates unique constraint "Transactions_Idempotency-key_key"');
reset role;

-- 10. modify transaction history
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('10a helper inflates own earning', 'update public."Transactions" set "Amount" = 99999', 'ERR 42501: permission denied for table Transactions');
select pg_temp.try('10b helper deletes a payout record', 'delete from public."Transactions"', 'ERR 42501: permission denied for table Transactions');
reset role; set local role service_role;
select pg_temp.try('10c server edits completed entry', format('update public."Transactions" set "Amount" = 1 where "Payment-id" = %L', pg_temp.c('p1')), 'ERR 42501: Completed or failed wallet transactions cannot be changed');
select pg_temp.try('10d server deletes entry', format('delete from public."Transactions" where "Payment-id" = %L', pg_temp.c('p1')), 'ERR 42501: Wallet transactions cannot be deleted');
reset role;

-- 11. another user's notifications
select pg_temp.as_user(pg_temp.c('H2'));
select pg_temp.try('11a read others notifications', 'select 1 from public."Notifications" where "User-id" <> auth.uid()', 'OK rows=0');
-- the function returns one row (a count); the next check shows C's notifications were untouched
select pg_temp.try('11b mark others notifications read', 'select public.qareeb_mark_notifications_read(null)', 'OK rows=1');
reset role;
insert into r(test, expected, result) select '11 C notifications untouched', 'true', (count(*) filter (where "Read-at" is null) > 0)::text from public."Notifications" where "User-id" = pg_temp.c('C') and "Booking-id" = pg_temp.c('b1');

-- 12. protected CNIC data
select pg_temp.as_user(pg_temp.c('H2'));
select pg_temp.try('12a list all CNIC files', format('select 1 from storage.objects where bucket_id = %L', 'cnic-verifications'), 'OK rows=0');
select pg_temp.try('12b read customer CNIC status via profile', format('select 1 from public."Profiles" where "ID" = %L', pg_temp.c('C')), 'OK rows=0');

-- 15. invalid booking status transitions
reset role;
insert into ctx select 'b3', pg_temp.book_job('scenario job 3', 500);
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('15a pending -> completed', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Completed', pg_temp.c('b3')), 'ERR 42501: Booking status cannot change from "Pending" to "Completed"');
select pg_temp.try('15b pending -> in-progress', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'In-progress', pg_temp.c('b3')), 'ERR 42501: Booking status cannot change from "Pending" to "In-progress"');
select pg_temp.try('15c completed -> pending', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Pending', pg_temp.c('b1')), 'ERR 42501: Booking status cannot change from "Completed" to "Pending"');
select pg_temp.try('15d unknown status', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Paid', pg_temp.c('b3')), 'ERR 42501: Booking status cannot change from "Pending" to "Paid"');
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('15e customer rejects own request', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Rejected', pg_temp.c('b3')), 'ERR 42501: Booking status cannot change from "Pending" to "Rejected"');
select pg_temp.try('15f customer cancels completed job', format('update public."Bookings" set "Status" = %L where "ID" = %L', 'Cancelled', pg_temp.c('b1')), 'ERR 42501: Booking status cannot change from "Completed" to "Cancelled"');

-- 16. reviews
select pg_temp.try('16a customer reviews pending job', format('insert into public."Reviews"("Booking-id","Rating") values (%L, 5)', pg_temp.c('b3')), 'ERR 42501: Reviews can only be left for completed bookings');
select pg_temp.try('16b customer reviews completed job', format('insert into public."Reviews"("Booking-id","Rating","Comment") values (%L, 4, %L)', pg_temp.c('b1'), 'Good'), 'OK rows=1');
select pg_temp.try('16c customer reviews twice', format('insert into public."Reviews"("Booking-id","Rating") values (%L, 1)', pg_temp.c('b1')), 'ERR 23505: duplicate key value violates unique constraint "Reviews_one_per_booking_reviewer"');
select pg_temp.try('16d customer redirects review to H2', format('update public."Reviews" set "Reviewee-id" = %L where "Booking-id" = %L', pg_temp.c('H2'), pg_temp.c('b1')), 'ERR 42501: Only the rating and comment of a review can be changed');
select pg_temp.try('16e customer deletes review', format('delete from public."Reviews" where "Booking-id" = %L', pg_temp.c('b1')), 'OK rows=0');
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('16f helper rewrites customer review', format('update public."Reviews" set "Rating" = 5 where "Booking-id" = %L and "Reviewer-id" = %L', pg_temp.c('b1'), pg_temp.c('C')), 'OK rows=0');
select pg_temp.as_user(pg_temp.c('H2'));
select pg_temp.try('16g outsider reviews the job', format('insert into public."Reviews"("Booking-id","Rating") values (%L, 1)', pg_temp.c('b1')), 'ERR 42501: You can only review bookings you took part in');
select pg_temp.try('16h outsider edits the review', format('update public."Reviews" set "Rating" = 1 where "Booking-id" = %L', pg_temp.c('b1')), 'OK rows=0');
reset role;
insert into r(test, expected, result) select '16 review after', '4 reviewee_is_H=true', "Rating" || ' reviewee_is_H=' || ("Reviewee-id" = pg_temp.c('H')) from public."Reviews" where "Booking-id" = pg_temp.c('b1') and "Reviewer-id" = pg_temp.c('C');
