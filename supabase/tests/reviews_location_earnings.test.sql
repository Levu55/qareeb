-- Reviews (one per participant per completed booking, ratings recalculated), distances
-- and tracking, database-stamped completion time and helper earnings. Uses its own test users.
-- @checks: 30
create temp table _ids(k text primary key, v uuid) on commit drop;
grant select, insert on _ids to authenticated, anon;

-- fixtures. Task location: F-7 Islamabad (33.7215, 73.0433)
-- H1 ~1.1 km away (fresh), H2 ~14 km away Rawalpindi (fresh), H3 fresh position but 2 days old (stale)
insert into auth.users (id, aud, role) values
  ('c1c1c1c1-0000-4000-8000-000000000001','authenticated','authenticated'),('c2c2c2c2-0000-4000-8000-000000000002','authenticated','authenticated'),
  ('b1b1b1b1-0000-4000-8000-000000000001','authenticated','authenticated'),('b2b2b2b2-0000-4000-8000-000000000002','authenticated','authenticated'),
  ('b3b3b3b3-0000-4000-8000-000000000003','authenticated','authenticated'),('a1a1a1a1-0000-4000-8000-000000000009','authenticated','authenticated');
insert into "Profiles"("ID","Full-name","Role") values
  ('c1c1c1c1-0000-4000-8000-000000000001','Cust One','user'),('c2c2c2c2-0000-4000-8000-000000000002','Cust Two','user'),
  ('b1b1b1b1-0000-4000-8000-000000000001','Near Helper','helper'),('b2b2b2b2-0000-4000-8000-000000000002','Far Helper','helper'),
  ('b3b3b3b3-0000-4000-8000-000000000003','Stale Helper','helper'),('a1a1a1a1-0000-4000-8000-000000000009','Admin','admin');
insert into "Helpers"("ID","User-id","Verify-status","Is-available","Categories","Latitude","Longitude","Location-updated-at") values
  ('b1b1b1b1-0000-4000-8000-000000000001','b1b1b1b1-0000-4000-8000-000000000001','Approved',true,'{plumbing}',33.7300,73.0500,now()),
  ('b2b2b2b2-0000-4000-8000-000000000002','b2b2b2b2-0000-4000-8000-000000000002','Approved',true,'{plumbing}',33.6007,73.0679,now()),
  ('b3b3b3b3-0000-4000-8000-000000000003','b3b3b3b3-0000-4000-8000-000000000003','Approved',true,'{plumbing}',33.7215,73.0433,now() - interval '2 days');

-- ===== C1 posts a located task; helper search by distance =====
-- Searches are scoped to this suite's helpers (ids ...-0000-4000-8000-...) so real helpers do not
-- change the results. Listings and pending requests show whole kilometres, rounded up
-- (20260930120300_location_privacy); the precise distance only while the helper travels.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1c1c1c1-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"cnic_status":"approved"}}',true);
do $$ declare v text; t uuid; t2 uuid; b uuid; b2 uuid; begin
  insert into "Tasks"("Title","Price","Category","Location","Latitude","Longitude") values ('Fix pipe',1500,'plumbing','F-7, Islamabad',33.7215,73.0433) returning "ID" into t;
  insert into "Tasks"("Title","Price","Category","Location") values ('Second job',900,'plumbing','Unlocated') returning "ID" into t2;
  select string_agg(full_name || ':' || coalesce(distance_km::text,'null'), ', ' order by distance_km nulls last) into v
    from public.qareeb_find_helpers('plumbing', false, 33.7215, 73.0433) where helper_id::text like '%-0000-4000-8000-%';
  insert into r(test,expected,result) values('distances (near, far, stale=null)','Near Helper:2, Far Helper:14, Stale Helper:null',v);
  select string_agg(full_name, ',') into v from (select full_name from public.qareeb_find_helpers('plumbing', false, 33.7215, 73.0433) where helper_id::text like '%-0000-4000-8000-%') x;
  insert into r(test,expected,result) values('nearest helper listed first','Near Helper,Far Helper,Stale Helper',v);
  select count(*)::text into v from public.qareeb_find_helpers('plumbing', false, null, null) where distance_km is null and helper_id::text like '%-0000-4000-8000-%';
  insert into r(test,expected,result) values('no task coordinates -> no distances','3',v);
  begin insert into "Tasks"("Title","Latitude","Longitude") values ('bad', 123, 73); insert into r(test,expected,result) values('invalid coordinates rejected','blocked','NOT BLOCKED');
  exception when check_violation then insert into r(test,expected,result) values('invalid coordinates rejected','blocked','blocked'); end;
  insert into "Bookings"("Task-id","Helper-id") values (t,'b1b1b1b1-0000-4000-8000-000000000001') returning "ID" into b;
  insert into "Bookings"("Task-id","Helper-id") values (t2,'b1b1b1b1-0000-4000-8000-000000000001') returning "ID" into b2;
  begin insert into "Reviews"("Booking-id","Rating") values (b, 5); insert into r(test,expected,result) values('review before completion','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('review before completion','blocked','blocked'); end;
  select helper_distance_km::text into v from public.qareeb_my_bookings() where booking_id = b;
  insert into r(test,expected,result) values('tracking distance to booked helper','2',coalesce(v,'null'));
  insert into _ids values ('t',t),('b',b),('b2',b2);
end $$;

-- ===== H1 completes the booking =====
select set_config('request.jwt.claims','{"sub":"b1b1b1b1-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare v text; b uuid := (select _ids.v from _ids where k='b'); begin
  update "Helpers" set "Latitude"=33.7220, "Longitude"=73.0440, "Location-updated-at"=now() where "ID"='b1b1b1b1-0000-4000-8000-000000000001';
  update "Bookings" set "Status"='Accepted' where "ID"=b; update "Bookings" set "Status"='On-the-way' where "ID"=b;
  -- precise distance while the helper travels (checked before Arrived; In-progress shows none)
  select helper_distance_km::text into v from public.qareeb_my_bookings() where booking_id = b;
  insert into r(test,expected,result) values('helper location update changes distance','0.09',coalesce(v,'null'));
  update "Bookings" set "Status"='Arrived' where "ID"=b; update "Bookings" set "Status"='In-progress' where "ID"=b;
  begin update "Bookings" set "Completed-at"=now() - interval '3 days' where "ID"=b; insert into r(test,expected,result) values('helper forges completion time','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('helper forges completion time','blocked','blocked'); end;
  update "Bookings" set "Status"='Completed' where "ID"=b;
  select (abs(extract(epoch from (now() - "Completed-at"))) < 60)::text into v from "Bookings" where "ID"=b;
  insert into r(test,expected,result) values('Completed-at stamped by database','true',coalesce(v,'null'));
  select amount::text || '/' || jobs::text into v from public.qareeb_helper_earnings(7) where day = (now() at time zone 'Asia/Karachi')::date;
  insert into r(test,expected,result) values('earnings today = completed job value','1500/1',v);
  select count(*)::text || ' days, others ' || coalesce(sum(amount) filter (where day <> (now() at time zone 'Asia/Karachi')::date),0)::text into v from public.qareeb_helper_earnings(7);
  insert into r(test,expected,result) values('7-day series, other days zero','7 days, others 0',v);
  -- helper reviews the customer
  insert into "Reviews"("Booking-id","Rating","Comment") values (b, 5, 'Great customer');
  select "Reviewee-id"::text into v from "Reviews" where "Booking-id"=b and "Reviewer-id"='b1b1b1b1-0000-4000-8000-000000000001';
  insert into r(test,expected,result) values('helper review goes to the customer','c1c1c1c1-0000-4000-8000-000000000001',v);
end $$;

-- ===== C1 reviews the helper =====
select set_config('request.jwt.claims','{"sub":"c1c1c1c1-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare v text; b uuid := (select _ids.v from _ids where k='b'); begin
  insert into "Reviews"("Booking-id","Reviewee-id","Rating","Comment") values (b,'c2c2c2c2-0000-4000-8000-000000000002',4,'Fixed it fast');
  select "Reviewee-id"::text into v from "Reviews" where "Booking-id"=b and "Reviewer-id"='c1c1c1c1-0000-4000-8000-000000000001';
  insert into r(test,expected,result) values('reviewee forced to booked helper (spoof ignored)','b1b1b1b1-0000-4000-8000-000000000001',v);
  select rating::text || '/' || review_count::text into v from public.qareeb_find_helpers('plumbing', false, null, null) where full_name='Near Helper';
  insert into r(test,expected,result) values('helper rating = customer reviews only','4.00/1',v);
  begin insert into "Reviews"("Booking-id","Rating") values (b, 1); insert into r(test,expected,result) values('second review same booking','blocked','NOT BLOCKED');
  exception when unique_violation then insert into r(test,expected,result) values('second review same booking','blocked','blocked'); end;
  update "Reviews" set "Rating"=2, "Comment"='Changed my mind' where "Booking-id"=b and "Reviewer-id"='c1c1c1c1-0000-4000-8000-000000000001';
  select rating::text into v from public.qareeb_find_helpers('plumbing', false, null, null) where full_name='Near Helper';
  insert into r(test,expected,result) values('editing review updates rating','2.00',v);
  begin update "Reviews" set "Reviewee-id"='c2c2c2c2-0000-4000-8000-000000000002' where "Booking-id"=b and "Reviewer-id"='c1c1c1c1-0000-4000-8000-000000000001';
        insert into r(test,expected,result) values('re-target review','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('re-target review','blocked','blocked'); end;
  update "Reviews" set "Rating"=1 where "Reviewer-id"='b1b1b1b1-0000-4000-8000-000000000001';
  select "Rating"::text into v from "Reviews" where "Reviewer-id"='b1b1b1b1-0000-4000-8000-000000000001';
  insert into r(test,expected,result) values('customer cannot edit helper''s review of them','5',v);
  select my_review_rating::text || '|' || (completed_at is not null)::text into v from public.qareeb_my_bookings() where booking_id = b;
  insert into r(test,expected,result) values('my_bookings shows my rating + completion','2|true',v);
  select coalesce(sum(amount),0)::text into v from public.qareeb_helper_earnings(7);
  insert into r(test,expected,result) values('customer has no helper earnings','0',v);
end $$;

-- ===== H1 sees reviews about them =====
select set_config('request.jwt.claims','{"sub":"b1b1b1b1-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare v text; begin
  select count(*)::text into v from "Reviews" where "Reviewee-id"='b1b1b1b1-0000-4000-8000-000000000001';
  insert into r(test,expected,result) values('helper reads reviews about them','1',v);
  select "Rating"::text into v from "Helpers" where "ID"='b1b1b1b1-0000-4000-8000-000000000001';
  insert into r(test,expected,result) values('helper own rating field','2.00',v);
end $$;

-- ===== C2 (unrelated) =====
select set_config('request.jwt.claims','{"sub":"c2c2c2c2-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare v text; b uuid := (select _ids.v from _ids where k='b'); begin
  select count(*)::text into v from "Reviews"; insert into r(test,expected,result) values('unrelated user sees no reviews','0',v);
  begin insert into "Reviews"("Booking-id","Rating") values (b, 1); insert into r(test,expected,result) values('unrelated user reviews booking','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('unrelated user reviews booking','blocked','blocked'); end;
end $$;

-- ===== admin moderation =====
select set_config('request.jwt.claims','{"sub":"a1a1a1a1-0000-4000-8000-000000000009","role":"authenticated"}',true);
do $$ declare v text; begin
  select count(*)::text into v from "Reviews" r join _ids i on i.v = r."Booking-id"; insert into r(test,expected,result) values('admin reads all reviews','2',v);
  delete from "Reviews" where "Reviewer-id"='c1c1c1c1-0000-4000-8000-000000000001';
  select "Rating"::text into v from "Helpers" where "ID"='b1b1b1b1-0000-4000-8000-000000000001';
  insert into r(test,expected,result) values('rating recalculated after admin removes review','0',v);
end $$;

-- ===== anon =====
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  begin perform public.qareeb_helper_earnings(7); insert into r(test,expected,result) values('anon earnings','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('anon earnings','blocked','blocked'); end;
  begin insert into "Reviews"("Booking-id","Reviewee-id","Rating") values (gen_random_uuid(), gen_random_uuid(), 5); insert into r(test,expected,result) values('anon review','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('anon review','blocked', case when sqlstate in ('42501','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
end $$;

reset role;
insert into r(test,expected,result) select 'RLS enabled on Reviews','true', relrowsecurity::text from pg_class where oid='public."Reviews"'::regclass;
insert into r(test,expected,result)
  select 'no helper coordinates returned to customers','0', count(*)::text
  from pg_proc p, unnest(p.proargnames) a where p.proname in ('qareeb_find_helpers','qareeb_my_bookings') and p.proargmodes is not null and a ilike 'helper_lat%';
