-- Booking state-machine edge cases: cancelled tasks, one active job per helper,
-- revoked helpers, service matching, women-only tasks and repricing during a request.
-- @fixtures
-- @checks: 19

update public."Helpers" set "Verify-status" = 'Approved', "Is-available" = true, "Is-female" = false where "ID" = pg_temp.c('H');

select pg_temp.as_user(pg_temp.c('C'));
insert into public."Tasks"("Title","Price","Category") values ('gapA',1000,'cleaning'), ('gapB1',1000,'cleaning'), ('gapB2',1000,'cleaning'), ('gapC',1000,'cleaning'), ('gapE',1000,'tutoring');
insert into public."Tasks"("Title","Price","Category","Female-only") values ('gapF',1000,'cleaning',true);
insert into ctx select "Title", "ID" from public."Tasks" where "Title" like 'gap%' and "User-id" = pg_temp.c('C');
select pg_temp.try('book A', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('gapA'), pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('book B1', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('gapB1'), pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('book B2', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('gapB2'), pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('book C', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('gapC'), pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('E: book helper for a service they do not offer (tutoring)', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('gapE'), pg_temp.c('H')), 'ERR 42501: This helper does not offer this service');
select pg_temp.try('F: book male helper for female-only task', format('insert into public."Bookings"("Task-id","Helper-id") values (%L, %L)', pg_temp.c('gapF'), pg_temp.c('H')), 'ERR 42501: This task is for female helpers only');

-- D: customer edits price of an Open task that has a Pending booking
select pg_temp.try('D: customer changes price while booking pending', format('update public."Tasks" set "Price" = 5 where "ID" = %L', pg_temp.c('gapB1')), 'ERR 42501: This task has an active booking. Cancel the booking before changing the task.');
-- A: customer cancels the Open task while its booking is Pending, then helper accepts
select pg_temp.try('A1: customer cancels task with pending booking', format('update public."Tasks" set "Status" = %L where "ID" = %L', 'Cancelled', pg_temp.c('gapA')), 'ERR 42501: This task has an active booking. Cancel the booking before changing the task.');
select pg_temp.as_user(pg_temp.c('H'));
-- the cancellation above was refused, so the task is still open and accepting is allowed
select pg_temp.try('A2: helper accepts booking of a cancelled task', format('update public."Bookings" set "Status" = %L where "Task-id" = %L', 'Accepted', pg_temp.c('gapA')), 'OK rows=1');
-- B: helper accepts two jobs at once
select pg_temp.try('B1: helper accepts job 1', format('update public."Bookings" set "Status" = %L where "Task-id" = %L', 'Accepted', pg_temp.c('gapB1')), 'ERR 23505: duplicate key value violates unique constraint "Bookings_one_active_job_per_helper"');
select pg_temp.try('B2: helper accepts job 2 at the same time', format('update public."Bookings" set "Status" = %L where "Task-id" = %L', 'Accepted', pg_temp.c('gapB2')), 'ERR 23505: duplicate key value violates unique constraint "Bookings_one_active_job_per_helper"');
-- C: helper approval revoked, then helper accepts
reset role;
update public."Helpers" set "Verify-status" = 'Rejected' where "ID" = pg_temp.c('H');
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('C: rejected helper accepts a pending booking', format('update public."Bookings" set "Status" = %L where "Task-id" = %L', 'Accepted', pg_temp.c('gapC')), 'ERR 42501: Your helper verification is not approved, so you cannot take this job');
-- gapA is the job H accepted above (one active job per helper keeps B1 pending)
select pg_temp.try('C2: rejected helper progresses an accepted job', format('update public."Bookings" set "Status" = %L where "Task-id" = %L', 'On-the-way', pg_temp.c('gapA')), 'ERR 42501: Your helper verification is not approved, so you cannot take this job');
reset role;
insert into r(test, expected, result) select 'state ' || t."Title",
  case t."Title" when 'gapA' then 'task=Assigned booking=Accepted' when 'gapE' then 'task=Open booking=-' when 'gapF' then 'task=Open booking=-' else 'task=Open booking=Pending' end,
  'task=' || t."Status" || ' booking=' || coalesce(b."Status", '-')
  from public."Tasks" t left join public."Bookings" b on b."Task-id" = t."ID" where t."Title" like 'gap%' and t."User-id" = pg_temp.c('C') order by t."Title";
