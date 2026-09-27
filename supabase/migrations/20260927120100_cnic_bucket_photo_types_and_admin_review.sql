-- Qareeb: tighten CNIC uploads and let admins review them.
--
-- - Only real photo formats are accepted. The bucket previously allowed every image/*
--   type, including image/svg+xml, which can carry scripts when opened by a reviewer.
-- - Admins (public.qareeb_is_admin(), from the previous migration) can read CNIC files
--   for manual review. Users still only see their own folder; nobody can delete.

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'cnic-verifications';

create policy "CNIC: admins read all documents for review"
  on storage.objects for select to authenticated
  using (bucket_id = 'cnic-verifications' and (select public.qareeb_is_admin()));
