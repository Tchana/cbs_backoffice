-- =============================================================================
-- Remove course enrollment requirement; gate by subscription + course level
-- =============================================================================

-- courses.level may be text or the custom enum `levels` — always cast to text at call sites.
create or replace function public.parse_course_level(p_level text)
returns integer as $$
  select coalesce(
    nullif(substring(coalesce(trim(p_level), '') from '(\d+)'), '')::integer,
    0
  );
$$ language sql immutable;

create or replace function public.current_user_school_max_level()
returns integer as $$
  select coalesce(school_max_level, 0)
  from public.profiles
  where id = auth.uid();
$$ language sql security definer stable;

create or replace function public.current_user_can_access_course(p_course_id uuid)
returns boolean as $$
  select
    public.current_user_has_course_access()
    and exists (
      select 1
      from public.courses c
      where c.id = p_course_id
        and c.active = true
        and public.parse_course_level(c.level::text) > 0
        and public.parse_course_level(c.level::text) <= public.current_user_school_max_level()
    );
$$ language sql security definer stable;

create or replace function public.current_user_can_submit_assignments()
returns boolean as $$
  select public.current_user_has_course_access()
    and public.current_user_subscription_access_state() = 'full';
$$ language sql security definer stable;

-- Stop auto course-fee charges on enrollment inserts.
drop trigger if exists trg_create_course_fee_charge_on_enroll on public.enrollments;

-- Students can no longer self-enroll.
drop policy if exists "enrollments_student_insert_own" on public.enrollments;

-- Courses visible to subscribed students at their school level (active only).
drop policy if exists "courses_select_students_with_access" on public.courses;
create policy "courses_select_students_with_access"
  on public.courses for select to authenticated
  using (
    public.current_user_has_course_access()
    and active = true
    and public.parse_course_level(level::text) > 0
    and public.parse_course_level(level::text) <= public.current_user_school_max_level()
  );

-- Lessons only for courses the student can access.
drop policy if exists "lessons_select_students_with_access" on public.lessons;
create policy "lessons_select_students_with_access"
  on public.lessons for select to authenticated
  using (
    exists (
      select 1
      from public.courses c
      where c.id = lessons.course_id
        and public.current_user_can_access_course(c.id)
    )
  );

-- Assignments
drop policy if exists "assignments_select_student_or_teacher" on public.assignments;
create policy "assignments_select_student_or_teacher"
  on public.assignments for select to authenticated
  using (
    (
      published = true
      and public.current_user_can_access_course(assignments.course_id)
    )
    or (
      public.current_user_role() in ('admin', 'teacher')
      and (
        public.current_user_role() = 'admin'
        or exists (
          select 1
          from public.courses c
          where c.id = assignments.course_id
            and c.teacher_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "assignment_questions_select_student_or_teacher" on public.assignment_questions;
create policy "assignment_questions_select_student_or_teacher"
  on public.assignment_questions for select to authenticated
  using (
    exists (
      select 1
      from public.assignments a
      where a.id = assignment_questions.assignment_id
        and a.published = true
        and public.current_user_can_access_course(a.course_id)
    )
    or (
      public.current_user_role() in ('admin', 'teacher')
      and (
        public.current_user_role() = 'admin'
        or exists (
          select 1
          from public.assignments a
          join public.courses c on c.id = a.course_id
          where a.id = assignment_questions.assignment_id
            and c.teacher_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "assignment_mcq_options_select_student_or_teacher" on public.assignment_mcq_options;
create policy "assignment_mcq_options_select_student_or_teacher"
  on public.assignment_mcq_options for select to authenticated
  using (
    exists (
      select 1
      from public.assignment_questions q
      join public.assignments a on a.id = q.assignment_id
      where q.id = assignment_mcq_options.question_id
        and a.published = true
        and public.current_user_can_access_course(a.course_id)
    )
    or (
      public.current_user_role() in ('admin', 'teacher')
      and (
        public.current_user_role() = 'admin'
        or exists (
          select 1
          from public.assignment_questions q
          join public.assignments a on a.id = q.assignment_id
          join public.courses c on c.id = a.course_id
          where q.id = assignment_mcq_options.question_id
            and c.teacher_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "assignment_submissions_student_insert_own" on public.assignment_submissions;
create policy "assignment_submissions_student_insert_own"
  on public.assignment_submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.current_user_can_submit_assignments()
    and exists (
      select 1
      from public.assignments a
      where a.id = assignment_submissions.assignment_id
        and a.published = true
        and public.current_user_can_access_course(a.course_id)
    )
  );

-- Announcements (course-scoped: subscription + level, not enrollment)
drop policy if exists "announcements_student_select" on public.announcements;
create policy "announcements_student_select"
  on public.announcements for select to authenticated
  using (
    published = true
    and visible_until >= now()
    and (
      course_id is null
      or public.current_user_can_access_course(announcements.course_id)
    )
  );

drop policy if exists "announcement_reads_student_insert_own" on public.announcement_reads;
create policy "announcement_reads_student_insert_own"
  on public.announcement_reads for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.announcements a
      where a.id = announcement_reads.announcement_id
        and a.published = true
        and a.visible_until >= now()
        and (
          a.course_id is null
          or public.current_user_can_access_course(a.course_id)
        )
    )
  );

-- Assignment file storage
drop policy if exists "storage_assignment_files_select" on storage.objects;
create policy "storage_assignment_files_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'assignment-files'
    and (
      exists (
        select 1
        from public.assignments a
        where a.id = nullif(split_part(name, '/', 1), '')::uuid
          and a.published = true
          and public.current_user_can_access_course(a.course_id)
      )
      or (
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
