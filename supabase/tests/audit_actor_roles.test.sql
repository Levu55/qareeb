-- Audit log records who made a helper change: an admin session or a direct SQL session.
-- Service-role changes are not logged by the trigger: review-cnic writes its own entry
-- for each CNIC decision.
-- @fixtures
-- @checks: 1

select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
update public."Helpers" set "Verify-status" = 'Pending' where "ID" = pg_temp.c('H');
reset role;
select pg_temp.as_user(pg_temp.c('A'));
update public."Helpers" set "Verify-status" = 'Approved' where "ID" = pg_temp.c('H');
reset role;
select set_config('request.jwt.claims', '', true);
update public."Helpers" set "Is-female" = true where "ID" = pg_temp.c('H');
insert into r(test, expected, result) select 'new log', 'admin {"verify_status": {"to": "Approved", "from": "Pending"}} | database {"is_female": {"to": true, "from": false}}', string_agg("Actor-role" || ' ' || "Details"::text, ' | ' order by "Actor-role") from public."Admin-logs" where "Created-at" = now();
