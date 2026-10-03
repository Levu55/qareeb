-- Audit log: admin actions through the API are logged, participant actions are not,
-- and nobody (normal users, admins, the service role) can read, forge, edit or delete
-- entries they should not.
-- @fixtures
-- @checks: 15

-- setup: a completed job that the customer reviewed
insert into ctx select 'b1', pg_temp.complete_job('audit job', 900);
select pg_temp.as_user(pg_temp.c('C'));
insert into public."Reviews"("Booking-id","Rating","Comment") values (pg_temp.c('b1'), 4, 'Good work');
reset role;

-- admin actions through the API
select pg_temp.as_user(pg_temp.c('A'));
select pg_temp.try('admin revokes helper via API', format('update public."Helpers" set "Verify-status" = ''Pending'' where "ID" = %L', pg_temp.c('H')), 'OK rows=1');
select pg_temp.try('admin edits a customer review', format('update public."Reviews" set "Comment" = ''edited by admin'' where "Reviewer-id" = %L', pg_temp.c('C')), 'OK rows=1');
select pg_temp.try('admin changes setting', 'update public."Settings" set "Value" = ''2000'' where "Key" = ''digital_payment_threshold''', 'OK rows=1');
select pg_temp.try('admin reads stats', 'select 1 from public.qareeb_admin_stats()', 'OK rows=1');
-- the figures depend on real data, so only the shape is checked
insert into r(test, expected, result) select 'stats fields', 'bookings_active,bookings_completed_today,customers,helpers_approved,helpers_pending,job_value_completed_today,payments_open,payments_paid_today', string_agg(k, ',' order by k) from (select json_object_keys(row_to_json(s)) k from public.qareeb_admin_stats() s) x;
reset role;
-- role change (as postgres, e.g. SQL editor: no JWT claims in the session)
select set_config('request.jwt.claims', '', true);
update public."Profiles" set "Role" = 'admin' where "ID" = pg_temp.c('C');
-- participant action by an admin-role account (not an admin override)
select pg_temp.as_user(pg_temp.c('C'), 'approved');
select pg_temp.try('customer edits own review', format('update public."Reviews" set "Comment" = ''mine'' where "Reviewer-id" = %L', pg_temp.c('C')), 'OK rows=1');
reset role;
select set_config('request.jwt.claims', '', true);
update public."Profiles" set "Role" = 'user' where "ID" = pg_temp.c('C');
insert into r(test, expected, result) select 'audit entries written in this test', 'helper.verification_changed [admin] | profile.role_changed [database] | profile.role_changed [database] | review.admin_update [admin] | setting.changed [admin]',
  string_agg("Action" || ' [' || "Actor-role" || ']', ' | ' order by "Action", "Actor-role") from public."Admin-logs" where "Created-at" >= now();

-- non-admin access
select pg_temp.as_user(pg_temp.c('H'));
select pg_temp.try('helper reads logs', 'select 1 from public."Admin-logs"', 'OK rows=0');
select pg_temp.try('helper writes log', 'insert into public."Admin-logs"("Actor-role","Action") values (''admin'',''fake.entry'')', 'ERR 42501: permission denied for table Admin-logs');
select pg_temp.try('helper calls admin stats', 'select 1 from public.qareeb_admin_stats()', 'ERR 42501: Admins only');
select pg_temp.try('helper calls log writer', 'select public.qareeb_write_admin_log(''fake.entry'', null, null, null)', 'ERR 42501: permission denied for function qareeb_write_admin_log');
-- admin cannot alter entries
select pg_temp.as_user(pg_temp.c('A'));
select pg_temp.try('admin reads logs', 'select 1 from public."Admin-logs" where "Created-at" >= now()', 'OK rows=5');
select pg_temp.try('admin deletes logs', 'delete from public."Admin-logs"', 'ERR 42501: permission denied for table Admin-logs');
reset role;
set local role service_role;
select pg_temp.try('service role deletes logs', 'delete from public."Admin-logs"', 'ERR 42501: Admin log entries cannot be changed or deleted');
select pg_temp.try('service role edits logs', 'update public."Admin-logs" set "Action" = ''x.y''', 'ERR 42501: Admin log entries cannot be changed or deleted');
reset role;
