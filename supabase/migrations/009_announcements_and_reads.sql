-- =============================================================================
-- Announcements + per-student read tracking
-- =============================================================================

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_created_at on public.announcements(created_at desc);
create index if not exists idx_announcements_course_id on public.announcements(course_id);
create index if not exists idx_announcements_published on public.announcements(published);

alter table public.announcements enable row level security;

-- Students can read published announcements:
-- - global announcements (course_id is null)
-- - course-scoped announcements for courses they are enrolled in and active
create policy "announcements_student_select"
  on public.announcements for select to authenticated
  using (
    published = true
    and (
      course_id is null
      or exists (
        select 1
        from public.enrollments e
        join public.courses c on c.id = e.course_id
        where e.course_id = announcements.course_id
          and e.student_id = auth.uid()
          and c.active = true
      )
    )
  );

-- Teachers/admin can read announcements they can manage.
create policy "announcements_teacher_admin_select"
  on public.announcements for select to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or course_id is null
      or exists (
        select 1
        from public.courses c
        where c.id = announcements.course_id
          and c.teacher_id = auth.uid()
      )
    )
  );

-- Teachers/admin can create announcements.
create policy "announcements_teacher_admin_insert"
  on public.announcements for insert to authenticated
  with check (
    public.current_user_role() in ('admin', 'teacher')
    and created_by = auth.uid()
    and (
      public.current_user_role() = 'admin'
      or course_id is null
      or exists (
        select 1
        from public.courses c
        where c.id = announcements.course_id
          and c.teacher_id = auth.uid()
      )
    )
  );

-- Teachers/admin can update/delete announcements they can manage.
create policy "announcements_teacher_admin_update"
  on public.announcements for update to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or created_by = auth.uid()
      or (
        course_id is not null
        and exists (
          select 1
          from public.courses c
          where c.id = announcements.course_id
            and c.teacher_id = auth.uid()
        )
      )
    )
  )
  with check (true);

create policy "announcements_teacher_admin_delete"
  on public.announcements for delete to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or created_by = auth.uid()
      or (
        course_id is not null
        and exists (
          select 1
          from public.courses c
          where c.id = announcements.course_id
            and c.teacher_id = auth.uid()
        )
      )
    )
  );

-- Read tracking
create table if not exists public.announcement_reads (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (announcement_id, student_id)
);

create index if not exists idx_announcement_reads_student on public.announcement_reads(student_id);
create index if not exists idx_announcement_reads_announcement on public.announcement_reads(announcement_id);

alter table public.announcement_reads enable row level security;

create policy "announcement_reads_student_select_own"
  on public.announcement_reads for select to authenticated
  using (student_id = auth.uid());

create policy "announcement_reads_student_insert_own"
  on public.announcement_reads for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.announcements a
      where a.id = announcement_reads.announcement_id
        and a.published = true
        and (
          a.course_id is null
          or exists (
            select 1
            from public.enrollments e
            join public.courses c on c.id = e.course_id
            where e.course_id = a.course_id
              and e.student_id = auth.uid()
              and c.active = true
          )
        )
    )
  );

create policy "announcement_reads_teacher_admin_select"
  on public.announcement_reads for select to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
  );

