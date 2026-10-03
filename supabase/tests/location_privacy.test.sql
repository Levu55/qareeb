-- Location privacy: helper search returns whole-kilometre distances only, so a user
-- cannot pinpoint a helper by probing from several points; a finished booking shows no
-- precise distance either.
-- @fixtures
-- @checks: 4

update public."Helpers" set "Latitude" = 33.7295, "Longitude" = 73.0746, "Location-updated-at" = now(), "Is-available" = true
  where "ID" = pg_temp.c('H');
select pg_temp.as_user(pg_temp.c('X'));
insert into r(test, expected, result) select 'probe A (no task needed)', '4', distance_km::text from public.qareeb_find_helpers('cleaning', false, 33.70, 73.05) where helper_id = pg_temp.c('H');
insert into r(test, expected, result) select 'probe B', '4', distance_km::text from public.qareeb_find_helpers('cleaning', false, 33.75, 73.05) where helper_id = pg_temp.c('H');
insert into r(test, expected, result) select 'probe C', '3', distance_km::text from public.qareeb_find_helpers('cleaning', false, 33.72, 73.10) where helper_id = pg_temp.c('H');
-- the original suite used a real completed booking; this one is completed here
reset role;
insert into ctx select 'done', pg_temp.complete_job('location privacy job', 1000);
select pg_temp.as_user(pg_temp.c('C'));
insert into r(test, expected, result) select 'customer: completed booking distance', 'null', coalesce(helper_distance_km::text, 'null') from public.qareeb_my_bookings() where booking_id = pg_temp.c('done');
reset role;
