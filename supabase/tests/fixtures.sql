-- Shared test users, included by test files that start with "-- @fixtures".
-- They exist only inside the rolled-back test transaction; no real account is used or changed.
--   C = customer (CNIC approved through the JWT claim)
--   H = approved, available cleaning helper (not female)
--   A = admin
--   X = an id with no account at all (a stranger)
insert into ctx values
  ('C', 'cccccccc-0000-4000-8000-000000000001'),
  ('H', 'bbbbbbbb-0000-4000-8000-000000000001'),
  ('A', 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('X', '00000000-0000-0000-0000-000000000001');

insert into auth.users (id, aud, role, phone) values
  (pg_temp.c('C'), 'authenticated', 'authenticated', '920000000101'),
  (pg_temp.c('H'), 'authenticated', 'authenticated', '920000000102'),
  (pg_temp.c('A'), 'authenticated', 'authenticated', '920000000103');
insert into public."Profiles" ("ID", "Full-name", "Phone", "Role") values
  (pg_temp.c('C'), 'Test Customer', '+920000000101', 'user'),
  (pg_temp.c('H'), 'Test Helper', '+920000000102', 'helper'),
  (pg_temp.c('A'), 'Test Admin', '+920000000103', 'admin');
insert into public."Helpers" ("ID", "User-id", "Verify-status", "Is-available", "Categories", "Is-female") values
  (pg_temp.c('H'), pg_temp.c('H'), 'Approved', true, array['cleaning'], false);

-- Wallets are created by the database for every new profile
insert into ctx select 'HW', "ID" from public."Wallets" where "User-id" = pg_temp.c('H');
insert into ctx select 'CW', "ID" from public."Wallets" where "User-id" = pg_temp.c('C');

-- One uploaded CNIC photo each for C and H (storage metadata only)
insert into storage.objects (bucket_id, name, owner_id) values
  ('cnic-verifications', pg_temp.c('C') || '/front_1.jpg', pg_temp.c('C')),
  ('cnic-verifications', pg_temp.c('H') || '/front_1.jpg', pg_temp.c('H'));

-- Customer posts a task and books H; returns the booking id (status Pending)
create or replace function pg_temp.book_job(title text, price numeric) returns uuid language plpgsql as $$
declare t uuid; b uuid;
begin
  perform pg_temp.as_user(pg_temp.c('C'));
  insert into public."Tasks"("Title","Price","Category") values (title, price, 'cleaning') returning "ID" into t;
  insert into public."Bookings"("Task-id","Helper-id") values (t, pg_temp.c('H')) returning "ID" into b;
  perform set_config('role', 'none', true);
  return b;
end $$;

-- book_job, then H runs it through every step to Completed
create or replace function pg_temp.complete_job(title text, price numeric) returns uuid language plpgsql as $$
declare b uuid := pg_temp.book_job(title, price);
begin
  perform pg_temp.as_user(pg_temp.c('H'));
  update public."Bookings" set "Status" = 'Accepted' where "ID" = b;
  update public."Bookings" set "Status" = 'On-the-way' where "ID" = b;
  update public."Bookings" set "Status" = 'Arrived' where "ID" = b;
  update public."Bookings" set "Status" = 'In-progress' where "ID" = b;
  update public."Bookings" set "Status" = 'Completed' where "ID" = b;
  perform set_config('role', 'none', true);
  return b;
end $$;
