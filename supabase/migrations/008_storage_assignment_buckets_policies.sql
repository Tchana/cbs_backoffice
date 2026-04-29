-- =============================================================================
-- Assignment-related storage bucket policies (RLS on storage.objects)
-- =============================================================================
-- NOTE: SQL cannot create buckets in Supabase. Create these buckets manually:
--   - assignment-files (public read if you want getPublicUrl() to work)
--   - assignment-submissions (public read if you want getPublicUrl() to work)
--
-- Then apply this migration.
-- =============================================================================

-- assignment material uploads: teacher/admin
drop policy if exists "storage_assignment_files_insert" on storage.objects;
create policy "storage_assignment_files_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assignment-files'
    and public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1
        from public.courses c
        join public.assignments a on a.course_id = c.id
        where c.teacher_id = auth.uid()
          and a.id = nullif(split_part(name, '/', 1), '')::uuid
      )
    )
  );

drop policy if exists "storage_assignment_files_select" on storage.objects;
create policy "storage_assignment_files_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assignment-files'
    and (
      -- enrolled students can read only published assignment material in active courses
      exists (
        select 1
        from public.assignments a
        join public.enrollments e on e.course_id = a.course_id
        join public.courses c on c.id = a.course_id
        where a.id = nullif(split_part(name, '/', 1), '')::uuid
          and a.published = true
          and c.active = true
          and e.student_id = auth.uid()
      )
      or (
        -- teachers/admin can read for their assignments
        public.current_user_role() in ('admin', 'teacher')
        and (
          public.current_user_role() = 'admin'
          or exists (
            select 1
            from public.assignments a
            join public.courses c on c.id = a.course_id
            where a.id = nullif(split_part(name, '/', 1), '')::uuid
              and c.teacher_id = auth.uid()
          )
        )
      )
    )
  );

drop policy if exists "storage_assignment_files_update" on storage.objects;
create policy "storage_assignment_files_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'assignment-files'
    and public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1
        from public.assignments a
        join public.courses c on c.id = a.course_id
        where a.id = nullif(split_part(name, '/', 1), '')::uuid
          and c.teacher_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'assignment-files'
    and public.current_user_role() in ('admin', 'teacher')
  );

drop policy if exists "storage_assignment_files_delete" on storage.objects;
create policy "storage_assignment_files_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'assignment-files'
    and public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1
        from public.assignments a
        join public.courses c on c.id = a.course_id
        where a.id = nullif(split_part(name, '/', 1), '')::uuid
          and c.teacher_id = auth.uid()
      )
    )
  );

-- student answer uploads: students only, for their own submission_id
drop policy if exists "storage_assignment_submissions_insert" on storage.objects;
create policy "storage_assignment_submissions_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assignment-submissions'
    and public.current_user_role() = 'student'
    and exists (
      select 1
      from public.assignment_submissions s
      where s.id = nullif(split_part(name, '/', 1), '')::uuid
        and s.student_id = auth.uid()
    )
  );

drop policy if exists "storage_assignment_submissions_select" on storage.objects;
create policy "storage_assignment_submissions_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      -- student can read their own answers
      exists (
        select 1
        from public.assignment_submissions s
        where s.id = nullif(split_part(name, '/', 1), '')::uuid
          and s.student_id = auth.uid()
      )
      or
      -- teachers/admin can read answers for their assignments
      (
        public.current_user_role() in ('admin', 'teacher')
        and (
          public.current_user_role() = 'admin'
          or exists (
            select 1
            from public.assignment_submissions s
            join public.assignments a on a.id = s.assignment_id
            join public.courses c on c.id = a.course_id
            where s.id = nullif(split_part(name, '/', 1), '')::uuid
              and c.teacher_id = auth.uid()
          )
        )
      )
    )
  );

drop policy if exists "storage_assignment_submissions_update" on storage.objects;
create policy "storage_assignment_submissions_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      exists (
        select 1
        from public.assignment_submissions s
        where s.id = nullif(split_part(name, '/', 1), '')::uuid
          and s.student_id = auth.uid()
      )
      or (
        public.current_user_role() in ('admin', 'teacher')
        and (
          public.current_user_role() = 'admin'
          or exists (
            select 1
            from public.assignment_submissions s
            join public.assignments a on a.id = s.assignment_id
            join public.courses c on c.id = a.course_id
            where s.id = nullif(split_part(name, '/', 1), '')::uuid
              and c.teacher_id = auth.uid()
          )
        )
      )
    )
  );

drop policy if exists "storage_assignment_submissions_delete" on storage.objects;
create policy "storage_assignment_submissions_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      exists (
        select 1
        from public.assignment_submissions s
        where s.id = nullif(split_part(name, '/', 1), '')::uuid
          and s.student_id = auth.uid()
      )
      or (
        public.current_user_role() in ('admin', 'teacher')
        and (
          public.current_user_role() = 'admin'
          or exists (
            select 1
            from public.assignment_submissions s
            join public.assignments a on a.id = s.assignment_id
            join public.courses c on c.id = a.course_id
            where s.id = nullif(split_part(name, '/', 1), '')::uuid
              and c.teacher_id = auth.uid()
          )
        )
      )
    )
  );

