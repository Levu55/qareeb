-- Core RLS: tasks, bookings, wallets, transactions, profiles and role management for
-- customers with and without CNIC approval, unrelated and booked helpers, anon and admins.
-- Uses its own test users (created below).
-- @checks: 50
-- Phase 2 RLS tests. Run inside a transaction that is rolled back.
create temp table _ids(k text primary key, v uuid) on commit drop;
grant select, insert on _ids to authenticated, anon;

-- ===== fixtures (privileged) =====
-- C1 customer (CNIC approved), C2 customer (no CNIC), H1 approved helper, H2 pending helper, A1 admin
insert into auth.users (id, aud, role, phone) values
  ('c1c1c1c1-0000-4000-8000-000000000001', 'authenticated', 'authenticated', '920000000001'),
  ('c2c2c2c2-0000-4000-8000-000000000002', 'authenticated', 'authenticated', '920000000002'),
  ('a1a1a1a1-0000-4000-8000-000000000003', 'authenticated', 'authenticated', '920000000003'),
  ('b1b1b1b1-0000-4000-8000-000000000004', 'authenticated', 'authenticated', '920000000004'),
  ('b2b2b2b2-0000-4000-8000-000000000005', 'authenticated', 'authenticated', '920000000005');
insert into "Profiles"("ID","Full-name","Phone","Role") values
  ('c1c1c1c1-0000-4000-8000-000000000001','Cust One','+920000000001','user'),
  ('c2c2c2c2-0000-4000-8000-000000000002','Cust Two','+920000000002','user'),
  ('a1a1a1a1-0000-4000-8000-000000000003','Admin One','+920000000003','admin'),
  ('b1b1b1b1-0000-4000-8000-000000000004','Helper One','+920000000004','helper'),
  ('b2b2b2b2-0000-4000-8000-000000000005','Helper Two','+920000000005','helper');
insert into "Helpers"("ID","User-id","Verify-status") values
  ('b1b1b1b1-0000-4000-8000-000000000004','b1b1b1b1-0000-4000-8000-000000000004','Approved'),
  ('b2b2b2b2-0000-4000-8000-000000000005','b2b2b2b2-0000-4000-8000-000000000005','Pending');
insert into _ids values
  ('c1','c1c1c1c1-0000-4000-8000-000000000001'),('c2','c2c2c2c2-0000-4000-8000-000000000002'),
  ('a1','a1a1a1a1-0000-4000-8000-000000000003'),('h1','b1b1b1b1-0000-4000-8000-000000000004'),
  ('h2','b2b2b2b2-0000-4000-8000-000000000005');
insert into r(test,expected,result) select 'wallet auto-created for each new profile','5',count(*)::text from "Wallets" w join _ids i on i.v = w."User-id";
insert into r(test,expected,result) select 'existing real profiles got a wallet (backfill)','0',count(*)::text from "Profiles" p where not exists (select 1 from "Wallets" w where w."User-id" = p."ID");

-- ===== C1: customer with approved CNIC =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1c1c1c1-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"cnic_status":"approved"}}', true);
do $$
declare c1 uuid := 'c1c1c1c1-0000-4000-8000-000000000001'; h1 uuid := 'b1b1b1b1-0000-4000-8000-000000000004'; h2 uuid := 'b2b2b2b2-0000-4000-8000-000000000005';
  t1 uuid; t2 uuid; b1 uuid; v text; n int;
begin
  begin insert into "Tasks"("Title","Description","Price","Status","Helper-id") values ('Fix pipe','Kitchen leak',800,'Completed',h1) returning "ID" into t1;
        select "Status"||' / helper '||coalesce("Helper-id"::text,'null')||' / owner '||("User-id"=c1)::text into v from "Tasks" where "ID"=t1;
        insert into r(test,expected,result) values('C1 creates task (status/helper forced)','Open / helper null / owner true',v);
  exception when others then insert into r(test,expected,result) values('C1 creates task (status/helper forced)','Open / helper null / owner true','ERR '||sqlerrm); end;
  select count(*) into n from "Tasks"; insert into r(test,expected,result) values('C1 reads own task','1',n::text);
  begin insert into "Tasks"("User-id","Title") values ('c2c2c2c2-0000-4000-8000-000000000002','spoof'); insert into r(test,expected,result) values('C1 creates task for C2','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('C1 creates task for C2','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  begin insert into "Bookings"("Task-id","Helper-id") values (t1,h2); insert into r(test,expected,result) values('C1 books UNAPPROVED helper','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('C1 books UNAPPROVED helper','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  begin insert into "Bookings"("Task-id","Helper-id","Status") values (t1,h1,'Completed') returning "ID" into b1;
        select "Status" into v from "Bookings" where "ID"=b1; insert into r(test,expected,result) values('C1 books approved helper (status forced)','Pending',v);
  exception when others then insert into r(test,expected,result) values('C1 books approved helper (status forced)','Pending','ERR '||sqlerrm); end;
  begin insert into "Bookings"("Task-id","Helper-id") values (t1,h1); insert into r(test,expected,result) values('second active booking on same task','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('second active booking on same task','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  begin update "Bookings" set "Status"='Completed' where "ID"=b1; insert into r(test,expected,result) values('customer marks booking Completed','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('customer marks booking Completed','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  begin update "Tasks" set "Status"='Completed' where "ID"=t1; insert into r(test,expected,result) values('customer sets task Completed directly','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('customer sets task Completed directly','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  -- transactions / wallets
  begin insert into "Transactions"("Wallet-id","User-id","Type","Amount") select w."ID", c1, 'credit', 100000 from "Wallets" w where w."User-id"=c1;
        insert into r(test,expected,result) values('customer creates transaction','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('customer creates transaction','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  select count(*) into n from "Wallets"; insert into r(test,expected,result) values('customer sees only own wallet','1',n::text);
  -- clients lost UPDATE on Wallets in 20261002120400 (before that RLS matched 0 rows)
  begin update "Wallets" set "Balance"=999999 where "User-id"=c1; get diagnostics n=row_count; insert into r(test,expected,result) values('customer edits own wallet balance','blocked',n||' rows');
  exception when insufficient_privilege then insert into r(test,expected,result) values('customer edits own wallet balance','blocked','blocked'); end;
  begin insert into "Wallets"("User-id","Balance") values (c1, 5000); insert into r(test,expected,result) values('customer creates wallet','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('customer creates wallet','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  select count(*) into n from "Profiles"; insert into r(test,expected,result) values('customer sees only own profile','1',n::text);
  begin update "Profiles" set "Role"='admin' where "ID"=c1; insert into r(test,expected,result) values('regression: self-promote to admin','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('regression: self-promote to admin','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  -- second task for later tests
  insert into "Tasks"("Title","Price") values ('Paint wall',1500) returning "ID" into t2;
  insert into _ids values ('t1',t1),('t2',t2),('b1',b1);
end $$;

-- ===== C2: customer WITHOUT CNIC approval =====
select set_config('request.jwt.claims', '{"sub":"c2c2c2c2-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{}}', true);
do $$
declare c2 uuid := 'c2c2c2c2-0000-4000-8000-000000000002'; h1 uuid := 'b1b1b1b1-0000-4000-8000-000000000004'; t1 uuid := (select _ids.v from _ids where k='t1'); t3 uuid; n int;
begin
  select count(*) into n from "Tasks"; insert into r(test,expected,result) values('C2 cannot see C1 tasks','0',n::text);
  update "Tasks" set "Title"='hacked' where "ID"=t1; get diagnostics n=row_count; insert into r(test,expected,result) values('C2 modifies C1 task','0 rows',n||' rows');
  select count(*) into n from "Bookings"; insert into r(test,expected,result) values('C2 cannot see C1 bookings','0',n::text);
  begin insert into "Bookings"("Task-id","Helper-id") values (t1,h1); insert into r(test,expected,result) values('C2 books C1''s task','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('C2 books C1''s task','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  insert into "Tasks"("Title") values ('C2 task') returning "ID" into t3;
  begin insert into "Bookings"("Task-id","Helper-id") values (t3,h1); insert into r(test,expected,result) values('C2 books without CNIC approval','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('C2 books without CNIC approval','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  select count(*) into n from "Wallets"; insert into r(test,expected,result) values('C2 sees only own wallet','1',n::text);
end $$;

-- ===== H2: unrelated helper =====
select set_config('request.jwt.claims', '{"sub":"b2b2b2b2-0000-4000-8000-000000000005","role":"authenticated"}', true);
do $$ declare n int; b1 uuid := (select _ids.v from _ids where k='b1'); begin
  select count(*) into n from "Bookings"; insert into r(test,expected,result) values('unrelated helper sees no bookings','0',n::text);
  update "Bookings" set "Status"='Accepted' where "ID"=b1; get diagnostics n=row_count; insert into r(test,expected,result) values('unrelated helper accepts booking','0 rows',n||' rows');
  begin update "Helpers" set "Verify-status"='Approved' where "ID"='b2b2b2b2-0000-4000-8000-000000000005';
        insert into r(test,expected,result) select 'regression: helper self-approve ignored','Pending',"Verify-status" from "Helpers" where "ID"='b2b2b2b2-0000-4000-8000-000000000005';
  exception when others then insert into r(test,expected,result) values('regression: helper self-approve ignored','Pending','ERR '||sqlerrm); end;
end $$;

-- ===== H1: the booked helper =====
select set_config('request.jwt.claims', '{"sub":"b1b1b1b1-0000-4000-8000-000000000004","role":"authenticated"}', true);
do $$ declare n int; v text; b1 uuid := (select _ids.v from _ids where k='b1'); t1 uuid := (select _ids.v from _ids where k='t1'); begin
  select count(*) into n from "Bookings"; insert into r(test,expected,result) values('booked helper sees the booking','1',n::text);
  select count(*) into n from "Tasks"; insert into r(test,expected,result) values('booked helper sees the booked task only','1',n::text);
  begin update "Bookings" set "Status"='Completed' where "ID"=b1; insert into r(test,expected,result) values('helper skips Pending->Completed','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('helper skips Pending->Completed','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  begin update "Bookings" set "User-id"='c2c2c2c2-0000-4000-8000-000000000002' where "ID"=b1; insert into r(test,expected,result) values('helper changes booking customer','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('helper changes booking customer','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  update "Bookings" set "Status"='Accepted' where "ID"=b1;
  select "Status"||' / '||("Helper-id"='b1b1b1b1-0000-4000-8000-000000000004')::text into v from "Tasks" where "ID"=t1;
  insert into r(test,expected,result) values('helper accepts -> task Assigned to helper','Assigned / true',v);
  begin update "Bookings" set "Status"='On-the-way' where "ID"=b1; update "Bookings" set "Status"='Arrived' where "ID"=b1;
        update "Bookings" set "Status"='In-progress' where "ID"=b1; update "Bookings" set "Status"='Completed' where "ID"=b1;
        select b."Status"||' / task '||t."Status" into v from "Bookings" b join "Tasks" t on t."ID"=b."Task-id" where b."ID"=b1;
        insert into r(test,expected,result) values('helper completes full lifecycle','Completed / task Completed',v);
  exception when others then insert into r(test,expected,result) values('helper completes full lifecycle','Completed / task Completed','ERR '||sqlerrm); end;
  begin update "Tasks" set "Title"='x' where "ID"=t1; get diagnostics n=row_count; insert into r(test,expected,result) values('helper edits customer task','0 rows',n||' rows');
  exception when others then insert into r(test,expected,result) values('helper edits customer task','0 rows','blocked: '||sqlerrm); end;
  begin insert into "Transactions"("Wallet-id","User-id","Amount") select "ID","User-id",500 from "Wallets"; insert into r(test,expected,result) values('helper creates transaction','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('helper creates transaction','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
end $$;

-- ===== C1 again: cancellation path =====
select set_config('request.jwt.claims', '{"sub":"c1c1c1c1-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"cnic_status":"approved"}}', true);
do $$ declare b2 uuid; v text; t2 uuid := (select _ids.v from _ids where k='t2'); begin
  insert into "Bookings"("Task-id","Helper-id") values (t2,'b1b1b1b1-0000-4000-8000-000000000004') returning "ID" into b2;
  update "Bookings" set "Status"='Cancelled' where "ID"=b2;
  select b."Status"||' / task '||t."Status" into v from "Bookings" b join "Tasks" t on t."ID"=b."Task-id" where b."ID"=b2;
  insert into r(test,expected,result) values('customer cancels pending booking','Cancelled / task Open',v);
  update "Tasks" set "Status"='Cancelled' where "ID"=t2; select "Status" into v from "Tasks" where "ID"=t2;
  insert into r(test,expected,result) values('customer cancels own open task','Cancelled',v);
end $$;

-- ===== anon =====
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ declare n int; begin
  begin insert into "Transactions"("Wallet-id","User-id","Amount") values (gen_random_uuid(), gen_random_uuid(), 1); insert into r(test,expected,result) values('anon creates transaction','blocked','NOT BLOCKED');
  exception when others then insert into r(test,expected,result) values('anon creates transaction','blocked',case when sqlstate in ('42501','23505','23514','23503') then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  select count(*) into n from "Tasks"; insert into r(test,expected,result) values('anon reads tasks','0',n::text);
end $$;

-- ===== A1: admin =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1a1a1a1-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ declare n int; v text; begin
  select count(*) into n from "Tasks" t join _ids i on i.v = t."User-id"; insert into r(test,expected,result) values('admin sees all test tasks','3',n::text);
  select count(*) into n from "Bookings" b join _ids i on i.v = b."User-id"; insert into r(test,expected,result) values('admin sees all test bookings','2',n::text);
  select count(*) into n from "Wallets" w join _ids i on i.v = w."User-id"; insert into r(test,expected,result) values('admin sees all test wallets','5',n::text);
  select count(*) into n from "Profiles" p join _ids i on i.v = p."ID"; insert into r(test,expected,result) values('admin sees all test profiles','5',n::text);
  begin insert into "Transactions"("Wallet-id","User-id","Type","Amount") select "ID","User-id",'credit',250 from "Wallets" where "User-id"='c1c1c1c1-0000-4000-8000-000000000001';
        update "Wallets" set "Balance"=250 where "User-id"='c1c1c1c1-0000-4000-8000-000000000001';
        insert into r(test,expected,result) values('admin records transaction + balance','blocked','NOT BLOCKED');
  -- admins lost direct money writes in 20260930120200 (money only moves through the server ledger)
  exception when others then insert into r(test,expected,result) values('admin records transaction + balance','blocked',case when sqlstate = '42501' then 'blocked' else 'ERR '||sqlstate||' '||sqlerrm end); end;
  begin update "Helpers" set "Verify-status"='Approved' where "ID"='b2b2b2b2-0000-4000-8000-000000000005';
        select "Verify-status" into v from "Helpers" where "ID"='b2b2b2b2-0000-4000-8000-000000000005'; insert into r(test,expected,result) values('admin approves helper via API','Approved',v);
  exception when others then insert into r(test,expected,result) values('admin approves helper via API','Approved','ERR '||sqlerrm); end;
end $$;

-- ===== role management =====
do $$ declare v text; begin
  begin update "Profiles" set "Role"='superadmin' where "ID"='c2c2c2c2-0000-4000-8000-000000000002'; insert into r(test,expected,result) values('admin grants superadmin to user','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('admin grants superadmin to user','blocked','blocked'); end;
  begin update "Profiles" set "Role"='superadmin' where "ID"='a1a1a1a1-0000-4000-8000-000000000003'; insert into r(test,expected,result) values('admin promotes self to superadmin','blocked','NOT BLOCKED');
  exception when insufficient_privilege then insert into r(test,expected,result) values('admin promotes self to superadmin','blocked','blocked'); end;
  begin update "Profiles" set "Role"='helper' where "ID"='c2c2c2c2-0000-4000-8000-000000000002'; select "Role" into v from "Profiles" where "ID"='c2c2c2c2-0000-4000-8000-000000000002';
        insert into r(test,expected,result) values('admin changes user role to helper','helper',v);
  exception when others then insert into r(test,expected,result) values('admin changes user role to helper','helper','ERR '||sqlerrm); end;
end $$;
reset role;
insert into auth.users (id, aud, role) values ('5a5a5a5a-0000-4000-8000-000000000006','authenticated','authenticated');
insert into "Profiles"("ID","Full-name","Role") values ('5a5a5a5a-0000-4000-8000-000000000006','Super One','superadmin');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"5a5a5a5a-0000-4000-8000-000000000006","role":"authenticated"}', true);
do $$ declare v text; begin
  begin update "Profiles" set "Role"='superadmin' where "ID"='a1a1a1a1-0000-4000-8000-000000000003'; select "Role" into v from "Profiles" where "ID"='a1a1a1a1-0000-4000-8000-000000000003';
        insert into r(test,expected,result) values('superadmin grants superadmin','superadmin',v);
  exception when others then insert into r(test,expected,result) values('superadmin grants superadmin','superadmin','ERR '||sqlerrm); end;
end $$;

-- ===== C1 sees own transaction, C2 does not =====
-- the server (service role) credits C1 through the ledger, the only way money moves now
reset role; set local role service_role;
insert into "Transactions"("User-id","Type","Amount","Status","Idempotency-key") values ('c1c1c1c1-0000-4000-8000-000000000001','Adjustment',250,'Completed','test:c1-credit');
reset role; set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1c1c1c1-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ declare n int; v text; begin
  select count(*) into n from "Transactions"; insert into r(test,expected,result) values('customer reads own transaction','1',n::text);
  select "Balance"::text into v from "Wallets"; insert into r(test,expected,result) values('customer sees server-credited balance','250',v);
end $$;
select set_config('request.jwt.claims', '{"sub":"c2c2c2c2-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ declare n int; begin
  select count(*) into n from "Transactions"; insert into r(test,expected,result) values('other customer cannot read it','0',n::text);
end $$;

reset role;
