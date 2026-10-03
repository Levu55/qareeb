-- Shared test harness, included at the top of every test file by run.mjs.
-- Everything runs inside one transaction that the runner always rolls back.

-- One row per check. "expected" is either an exact value, or "ERR <sqlstate>[: message]",
-- which passes when the recorded error starts with that text.
create temp table r (n serial, test text not null, expected text, result text);
grant all on r to authenticated, anon, service_role;
grant all on r_n_seq to authenticated, anon, service_role;

-- Named ids shared between steps (fixture users, tasks, bookings, ...)
create temp table ctx (k text primary key, v uuid);
grant all on ctx to authenticated, service_role;

-- Impersonate a user exactly like PostgREST: role authenticated + JWT claims
create or replace function pg_temp.as_user(uid uuid, cnic text default 'approved') returns void language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated',
    'app_metadata', json_build_object('cnic_status', cnic))::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Run one statement as the current role and record "OK rows=N" or "ERR <sqlstate>: <message>"
create or replace function pg_temp.try(label text, q text, expected text) returns void language plpgsql as $$
declare n int;
begin
  execute q;
  get diagnostics n = row_count;
  insert into r(test, expected, result) values (label, expected, 'OK rows=' || n);
exception when others then
  insert into r(test, expected, result) values (label, expected, 'ERR ' || sqlstate || ': ' || left(sqlerrm, 110));
end $$;

create or replace function pg_temp.c(key text) returns uuid language sql as $$ select v from ctx where k = key $$;
grant execute on function pg_temp.c(text) to authenticated;
