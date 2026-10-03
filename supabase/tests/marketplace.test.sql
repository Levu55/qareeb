-- Marketplace reads: helper search (service, availability, women-only), my-bookings for both
-- sides, no phone numbers exposed, and admin-only fields on Helpers. Uses its own test users.
-- @checks: 16

-- fixtures: C1 customer (CNIC approved), C2 customer, H1 approved+available plumber, H2 approved but unavailable,
-- H3 pending, H4 approved+available female cleaner, A1 admin
insert into auth.users (id, aud, role) values
  ('c1c1c1c1-0000-4000-8000-000000000001','authenticated','authenticated'),('c2c2c2c2-0000-4000-8000-000000000002','authenticated','authenticated'),
  ('b1b1b1b1-0000-4000-8000-000000000001','authenticated','authenticated'),('b2b2b2b2-0000-4000-8000-000000000002','authenticated','authenticated'),
  ('b3b3b3b3-0000-4000-8000-000000000003','authenticated','authenticated'),('b4b4b4b4-0000-4000-8000-000000000004','authenticated','authenticated'),
  ('a1a1a1a1-0000-4000-8000-000000000009','authenticated','authenticated');
insert into "Profiles"("ID","Full-name","Phone","Role") values
  ('c1c1c1c1-0000-4000-8000-000000000001','Cust One','+920000000001','user'),('c2c2c2c2-0000-4000-8000-000000000002','Cust Two','+920000000002','user'),
  ('b1b1b1b1-0000-4000-8000-000000000001','Helper One','+920000000011','helper'),('b2b2b2b2-0000-4000-8000-000000000002','Helper Two','+920000000012','helper'),
  ('b3b3b3b3-0000-4000-8000-000000000003','Helper Three','+920000000013','helper'),('b4b4b4b4-0000-4000-8000-000000000004','Helper Four','+920000000014','helper'),
  ('a1a1a1a1-0000-4000-8000-000000000009','Admin','+920000000009','admin');
insert into "Helpers"("ID","User-id","Verify-status","Is-available","Categories","Is-female","Rating") values
  ('b1b1b1b1-0000-4000-8000-000000000001','b1b1b1b1-0000-4000-8000-000000000001','Approved',true,'{plumbing,electrical}',false,4.5),
  ('b2b2b2b2-0000-4000-8000-000000000002','b2b2b2b2-0000-4000-8000-000000000002','Approved',false,'{plumbing}',false,5),
  ('b3b3b3b3-0000-4000-8000-000000000003','b3b3b3b3-0000-4000-8000-000000000003','Pending',true,'{plumbing}',false,0),
  ('b4b4b4b4-0000-4000-8000-000000000004','b4b4b4b4-0000-4000-8000-000000000004','Approved',true,'{cleaning}',true,4.8);

-- ===== C1 =====
-- searches are scoped to this suite's helpers (ids ...-0000-4000-8000-...) so real helpers do not change the results
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1c1c1c1-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"cnic_status":"approved"}}',true);
do $$ declare v text; t uuid; b uuid; n int; begin
  select string_agg(full_name, ',' order by full_name) into v from public.qareeb_find_helpers('plumbing', false) where helper_id::text like '%-0000-4000-8000-%';
  insert into r(test,expected,result) values('find plumbers: approved+available only','Helper One',coalesce(v,'none'));
  select string_agg(full_name, ',' order by full_name) into v from public.qareeb_find_helpers(null, false) where helper_id::text like '%-0000-4000-8000-%';
  insert into r(test,expected,result) values('find all: excludes unavailable/pending','Helper Four,Helper One',coalesce(v,'none'));
  select string_agg(full_name, ',') into v from public.qareeb_find_helpers('cleaning', true) where helper_id::text like '%-0000-4000-8000-%';
  insert into r(test,expected,result) values('women-only cleaning','Helper Four',coalesce(v,'none'));
  select string_agg(full_name, ',') into v from public.qareeb_find_helpers('plumbing', true) where helper_id::text like '%-0000-4000-8000-%';
  insert into r(test,expected,result) values('women-only plumbing (none female)','none',coalesce(v,'none'));
  begin insert into "Tasks"("Title","Category","Price") values ('bad','DROP TABLE',100); insert into r(test,expected,result) values('invalid category rejected','blocked','NOT BLOCKED');
  exception when check_violation then insert into r(test,expected,result) values('invalid category rejected','blocked','blocked'); end;
  insert into "Tasks"("Title","Description","Price","Category","Location","Female-only") values ('Fix pipe','Kitchen',1200,'plumbing','House 1, DHA',false) returning "ID" into t;
  select "Category"||'|'||"Location"||'|'||"Female-only"::text||'|'||"Status" into v from "Tasks" where "ID"=t;
  insert into r(test,expected,result) values('task saves new fields','plumbing|House 1, DHA|false|Open',v);
  insert into "Bookings"("Task-id","Helper-id") values (t,'b1b1b1b1-0000-4000-8000-000000000001') returning "ID" into b;
  select my_role||'|'||counterpart_name||'|'||title||'|'||category||'|'||location||'|'||price::text||'|'||status into v from public.qareeb_my_bookings();
  insert into r(test,expected,result) values('customer sees booking with helper name','customer|Helper One|Fix pipe|plumbing|House 1, DHA|1200|Pending',v);
end $$;

-- ===== H1 =====
select set_config('request.jwt.claims','{"sub":"b1b1b1b1-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare v text; n int; begin
  select my_role||'|'||counterpart_name||'|'||title into v from public.qareeb_my_bookings();
  insert into r(test,expected,result) values('helper sees booking with customer name','helper|Cust One|Fix pipe',v);
  select count(*) into n from public.qareeb_find_helpers('plumbing', false) where full_name='Helper One';
  insert into r(test,expected,result) values('helper does not find themselves','0',n::text);
  update "Helpers" set "Is-available"=false, "Categories"='{plumbing}', "Is-female"=true where "ID"='b1b1b1b1-0000-4000-8000-000000000001';
  select "Is-available"::text||'|'||"Categories"::text||'|'||"Is-female"::text into v from "Helpers" where "ID"='b1b1b1b1-0000-4000-8000-000000000001';
  insert into r(test,expected,result) values('helper sets availability+services, NOT Is-female','false|{plumbing}|false',v);
end $$;

-- ===== C2 (unrelated) =====
select set_config('request.jwt.claims','{"sub":"c2c2c2c2-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare n int; begin
  select count(*) into n from public.qareeb_my_bookings(); insert into r(test,expected,result) values('unrelated user sees no bookings','0',n::text);
  select count(*) into n from "Helpers"; insert into r(test,expected,result) values('customer still cannot read Helpers table','0',n::text);
end $$;

-- ===== admin =====
select set_config('request.jwt.claims','{"sub":"a1a1a1a1-0000-4000-8000-000000000009","role":"authenticated"}',true);
do $$ declare v text; begin
  update "Helpers" set "Is-female"=true where "ID"='b2b2b2b2-0000-4000-8000-000000000002';
  select "Is-female"::text into v from "Helpers" where "ID"='b2b2b2b2-0000-4000-8000-000000000002';
  insert into r(test,expected,result) values('admin sets Is-female','true',v);
end $$;

-- ===== anon =====
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
  begin perform public.qareeb_find_helpers(null, false); insert into r(test,expected,result) values('anon cannot search helpers','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('anon cannot search helpers','blocked','blocked'); end;
  begin perform public.qareeb_my_bookings(); insert into r(test,expected,result) values('anon cannot list bookings','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('anon cannot list bookings','blocked','blocked'); end;
end $$;

reset role;
insert into r(test,expected,result)
  select 'no phone column exposed by read functions','0', count(*)::text
  from pg_proc p, unnest(p.proargnames) a where p.proname in ('qareeb_find_helpers','qareeb_my_bookings') and a ilike '%phone%';
