-- Storage RLS: allow authenticated users (admin/teacher) to upload, read, update, delete
-- in app buckets. Run after buckets exist (Dashboard > Storage > create buckets).
-- Buckets: avatars, course-covers, lesson-files, book-covers, book-files, blog-images

drop policy if exists "storage_app_buckets_insert" on storage.objects;
drop policy if exists "storage_app_buckets_select" on storage.objects;
drop policy if exists "storage_app_buckets_update" on storage.objects;
drop policy if exists "storage_app_buckets_delete" on storage.objects;

-- INSERT: authenticated can upload to app buckets
create policy "storage_app_buckets_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in (
      'avatars', 'course-covers', 'lesson-files',
      'book-covers', 'book-files', 'blog-images'
    )
  );

-- SELECT: authenticated can read from app buckets
create policy "storage_app_buckets_select"
  on storage.objects for select to authenticated
  using (
    bucket_id in (
      'avatars', 'course-covers', 'lesson-files',
      'book-covers', 'book-files', 'blog-images'
    )
  );

-- UPDATE: authenticated can update (required for upsert)
create policy "storage_app_buckets_update"
  on storage.objects for update to authenticated
  using (
    bucket_id in (
      'avatars', 'course-covers', 'lesson-files',
      'book-covers', 'book-files', 'blog-images'
    )
  )
  with check (
    bucket_id in (
      'avatars', 'course-covers', 'lesson-files',
      'book-covers', 'book-files', 'blog-images'
    )
  );

-- DELETE: authenticated can delete in app buckets
create policy "storage_app_buckets_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id in (
      'avatars', 'course-covers', 'lesson-files',
      'book-covers', 'book-files', 'blog-images'
    )
  );
