-- Payment and cancellation notifications, and Notifications privacy.
-- @fixtures
-- @checks: 17

create or replace function pg_temp.notes(b uuid) returns text language sql as $$
  select coalesce(string_agg("Type" || '->' || case "User-id" when pg_temp.c('C') then 'C' when pg_temp.c('H') then 'H' else '?' end
    || ': ' || "Body", ' | ' order by "Created-at", "Type", "User-id"), '(none)')
  from public."Notifications" where "Booking-id" = b and "Type" not in ('booking_request','booking_accepted','booking_on_the_way','booking_arrived','booking_in_progress','booking_completed');
$$;

-- online payment succeeds
insert into ctx select 'b1', pg_temp.complete_job('notify online', 1000);
set local role service_role;
select * from public.qareeb_start_online_payment(pg_temp.c('C'), pg_temp.c('b1'), 'JazzCash', 'testpay');
reset role;
insert into ctx select 'a1', "ID" from public."Payment-attempts" where "Payment-id" = (select "ID" from public."Payments" where "Booking-id" = pg_temp.c('b1'));
set local role service_role;
select public.qareeb_record_provider_payment(pg_temp.c('a1'), 'testpay', 'N-1', 1000, 'PKR', true);
reset role;
insert into r(test, expected, result) select 'online paid',
  'payment_confirmed->C: Your payment of Rs. 1000 was confirmed. | payment_received->H: Rs. 1000 was paid online and added to your wallet.',
  pg_temp.notes(pg_temp.c('b1'));

-- online payment declined, then a provider payment with the wrong amount
insert into ctx select 'b2', pg_temp.complete_job('notify failed', 900);
set local role service_role;
select * from public.qareeb_start_online_payment(pg_temp.c('C'), pg_temp.c('b2'), 'Easypaisa', 'testpay');
reset role;
insert into ctx select 'a2', "ID" from public."Payment-attempts" where "Payment-id" = (select "ID" from public."Payments" where "Booking-id" = pg_temp.c('b2'));
set local role service_role;
select public.qareeb_record_provider_payment(pg_temp.c('a2'), 'testpay', 'N-2', 900, 'PKR', false, 'Customer cancelled');
select * from public.qareeb_start_online_payment(pg_temp.c('C'), pg_temp.c('b2'), 'Easypaisa', 'testpay');
reset role;
insert into ctx select 'a3', "ID" from public."Payment-attempts" where "Payment-id" = (select "ID" from public."Payments" where "Booking-id" = pg_temp.c('b2')) and "Status" = 'Initiated';
set local role service_role;
select public.qareeb_record_provider_payment(pg_temp.c('a3'), 'testpay', 'N-3', 90, 'PKR', true);
reset role;
insert into r(test, expected, result) select 'declined + needs review',
  'payment_failed->C: Your online payment of Rs. 900 did not go through. Please try again or pay in cash. | payment_review->C: Your Easypaisa payment for this job could not be applied automatically. Our team will check it and refund you if needed.',
  pg_temp.notes(pg_temp.c('b2'));

-- cancellations: by the customer, and by an admin
insert into ctx select 'b3', pg_temp.book_job('notify customer cancel', 500);
select pg_temp.as_user(pg_temp.c('C'));
update public."Bookings" set "Status" = 'Cancelled' where "ID" = pg_temp.c('b3');
reset role;
insert into r(test, expected, result) select 'customer cancels', 'booking_cancelled->H: Test Customer cancelled "notify customer cancel".', pg_temp.notes(pg_temp.c('b3'));
insert into ctx select 'b4', pg_temp.book_job('notify admin cancel', 500);
select pg_temp.as_user(pg_temp.c('A'));
update public."Bookings" set "Status" = 'Cancelled' where "ID" = pg_temp.c('b4');
reset role;
insert into r(test, expected, result) select 'admin cancels',
  'booking_cancelled->H: "notify admin cancel" was cancelled by Qareeb support. | booking_cancelled->C: Your booking for "notify admin cancel" was cancelled by Qareeb support.',
  pg_temp.notes(pg_temp.c('b4'));

-- CNIC decision notification as written by review-cnic (service role)
set local role service_role;
select pg_temp.try('svc writes CNIC notification', format('insert into public."Notifications"("User-id","Type","Title","Body") values (%L,%L,%L,%L)', pg_temp.c('C'), 'cnic_approved', 'CNIC verified', 'Your CNIC was approved.'), 'OK rows=1');
reset role;

-- privacy
insert into ctx select 'hn', "ID" from public."Notifications" where "User-id" = pg_temp.c('H') order by "Created-at" desc limit 1;
select pg_temp.as_user(pg_temp.c('C'));
select pg_temp.try('C reads H notifications', format('select 1 from public."Notifications" where "User-id" = %L', pg_temp.c('H')), 'OK rows=0');
select pg_temp.try('C reads H notification by id', format('select 1 from public."Notifications" where "ID" = %L', pg_temp.c('hn')), 'OK rows=0');
-- the function returns one row (a count); the next check shows nothing was marked
select pg_temp.try('C marks H notification read', format('select public.qareeb_mark_notifications_read(array[%L]::uuid[])', pg_temp.c('hn')), 'OK rows=1');
select pg_temp.try('C edits own notification', 'update public."Notifications" set "Body" = ''x''', 'ERR 42501: permission denied for table Notifications');
select pg_temp.try('C deletes own notification', 'delete from public."Notifications"', 'ERR 42501: permission denied for table Notifications');
select pg_temp.try('C creates notification for H', format('insert into public."Notifications"("User-id","Type","Title") values (%L,%L,%L)', pg_temp.c('H'), 'booking_accepted', 'fake'), 'ERR 42501: permission denied for table Notifications');
select pg_temp.as_user(pg_temp.c('A'));
select pg_temp.try('admin reads H notifications', format('select 1 from public."Notifications" where "User-id" = %L', pg_temp.c('H')), 'OK rows=0');
reset role;
insert into r(test, expected, result) select 'H notification still unread', 'true', ("Read-at" is null)::text from public."Notifications" where "ID" = pg_temp.c('hn');
select pg_temp.as_user(pg_temp.c('H'));
-- 4 booking requests, 1 online payment received, 2 cancellations
select pg_temp.try('H reads own notifications', 'select 1 from public."Notifications"', 'OK rows=7');
select pg_temp.try('H marks own read', format('select public.qareeb_mark_notifications_read(array[%L]::uuid[])', pg_temp.c('hn')), 'OK rows=1');
reset role;
insert into r(test, expected, result) select 'H notification read', 'true', ("Read-at" is not null)::text from public."Notifications" where "ID" = pg_temp.c('hn');
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select pg_temp.try('anon reads notifications', 'select 1 from public."Notifications"', 'OK rows=0');
reset role;
