-- Qareeb: private storage bucket for CNIC verification documents.
--
-- The app (src/lib/authHelpers.ts uploadCNICDocument) uploads to
--   cnic-verifications/<auth user id>/<front|back|selfie>_<timestamp>.<ext>
-- with upsert enabled, which requires INSERT, SELECT and UPDATE on storage.objects.
--
-- Users can only touch files inside their own <user id>/ folder. There is no
-- DELETE policy, so submitted documents cannot be removed by the user. Admin
-- review uses service_role, which bypasses RLS. The bucket is private: no public URLs.
--
-- Adds only new rows/policies; no existing buckets, objects or policies are changed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cnic-verifications', 'cnic-verifications', false, 10485760, array['image/*'])
on conflict (id) do nothing;

create policy "CNIC: users upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cnic-verifications'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "CNIC: users read own documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'cnic-verifications'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "CNIC: users replace own documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'cnic-verifications'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'cnic-verifications'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
