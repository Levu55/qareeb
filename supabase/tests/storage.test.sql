-- CNIC storage bucket: private, photo types only, admins can read every file, other users none.
-- Uses its own test users.
-- @checks: 4
insert into r(test,expected,result) select 'bucket allowed types', '{image/jpeg,image/png,image/webp,image/heic,image/heif}', allowed_mime_types::text from storage.buckets where id='cnic-verifications';
insert into r(test,expected,result) select 'bucket still private', 'false', public::text from storage.buckets where id='cnic-verifications';
insert into auth.users (id, aud, role) values ('a1a1a1a1-0000-4000-8000-0000000000a1','authenticated','authenticated'),('c1c1c1c1-0000-4000-8000-0000000000c1','authenticated','authenticated'),('b0b0b0b0-0000-4000-8000-0000000000b0','authenticated','authenticated');
insert into "Profiles"("ID","Full-name","Role") values ('a1a1a1a1-0000-4000-8000-0000000000a1','Admin','admin'),('c1c1c1c1-0000-4000-8000-0000000000c1','Cust','user');
-- at least one CNIC photo exists (uploaded by a third user), whatever real data there is
insert into storage.objects (bucket_id, name, owner_id) values ('cnic-verifications', 'b0b0b0b0-0000-4000-8000-0000000000b0/front_1.jpg', 'b0b0b0b0-0000-4000-8000-0000000000b0');
create temp table _cnic_total as select count(*)::text as n from storage.objects where bucket_id='cnic-verifications';
grant select on _cnic_total to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1a1a1a1-0000-4000-8000-0000000000a1","role":"authenticated"}',true);
insert into r(test,expected,result) select 'admin can list all CNIC files', (select n from _cnic_total), count(*)::text from storage.objects where bucket_id='cnic-verifications';
select set_config('request.jwt.claims','{"sub":"c1c1c1c1-0000-4000-8000-0000000000c1","role":"authenticated"}',true);
insert into r(test,expected,result) select 'other user still sees none', '0', count(*)::text from storage.objects where bucket_id='cnic-verifications';
reset role;
