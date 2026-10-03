-- Booking chat and notifications through a booking lifecycle: only the two parties can
-- read or write messages, messages are immutable, chat closes on cancellation, and
-- notifications are created by the database, not by clients.
-- @fixtures
-- @checks: 21

select pg_temp.as_user(pg_temp.c('C'));
insert into public."Tasks"("Title","Price","Category") values ('msgtest', 1000, 'cleaning');
insert into ctx select 't', "ID" from public."Tasks" where "Title" = 'msgtest' and "User-id" = pg_temp.c('C');
insert into public."Bookings"("Task-id","Helper-id") values (pg_temp.c('t'), pg_temp.c('H'));
insert into ctx select 'b', "ID" from public."Bookings" where "Task-id" = pg_temp.c('t');
select pg_temp.try('customer messages helper', format('insert into public."Messages"("Booking-id","Body") values (%L, %L)', pg_temp.c('b'), 'Hello, please bring gloves'), 'OK rows=1');
select pg_temp.try('customer spoofs sender', format('insert into public."Messages"("Booking-id","Body","Sender-id") values (%L, %L, %L)', pg_temp.c('b'), 'fake', pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('empty message', format('insert into public."Messages"("Booking-id","Body") values (%L, %L)', pg_temp.c('b'), '   '), 'ERR 23514');
reset role;
insert into r(test, expected, result) select 'spoofed message stored as sent by the customer', 'true', ("Sender-id" = pg_temp.c('C'))::text from public."Messages" where "Booking-id" = pg_temp.c('b') and "Body" = 'fake';
select pg_temp.as_user(pg_temp.c('X'));
select pg_temp.try('stranger reads messages', format('select 1 from public."Messages" where "Booking-id" = %L', pg_temp.c('b')), 'OK rows=0');
select pg_temp.try('stranger posts message', format('insert into public."Messages"("Booking-id","Body") values (%L, %L)', pg_temp.c('b'), 'hi'), 'ERR 42501: new row violates row-level security policy for table "Messages"');
select pg_temp.try('stranger reads notifications', 'select 1 from public."Notifications"', 'OK rows=0');
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('helper reads messages', format('select 1 from public."Messages" where "Booking-id" = %L', pg_temp.c('b')), 'OK rows=2');
select pg_temp.try('helper edits customer message', format('update public."Messages" set "Body" = %L where "Booking-id" = %L', 'edited', pg_temp.c('b')), 'ERR 42501: permission denied for table Messages');
select pg_temp.try('helper deletes messages', format('delete from public."Messages" where "Booking-id" = %L', pg_temp.c('b')), 'ERR 42501: permission denied for table Messages');
select pg_temp.try('helper marks read', format('select public.qareeb_mark_messages_read(%L)', pg_temp.c('b')), 'OK rows=1');
select pg_temp.try('helper inserts a notification', format('insert into public."Notifications"("User-id","Type","Title") values (%L,''fake'',''fake'')', pg_temp.c('C')), 'ERR 42501: permission denied for table Notifications');
select pg_temp.try('helper calls notify', format('select public.qareeb_notify(%L,''fake'',''x'',null,null)', pg_temp.c('C')), 'ERR 42501: permission denied for function qareeb_notify');
update public."Bookings" set "Status" = 'Accepted' where "ID" = pg_temp.c('b');
update public."Bookings" set "Status" = 'On-the-way' where "ID" = pg_temp.c('b');
update public."Bookings" set "Status" = 'Arrived' where "ID" = pg_temp.c('b');
update public."Bookings" set "Status" = 'In-progress' where "ID" = pg_temp.c('b');
update public."Bookings" set "Status" = 'Completed' where "ID" = pg_temp.c('b');
select pg_temp.try('helper messages after completion', format('insert into public."Messages"("Booking-id","Body") values (%L, %L)', pg_temp.c('b'), 'Thanks!'), 'OK rows=1');
insert into r(test, expected, result) select 'helper notif', 'booking_request: Test Customer requested you for "msgtest". | message: Hello, please bring gloves | message: fake', string_agg("Type" || ': ' || coalesce("Body", ''), ' | ' order by "Created-at", "Type") from public."Notifications" where "Booking-id" = pg_temp.c('b');
select pg_temp.as_user(pg_temp.c('C'));
select public.qareeb_choose_payment_method(pg_temp.c('b'), 'Cash');
insert into r(test, expected, result) select 'customer notif', 'booking_accepted: Test Helper accepted "msgtest". | booking_arrived: Test Helper has arrived. | booking_completed: "msgtest" is done. Please pay and rate Test Helper. | booking_in_progress: Test Helper started working on "msgtest". | booking_on_the_way: Test Helper is on the way. | message: Thanks!', string_agg("Type" || ': ' || coalesce("Body", ''), ' | ' order by "Created-at", "Type") from public."Notifications" where "Booking-id" = pg_temp.c('b');
select pg_temp.try('customer marks notifications read', 'select public.qareeb_mark_notifications_read()', 'OK rows=1');
select pg_temp.try('customer edits notification', 'update public."Notifications" set "Title" = ''x''', 'ERR 42501: permission denied for table Notifications');
reset role;
insert into r(test, expected, result) select 'message read state', 'fake read=true | Hello, please bring gloves read=true | Thanks! read=false', string_agg("Body" || ' read=' || ("Read-at" is not null), ' | ' order by "Created-at", "Body") from public."Messages" where "Booking-id" = pg_temp.c('b');
-- cancelled booking: chat closed
select pg_temp.as_user(pg_temp.c('C'));
insert into public."Tasks"("Title","Price","Category") values ('msgtest2', 1000, 'cleaning');
insert into ctx select 't2', "ID" from public."Tasks" where "Title" = 'msgtest2' and "User-id" = pg_temp.c('C');
insert into public."Bookings"("Task-id","Helper-id") values (pg_temp.c('t2'), pg_temp.c('H'));
insert into ctx select 'b2', "ID" from public."Bookings" where "Task-id" = pg_temp.c('t2');
update public."Bookings" set "Status" = 'Cancelled' where "ID" = pg_temp.c('b2');
select pg_temp.try('message on cancelled booking', format('insert into public."Messages"("Booking-id","Body") values (%L, %L)', pg_temp.c('b2'), 'hello?'), 'ERR 42501: new row violates row-level security policy for table "Messages"');
reset role;
insert into r(test, expected, result) select 'helper got cancel notice', '1', count(*)::text from public."Notifications" where "Booking-id" = pg_temp.c('b2') and "Type" = 'booking_cancelled';
