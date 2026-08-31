-- =============================================================================
-- Center for Biblical Studies — full database schema (fresh install)
-- =============================================================================
-- Run once on an empty Supabase project (SQL Editor or: supabase db reset).
--
-- Includes: profiles, courses, lessons, books, blogs, forum, assignments,
-- announcements, course-fee ledger, app settings, storage policies.
--
-- Storage buckets (create in Dashboard > Storage, public read if using getPublicUrl):
--   avatars, course-covers, lesson-files, book-covers, book-files, blog-images,
--   assignment-files, assignment-submissions
--
-- After first signup, promote an admin:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- =============================================================================

create extension if not exists "pgcrypto";


-- ----- from 001_initial_schema.sql -----
-- Profiles: extends auth.users with app-specific fields (role, name, avatar)
-- Run this in Supabase SQL Editor after enabling Email auth in Authentication > Providers

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  role text not null default 'teacher' check (role in ('teacher', 'student', 'admin')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName'),
    coalesce(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName'),
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level text,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  course_cover_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Lessons
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  file_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Books
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  category text,
  book_cover_url text,
  book_file_url text,
  description text,
  language text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Blogs
create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  content text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: enable and allow authenticated users to read/write (adjust policies for production)
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.books enable row level security;
alter table public.blogs enable row level security;

-- Profiles: authenticated users can read/insert/update/delete (dashboard manages users)
create policy "Authenticated can manage profiles"
  on public.profiles for all to authenticated using (true) with check (true);

-- Courses, lessons, books, blogs: full access for authenticated (admin app)
create policy "Authenticated can manage courses"
  on public.courses for all to authenticated using (true) with check (true);
create policy "Authenticated can manage lessons"
  on public.lessons for all to authenticated using (true) with check (true);
create policy "Authenticated can manage books"
  on public.books for all to authenticated using (true) with check (true);
create policy "Authenticated can manage blogs"
  on public.blogs for all to authenticated using (true) with check (true);

-- Storage: create buckets in Dashboard > Storage (or run below).
-- Buckets: avatars, course-covers, lesson-files, book-covers, book-files, blog-images
-- For each bucket: Public = true if you want public read URLs; add policy "Authenticated users can upload"
--   (Storage > bucket > Policies > New policy > "Allow authenticated uploads").

-- Optional: make first user an admin (run after first signup, replace USER_UUID):
-- update public.profiles set role = 'admin' where id = 'USER_UUID';


-- ----- from 002_rls_admin_teacher.sql -----
-- RLS: Admins have full CRUD on all tables (profiles, courses, lessons, books, blogs).
-- Teachers: full CRUD on lessons only; select (view) only on profiles, courses, books, blogs.
-- Run this after 001_initial_schema.sql (drops existing permissive policies and adds role-based ones).

-- Helper: current user's role (bypasses RLS so policies can use it)
create or replace function public.current_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- ========== DROP OLD POLICIES ==========
drop policy if exists "Authenticated can manage profiles" on public.profiles;
drop policy if exists "Authenticated can manage courses" on public.courses;
drop policy if exists "Authenticated can manage lessons" on public.lessons;
drop policy if exists "Authenticated can manage books" on public.books;
drop policy if exists "Authenticated can manage blogs" on public.blogs;

-- ========== PROFILES ==========
-- Admins: full access. Teachers: select only (view users/students/teachers).
create policy "profiles_select_admin_teacher"
  on public.profiles for select to authenticated
  using ( (public.current_user_role()) in ('admin', 'teacher') );

create policy "profiles_insert_admin"
  on public.profiles for insert to authenticated
  with check ( (public.current_user_role()) = 'admin' );

create policy "profiles_update_admin"
  on public.profiles for update to authenticated
  using ( (public.current_user_role()) = 'admin' )
  with check ( (public.current_user_role()) = 'admin' );

create policy "profiles_delete_admin"
  on public.profiles for delete to authenticated
  using ( (public.current_user_role()) = 'admin' );

-- ========== COURSES ==========
-- Admins: full. Teachers: select only.
create policy "courses_select_admin_teacher"
  on public.courses for select to authenticated
  using ( (public.current_user_role()) in ('admin', 'teacher') );

create policy "courses_insert_admin"
  on public.courses for insert to authenticated
  with check ( (public.current_user_role()) = 'admin' );

create policy "courses_update_admin"
  on public.courses for update to authenticated
  using ( (public.current_user_role()) = 'admin' )
  with check ( (public.current_user_role()) = 'admin' );

create policy "courses_delete_admin"
  on public.courses for delete to authenticated
  using ( (public.current_user_role()) = 'admin' );

-- ========== LESSONS ==========
-- Admins and teachers: full CRUD.
create policy "lessons_select_admin_teacher"
  on public.lessons for select to authenticated
  using ( (public.current_user_role()) in ('admin', 'teacher') );

create policy "lessons_insert_admin_teacher"
  on public.lessons for insert to authenticated
  with check ( (public.current_user_role()) in ('admin', 'teacher') );

create policy "lessons_update_admin_teacher"
  on public.lessons for update to authenticated
  using ( (public.current_user_role()) in ('admin', 'teacher') )
  with check ( (public.current_user_role()) in ('admin', 'teacher') );

create policy "lessons_delete_admin_teacher"
  on public.lessons for delete to authenticated
  using ( (public.current_user_role()) in ('admin', 'teacher') );

-- ========== BOOKS ==========
-- Admins: full. Teachers: select only.
create policy "books_select_admin_teacher"
  on public.books for select to authenticated
  using ( (public.current_user_role()) in ('admin', 'teacher') );

create policy "books_insert_admin"
  on public.books for insert to authenticated
  with check ( (public.current_user_role()) = 'admin' );

create policy "books_update_admin"
  on public.books for update to authenticated
  using ( (public.current_user_role()) = 'admin' )
  with check ( (public.current_user_role()) = 'admin' );

create policy "books_delete_admin"
  on public.books for delete to authenticated
  using ( (public.current_user_role()) = 'admin' );

-- ========== BLOGS ==========
-- Admins: full. Teachers: select only.
create policy "blogs_select_admin_teacher"
  on public.blogs for select to authenticated
  using ( (public.current_user_role()) in ('admin', 'teacher') );

create policy "blogs_insert_admin"
  on public.blogs for insert to authenticated
  with check ( (public.current_user_role()) = 'admin' );

create policy "blogs_update_admin"
  on public.blogs for update to authenticated
  using ( (public.current_user_role()) = 'admin' )
  with check ( (public.current_user_role()) = 'admin' );

create policy "blogs_delete_admin"
  on public.blogs for delete to authenticated
  using ( (public.current_user_role()) = 'admin' );


-- ----- from 003_add_missing_columns.sql -----
-- Add columns that may be missing if DB was created from an older schema.
-- Safe to run: IF NOT EXISTS prevents errors when columns already exist.

-- Courses
alter table public.courses
  add column if not exists course_cover_url text;

-- Books
alter table public.books
  add column if not exists book_cover_url text;
alter table public.books
  add column if not exists book_file_url text;


-- ----- from 004_current_user_role_lower.sql -----
-- Make role comparison case-insensitive so 'Admin' / 'Teacher' in DB still match RLS.
-- Run after 002_rls_admin_teacher.sql.

create or replace function public.current_user_role()
returns text as $$
  select lower(trim(role)) from public.profiles where id = auth.uid();
$$ language sql security definer stable;


-- ----- from 005_storage_policies.sql -----
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


-- ----- from 006_add_profile_phone.sql -----
-- Add phone number support to user profiles.
alter table public.profiles
  add column if not exists phone text;


-- ----- from 007_assignments_enrollments_active_and_grading.sql -----
-- =============================================================================
-- Assignments, enrollments, course active flag, and MCQ auto-grading
-- =============================================================================
-- Run this migration in Supabase SQL Editor after applying previous migrations
-- in `cbs_backoffice/supabase/migrations`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Course "active" flag (controls enrollability)
-- -----------------------------------------------------------------------------
alter table public.courses
  add column if not exists active boolean not null default true;

-- -----------------------------------------------------------------------------
-- 2) Enrollments (student self-enroll)
-- -----------------------------------------------------------------------------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (course_id, student_id)
);

alter table public.enrollments enable row level security;

-- Students can only see their own enrollments; teachers/admin can see for their courses.
create policy "enrollments_select_student_or_teacher"
  on public.enrollments for select to authenticated
  using (
    student_id = auth.uid()
    or (
      public.current_user_role() in ('admin', 'teacher')
      and exists (
        select 1
        from public.courses c
        where c.id = enrollments.course_id
          and (
            public.current_user_role() = 'admin'
            or c.teacher_id = auth.uid()
          )
      )
    )
  );

-- Student self-enroll instantly (only active courses)
create policy "enrollments_student_insert_own"
  on public.enrollments for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.courses c
      where c.id = enrollments.course_id
        and c.active = true
    )
  );

-- -----------------------------------------------------------------------------
-- 3) Assignments (attach to courses and/or lessons)
-- -----------------------------------------------------------------------------
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),

  -- Required: always tied to a course
  course_id uuid not null references public.courses(id) on delete cascade,
  -- Optional: ties assignment to a specific lesson (lesson must belong to course)
  lesson_id uuid references public.lessons(id) on delete set null,

  title text not null,
  description text,

  -- Optional material PDF (teacher uploads; students download/view)
  pdf_url text,

  published boolean not null default false,
  due_date timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.assignments enable row level security;

create index if not exists idx_assignments_course_id on public.assignments(course_id);
create index if not exists idx_assignments_lesson_id on public.assignments(lesson_id);
create index if not exists idx_assignments_published on public.assignments(published);

-- Ensure NEW.lesson_id (if set) belongs to NEW.course_id
create or replace function public.assignments_validate_lesson_course()
returns trigger as $$
begin
  if new.lesson_id is not null then
    if not exists (
      select 1
      from public.lessons l
      where l.id = new.lesson_id
        and l.course_id = new.course_id
    ) then
      raise exception 'lesson_id (%) does not belong to course_id (%)', new.lesson_id, new.course_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assignments_validate_lesson_course on public.assignments;
create trigger trg_assignments_validate_lesson_course
  before insert or update
  on public.assignments
  for each row execute procedure public.assignments_validate_lesson_course();

-- Teacher/admin can manage assignments for their courses.
-- Students can read only published assignments for courses they are enrolled in.
create policy "assignments_select_student_or_teacher"
  on public.assignments for select to authenticated
  using (
    published = true
    and exists (
      select 1
      from public.enrollments e
      where e.course_id = assignments.course_id
        and e.student_id = auth.uid()
    )
    and exists (
      select 1
      from public.courses c
      where c.id = assignments.course_id
        and c.active = true
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

create policy "assignments_insert_teacher_or_admin"
  on public.assignments for insert to authenticated
  with check (
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
  );

create policy "assignments_update_teacher_or_admin"
  on public.assignments for update to authenticated
  using (
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
  with check (true);

-- -----------------------------------------------------------------------------
-- 4) Assignment questions
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'assignment_question_type') then
    create type public.assignment_question_type as enum ('mcq_single', 'open_pdf');
  end if;
end $$;

create table if not exists public.assignment_questions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  type public.assignment_question_type not null,
  prompt text not null,
  order_index int not null default 0,
  points numeric not null default 1,
  created_at timestamptz default now()
);

alter table public.assignment_questions enable row level security;
create index if not exists idx_assignment_questions_assignment on public.assignment_questions(assignment_id);
create index if not exists idx_assignment_questions_type on public.assignment_questions(type);

create policy "assignment_questions_select_student_or_teacher"
  on public.assignment_questions for select to authenticated
  using (
    exists (
      select 1
      from public.assignments a
      where a.id = assignment_questions.assignment_id
        and a.published = true
        and exists (
          select 1
          from public.enrollments e
          where e.course_id = a.course_id
            and e.student_id = auth.uid()
        )
        and exists (
          select 1
          from public.courses c
          where c.id = a.course_id
            and c.active = true
        )
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

create policy "assignment_questions_insert_teacher_or_admin"
  on public.assignment_questions for insert to authenticated
  with check (
    public.current_user_role() in ('admin', 'teacher')
    and exists (
      select 1
      from public.assignments a
      where a.id = assignment_questions.assignment_id
        and (
          public.current_user_role() = 'admin'
          or exists (
            select 1
            from public.courses c
            where c.id = a.course_id
              and c.teacher_id = auth.uid()
          )
        )
    )
  );

create policy "assignment_questions_update_teacher_or_admin"
  on public.assignment_questions for update to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and exists (
      select 1
      from public.assignments a
      where a.id = assignment_questions.assignment_id
        and (
          public.current_user_role() = 'admin'
          or exists (
            select 1
            from public.courses c
            where c.id = a.course_id
              and c.teacher_id = auth.uid()
          )
        )
    )
  )
  with check (true);

-- -----------------------------------------------------------------------------
-- 5) MCQ options (public)
-- -----------------------------------------------------------------------------
create table if not exists public.assignment_mcq_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assignment_questions(id) on delete cascade,
  option_text text not null,
  order_index int not null default 0
);

alter table public.assignment_mcq_options enable row level security;
create index if not exists idx_assignment_mcq_options_question on public.assignment_mcq_options(question_id);

create policy "assignment_mcq_options_select_student_or_teacher"
  on public.assignment_mcq_options for select to authenticated
  using (
    exists (
      select 1
      from public.assignment_questions q
      join public.assignments a on a.id = q.assignment_id
      where q.id = assignment_mcq_options.question_id
        and a.published = true
        and exists (
          select 1
          from public.enrollments e
          where e.course_id = a.course_id
            and e.student_id = auth.uid()
        )
        and exists (
          select 1
          from public.courses c
          where c.id = a.course_id
            and c.active = true
        )
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

create policy "assignment_mcq_options_insert_teacher_or_admin"
  on public.assignment_mcq_options for insert to authenticated
  with check (
    public.current_user_role() in ('admin', 'teacher')
    and exists (
      select 1
      from public.assignment_questions q
      join public.assignments a on a.id = q.assignment_id
      where q.id = assignment_mcq_options.question_id
        and (
          public.current_user_role() = 'admin'
          or exists (
            select 1
            from public.courses c
            where c.id = a.course_id
              and c.teacher_id = auth.uid()
          )
        )
    )
  );

create policy "assignment_mcq_options_update_teacher_or_admin"
  on public.assignment_mcq_options for update to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and exists (
      select 1
      from public.assignment_questions q
      join public.assignments a on a.id = q.assignment_id
      where q.id = assignment_mcq_options.question_id
        and (
          public.current_user_role() = 'admin'
          or exists (
            select 1
            from public.courses c
            where c.id = a.course_id
              and c.teacher_id = auth.uid()
          )
        )
    )
  )
  with check (true);

-- -----------------------------------------------------------------------------
-- 6) MCQ correct keys (teacher-only)
-- -----------------------------------------------------------------------------
create table if not exists public.assignment_mcq_correct (
  question_id uuid primary key references public.assignment_questions(id) on delete cascade,
  correct_option_id uuid not null references public.assignment_mcq_options(id) on delete cascade
);

alter table public.assignment_mcq_correct enable row level security;
create policy "assignment_mcq_correct_no_student_select"
  on public.assignment_mcq_correct for select to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1
        from public.assignment_questions q
        join public.assignments a on a.id = q.assignment_id
        join public.courses c on c.id = a.course_id
        where q.id = assignment_mcq_correct.question_id
          and c.teacher_id = auth.uid()
      )
    )
  );

create policy "assignment_mcq_correct_teacher_write"
  on public.assignment_mcq_correct for all to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1
        from public.assignment_questions q
        join public.assignments a on a.id = q.assignment_id
        join public.courses c on c.id = a.course_id
        where q.id = assignment_mcq_correct.question_id
          and c.teacher_id = auth.uid()
      )
    )
  )
  with check (true);

-- -----------------------------------------------------------------------------
-- 7) Student submissions (exactly one per assignment)
-- -----------------------------------------------------------------------------
create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  submitted_at timestamptz default now(),

  mcq_score_total numeric not null default 0,
  open_score_total numeric,
  final_score_total numeric,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (assignment_id, student_id)
);

alter table public.assignment_submissions enable row level security;
create index if not exists idx_assignment_submissions_assignment on public.assignment_submissions(assignment_id);

create policy "assignment_submissions_student_select_own"
  on public.assignment_submissions for select to authenticated
  using (
    student_id = auth.uid()
  );

create policy "assignment_submissions_student_insert_own"
  on public.assignment_submissions for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.assignments a
      join public.enrollments e on e.course_id = a.course_id and e.student_id = auth.uid()
      join public.courses c on c.id = a.course_id
      where a.id = assignment_submissions.assignment_id
        and a.published = true
        and c.active = true
    )
  );

create policy "assignment_submissions_teacher_select"
  on public.assignment_submissions for select to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1
        from public.assignments a
        join public.courses c on c.id = a.course_id
        where a.id = assignment_submissions.assignment_id
          and c.teacher_id = auth.uid()
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 8) Student answers (per question; MCQ auto-grading)
-- -----------------------------------------------------------------------------
create table if not exists public.assignment_submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assignment_submissions(id) on delete cascade,
  question_id uuid not null references public.assignment_questions(id) on delete cascade,

  selected_option_id uuid references public.assignment_mcq_options(id) on delete set null,
  student_answer_pdf_url text,

  -- Auto-graded for MCQ
  mcq_is_correct boolean,
  mcq_points_awarded numeric not null default 0,

  -- Manual grading for open_pdf
  teacher_points numeric,
  teacher_feedback text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (submission_id, question_id)
);

alter table public.assignment_submission_answers enable row level security;
create index if not exists idx_assignment_submission_answers_submission on public.assignment_submission_answers(submission_id);
create index if not exists idx_assignment_submission_answers_question on public.assignment_submission_answers(question_id);

-- Student can read their own answers.
create policy "submission_answers_student_select_own"
  on public.assignment_submission_answers for select to authenticated
  using (
    exists (
      select 1
      from public.assignment_submissions s
      where s.id = assignment_submission_answers.submission_id
        and s.student_id = auth.uid()
    )
  );

-- Student can insert their answers exactly once per question (unique constraint).
-- Note: grading fields are set by DB triggers.
create policy "submission_answers_student_insert_own"
  on public.assignment_submission_answers for insert to authenticated
  with check (
    exists (
      select 1
      from public.assignment_submissions s
      join public.assignment_questions q on q.id = assignment_submission_answers.question_id
      where s.id = assignment_submission_answers.submission_id
        and s.student_id = auth.uid()
        and q.assignment_id = s.assignment_id
    )
  );

-- Teacher/admin can read answers for submissions in their courses.
create policy "submission_answers_teacher_select"
  on public.assignment_submission_answers for select to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1
        from public.assignment_submissions s
        join public.assignments a on a.id = s.assignment_id
        join public.courses c on c.id = a.course_id
        where s.id = assignment_submission_answers.submission_id
          and c.teacher_id = auth.uid()
      )
    )
  );

-- Teacher/admin can update open_pdf grading (per question).
create policy "submission_answers_teacher_update_grading"
  on public.assignment_submission_answers for update to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1
        from public.assignment_submissions s
        join public.assignments a on a.id = s.assignment_id
        join public.courses c on c.id = a.course_id
        where s.id = assignment_submission_answers.submission_id
          and c.teacher_id = auth.uid()
      )
    )
  )
  with check (true);

-- -----------------------------------------------------------------------------
-- 9) Triggers: MCQ grading and submission totals recalculation
-- -----------------------------------------------------------------------------

create or replace function public.grade_mcq_single_answer()
returns trigger as $$
declare
  q_type public.assignment_question_type;
  correct_option uuid;
  q_points numeric;
begin
  select type, points into q_type, q_points
  from public.assignment_questions
  where id = new.question_id;

  if q_type = 'mcq_single' then
    select correct.correct_option_id into correct_option
    from public.assignment_mcq_correct correct
    where correct.question_id = new.question_id;

    if correct_option is not null and new.selected_option_id is not null and new.selected_option_id = correct_option then
      new.mcq_is_correct := true;
      new.mcq_points_awarded := coalesce(q_points, 1);
    else
      new.mcq_is_correct := false;
      new.mcq_points_awarded := 0;
    end if;

    -- Student answers for open_pdf live in student_answer_pdf_url only.
    -- For MCQs, we ignore any student_answer_pdf_url.
  else
    -- open_pdf: MCQ grading fields unused
    new.mcq_is_correct := null;
    new.mcq_points_awarded := 0;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_grade_mcq_single_answer on public.assignment_submission_answers;
create trigger trg_grade_mcq_single_answer
  before insert or update
  on public.assignment_submission_answers
  for each row
  execute procedure public.grade_mcq_single_answer();

create or replace function public.recalc_submission_scores(p_submission_id uuid)
returns void as $$
declare
  v_mcq numeric;
  v_open numeric;
begin
  select coalesce(sum(a.mcq_points_awarded), 0)
    into v_mcq
  from public.assignment_submission_answers a
  where a.submission_id = p_submission_id;

  select sum(a.teacher_points)
    into v_open
  from public.assignment_submission_answers a
  where a.submission_id = p_submission_id
    and a.teacher_points is not null;

  update public.assignment_submissions s
  set
    mcq_score_total = v_mcq,
    open_score_total = v_open,
    final_score_total = v_mcq + coalesce(v_open, 0)
  where s.id = p_submission_id;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_recalc_submission_scores_wrapper on public.assignment_submission_answers;
create or replace function public.trg_recalc_submission_scores_wrapper()
returns trigger as $$
begin
  perform public.recalc_submission_scores(new.submission_id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_recalc_submission_scores2 on public.assignment_submission_answers;
create trigger trg_recalc_submission_scores2
  after insert or update
  on public.assignment_submission_answers
  for each row
  execute procedure public.trg_recalc_submission_scores_wrapper();

-- -----------------------------------------------------------------------------
-- 10) Ownership columns: updated_at refresh (optional)
-- -----------------------------------------------------------------------------
-- We keep updated_at handling minimal; existing app code typically relies on
-- created_at/row selection. If needed, add updated_at triggers later.



-- ----- from 008_storage_assignment_buckets_policies.sql -----
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



-- ----- from 009_announcements_and_reads.sql -----
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



-- ----- from 010_course_auto_forum_room.sql -----
-- =============================================================================
-- Auto-create forum room on course creation
-- =============================================================================

create or replace function public.create_room_for_new_course()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only run when forum rooms table exists in this environment.
  if to_regclass('public.rooms') is null then
    return new;
  end if;

  insert into public.rooms (name, description, is_private, created_by)
  values (
    new.title,
    coalesce(new.description, 'Course discussion for ' || new.title),
    false,
    new.teacher_id
  );

  return new;
exception
  when others then
    -- Never block course insertion due to forum room issues.
    return new;
end;
$$;

drop trigger if exists trg_create_room_for_new_course on public.courses;
create trigger trg_create_room_for_new_course
after insert on public.courses
for each row
execute function public.create_room_for_new_course();



-- ----- from 014_access_subscription_and_library_tiers.sql -----
-- =============================================================================
-- Access model: library tiers + subscriptions + level-based school access
-- =============================================================================

alter table public.profiles
  add column if not exists subscription_type text not null default 'none',
  add column if not exists school_max_level integer not null default 0;

do $$
declare
  v_role_constraint text;
begin
  -- Replace old role check to include library_user.
  select conname
  into v_role_constraint
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%'
  limit 1;

  if v_role_constraint is not null then
    execute format('alter table public.profiles drop constraint %I', v_role_constraint);
  end if;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('teacher', 'student', 'admin', 'library_user'));
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_subscription_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_subscription_type_check
      check (subscription_type in ('none', 'library_user', 'student'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_school_max_level_non_negative'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_school_max_level_non_negative
      check (school_max_level >= 0);
  end if;
end $$;

alter table public.books
  add column if not exists access_tier text not null default 'public';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'books_access_tier_check'
      and conrelid = 'public.books'::regclass
  ) then
    alter table public.books
      add constraint books_access_tier_check
      check (access_tier in ('public', 'subscriber'));
  end if;
end $$;



-- ----- from 015_announcement_visibility_window_and_delete_scope.sql -----
-- =============================================================================
-- Announcement visibility windows + stricter teacher delete scope
-- =============================================================================

alter table public.announcements
  add column if not exists visible_for_days integer not null default 7,
  add column if not exists visible_until timestamptz;

update public.announcements
set visible_for_days = 7
where visible_for_days is null;

update public.announcements
set visible_until = created_at + make_interval(days => coalesce(visible_for_days, 7))
where visible_until is null;

alter table public.announcements
  alter column visible_until set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'announcements_visible_for_days_check'
      and conrelid = 'public.announcements'::regclass
  ) then
    alter table public.announcements
      add constraint announcements_visible_for_days_check
      check (visible_for_days in (1, 3, 7, 14, 30));
  end if;
end $$;

create or replace function public.tg_set_announcement_visible_until()
returns trigger
language plpgsql
as $$
begin
  new.visible_for_days := coalesce(new.visible_for_days, 7);
  new.visible_until := now() + make_interval(days => new.visible_for_days);
  return new;
end;
$$;

drop trigger if exists trg_set_announcement_visible_until on public.announcements;
create trigger trg_set_announcement_visible_until
before insert or update of visible_for_days on public.announcements
for each row
execute function public.tg_set_announcement_visible_until();

drop policy if exists "announcements_student_select" on public.announcements;
create policy "announcements_student_select"
  on public.announcements for select to authenticated
  using (
    published = true
    and visible_until >= now()
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

drop policy if exists "announcements_teacher_admin_delete" on public.announcements;
create policy "announcements_teacher_admin_delete"
  on public.announcements for delete to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or created_by = auth.uid()
    )
  );



-- ----- from 017_paid_access_rls_gating.sql -----
-- =============================================================================
-- Paid access enforcement (RLS gating) for mobile consumption
-- =============================================================================
--
-- Current setup (001/002) was primarily backoffice-oriented:
-- - courses/books/blogs were select-able by admin/teacher only
-- This migration adds student/library_user read policies required by mobile,
-- and enforces subscriber-only book access by subscription status.

-- Helper: current user subscription_type (bypasses RLS)
create or replace function public.current_user_subscription_type()
returns text as $$
  select subscription_type from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper: whether current user has library access
create or replace function public.current_user_has_library_access()
returns boolean as $$
  select public.current_user_subscription_type() in ('student','library_user');
$$ language sql security definer stable;

-- Helper: whether current user has student (courses) access
create or replace function public.current_user_has_course_access()
returns boolean as $$
  select public.current_user_subscription_type() = 'student';
$$ language sql security definer stable;

-- =========================
-- COURSES (mobile read)
-- =========================
drop policy if exists "courses_select_students_with_access" on public.courses;
create policy "courses_select_students_with_access"
  on public.courses for select to authenticated
  using (
    public.current_user_has_course_access()
    -- Optionally restrict further by level/max level at app layer.
  );

-- =========================
-- LESSONS (mobile read)
-- =========================
drop policy if exists "lessons_select_students_with_access" on public.lessons;
create policy "lessons_select_students_with_access"
  on public.lessons for select to authenticated
  using (public.current_user_has_course_access());

-- =========================
-- BOOKS (mobile read with tier gating)
-- =========================
-- Assumes `books.access_tier` from migration 014 (public/subscriber)
drop policy if exists "books_select_paid_gating" on public.books;
create policy "books_select_paid_gating"
  on public.books for select to authenticated
  using (
    public.current_user_role() in ('admin','teacher')
    or (
      coalesce(access_tier, 'public') = 'public'
      or (
        coalesce(access_tier, 'public') = 'subscriber'
        and public.current_user_has_library_access()
      )
    )
  );



-- ----- from 022_remove_course_enrollment.sql -----
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


-- ----- from 023_teacher_profile_fields.sql -----
-- =============================================================================
-- Teacher profile fields (vocation, testimony, journey/parcours)
-- =============================================================================

alter table public.profiles
  add column if not exists vocation text,
  add column if not exists testimony text,
  add column if not exists journey text;



-- ----- from 020_subscription_payments_toggle.sql -----
-- =============================================================================
-- Global toggle: allow in-app subscription payments vs admin-only grants
-- =============================================================================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read_authenticated" on public.app_settings;
create policy "app_settings_read_authenticated"
  on public.app_settings for select to authenticated
  using (true);

drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
  on public.app_settings for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

insert into public.app_settings (key, value)
values ('subscription_payments_enabled', jsonb_build_object('enabled', false))
on conflict (key) do nothing;

create or replace function public.subscription_payments_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (s.value->>'enabled')::boolean
      from public.app_settings s
      where s.key = 'subscription_payments_enabled'
    ),
    false
  );
$$;

create or replace function public.set_subscription_payments_enabled(p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change subscription payment settings';
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (
    'subscription_payments_enabled',
    jsonb_build_object('enabled', coalesce(p_enabled, false)),
    now(),
    auth.uid()
  )
  on conflict (key) do update
  set value = jsonb_build_object('enabled', coalesce(p_enabled, false)),
      updated_at = now(),
      updated_by = auth.uid();
end;
$$;

grant execute on function public.subscription_payments_enabled() to authenticated;
grant execute on function public.set_subscription_payments_enabled(boolean) to authenticated;


-- ----- from 024_student_course_payments.sql -----
-- =============================================================================
-- Course payments ledger (separate from subscription + legacy student_fee_*)
-- Admin records deposits and manually assigns amounts per course.
-- Unassigned deposit remainder is credit for future courses (by course created_at).
-- =============================================================================

create table if not exists public.student_course_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  currency text not null default 'XAF',
  payment_method text not null default 'cash' check (
    payment_method in ('cash', 'mobile_money', 'bank_transfer', 'card', 'other')
  ),
  reference text,
  notes text,
  operation_date timestamptz not null default now(),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  void_reason text
);

create table if not exists public.student_course_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  payment_id uuid references public.student_course_payments(id) on delete set null,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount integer not null check (amount > 0),
  currency text not null default 'XAF',
  source text not null default 'payment' check (source in ('payment', 'credit')),
  operation_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  void_reason text
);

create index if not exists idx_student_course_payments_student
  on public.student_course_payments(student_id, operation_date desc);
create index if not exists idx_student_course_allocations_student
  on public.student_course_payment_allocations(student_id, course_id);
create index if not exists idx_student_course_allocations_payment
  on public.student_course_payment_allocations(payment_id);

alter table public.student_course_payments enable row level security;
alter table public.student_course_payment_allocations enable row level security;

drop policy if exists "student_course_payments_admin_teacher_all"
  on public.student_course_payments;
create policy "student_course_payments_admin_teacher_all"
  on public.student_course_payments for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

drop policy if exists "student_course_allocations_admin_teacher_all"
  on public.student_course_payment_allocations;
create policy "student_course_allocations_admin_teacher_all"
  on public.student_course_payment_allocations for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

-- Helpers ---------------------------------------------------------------------

create or replace function public.student_course_payment_credit(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((
      select sum(p.amount)::integer
      from public.student_course_payments p
      where p.student_id = p_student_id
        and p.voided_at is null
    ), 0)
    - coalesce((
      select sum(a.amount)::integer
      from public.student_course_payment_allocations a
      where a.student_id = p_student_id
        and a.voided_at is null
    ), 0);
$$;

create or replace function public.student_course_paid_amount(
  p_student_id uuid,
  p_course_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(a.amount), 0)::integer
  from public.student_course_payment_allocations a
  where a.student_id = p_student_id
    and a.course_id = p_course_id
    and a.voided_at is null;
$$;

create or replace function public.student_course_outstanding(
  p_student_id uuid,
  p_course_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce((
      select c.price_amount
      from public.courses c
      where c.id = p_course_id
    ), 0)
    - public.student_course_paid_amount(p_student_id, p_course_id),
    0
  );
$$;

-- Record deposit + manual per-course allocations (remainder = credit) ---------

create or replace function public.record_student_course_payment(
  p_student_id uuid,
  p_amount integer,
  p_allocations jsonb default '[]'::jsonb,
  p_currency text default 'XAF',
  p_payment_method text default 'cash',
  p_reference text default null,
  p_notes text default null,
  p_operation_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_alloc_total integer := 0;
  v_row jsonb;
  v_course_id uuid;
  v_alloc_amount integer;
  v_outstanding integer;
  v_price integer;
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be > 0';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_student_id and p.role = 'student'
  ) then
    raise exception 'Student not found';
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    v_course_id := nullif(trim(v_row->>'course_id'), '')::uuid;
    v_alloc_amount := (v_row->>'amount')::integer;

    if v_course_id is null or v_alloc_amount is null or v_alloc_amount <= 0 then
      raise exception 'Each allocation needs course_id and a positive amount';
    end if;

    select c.price_amount into v_price
    from public.courses c
    where c.id = v_course_id;

    if v_price is null then
      raise exception 'Course not found: %', v_course_id;
    end if;

    v_outstanding := public.student_course_outstanding(p_student_id, v_course_id);
    if v_alloc_amount > v_outstanding then
      raise exception 'Allocation % XAF exceeds outstanding % XAF for course',
        v_alloc_amount, v_outstanding;
    end if;

    v_alloc_total := v_alloc_total + v_alloc_amount;
  end loop;

  if v_alloc_total > p_amount then
    raise exception 'Total allocated % XAF exceeds payment % XAF', v_alloc_total, p_amount;
  end if;

  insert into public.student_course_payments (
    student_id, amount, currency, payment_method, reference, notes,
    operation_date, paid_at, created_by
  )
  values (
    p_student_id, p_amount, coalesce(nullif(trim(p_currency), ''), 'XAF'),
    coalesce(nullif(trim(p_payment_method), ''), 'cash'),
    p_reference, p_notes, p_operation_date, now(), auth.uid()
  )
  returning id into v_payment_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    v_course_id := nullif(trim(v_row->>'course_id'), '')::uuid;
    v_alloc_amount := (v_row->>'amount')::integer;

    insert into public.student_course_payment_allocations (
      student_id, payment_id, course_id, amount, currency, source,
      operation_date, created_by
    )
    values (
      p_student_id, v_payment_id, v_course_id, v_alloc_amount,
      coalesce(nullif(trim(p_currency), ''), 'XAF'),
      'payment', p_operation_date, auth.uid()
    );
  end loop;

  return v_payment_id;
end;
$$;

-- Apply existing credit to a course (no new deposit) --------------------------

create or replace function public.apply_student_course_credit(
  p_student_id uuid,
  p_course_id uuid,
  p_amount integer,
  p_operation_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation_id uuid;
  v_credit integer;
  v_outstanding integer;
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be > 0';
  end if;

  v_credit := public.student_course_payment_credit(p_student_id);
  if p_amount > v_credit then
    raise exception 'Insufficient credit. Available: % XAF', v_credit;
  end if;

  v_outstanding := public.student_course_outstanding(p_student_id, p_course_id);
  if p_amount > v_outstanding then
    raise exception 'Amount exceeds course outstanding balance (% XAF)', v_outstanding;
  end if;

  insert into public.student_course_payment_allocations (
    student_id, payment_id, course_id, amount, currency, source,
    operation_date, created_by
  )
  values (
    p_student_id, null, p_course_id, p_amount, 'XAF', 'credit',
    p_operation_date, auth.uid()
  )
  returning id into v_allocation_id;

  return v_allocation_id;
end;
$$;

-- Void payment (cascades void on its allocations) ----------------------------

create or replace function public.void_student_course_payment(
  p_payment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  update public.student_course_payments
  set voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
  where id = p_payment_id and voided_at is null;

  update public.student_course_payment_allocations
  set voided_at = now(), voided_by = auth.uid(), void_reason = coalesce(p_reason, 'Payment voided')
  where payment_id = p_payment_id and voided_at is null;
end;
$$;

create or replace function public.void_student_course_allocation(
  p_allocation_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  update public.student_course_payment_allocations
  set voided_at = now(), voided_by = auth.uid(), void_reason = p_reason
  where id = p_allocation_id and voided_at is null;
end;
$$;

-- Views -----------------------------------------------------------------------

create or replace view public.v_student_course_payment_summary as
select
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.email,
  coalesce(bal.total_course_price, 0) as total_course_price,
  coalesce(bal.total_allocated, 0) as total_allocated,
  coalesce(bal.total_owed, 0) as total_owed,
  coalesce(pay_totals.total_deposits, 0) as total_deposits,
  coalesce(pay_totals.total_deposits, 0) - coalesce(bal.total_allocated, 0) as credit_balance,
  pay_totals.last_payment_at
from public.profiles p
left join (
  select
    s.id as student_id,
    sum(c.price_amount)::integer as total_course_price,
    coalesce(sum(paid.amount_paid), 0)::integer as total_allocated,
    sum(greatest(c.price_amount - coalesce(paid.amount_paid, 0), 0))::integer as total_owed
  from public.profiles s
  cross join public.courses c
  left join (
    select
      a.student_id,
      a.course_id,
      sum(a.amount)::integer as amount_paid
    from public.student_course_payment_allocations a
    where a.voided_at is null
    group by a.student_id, a.course_id
  ) paid on paid.student_id = s.id and paid.course_id = c.id
  where s.role = 'student'
    and coalesce(c.active, true) = true
  group by s.id
) bal on bal.student_id = p.id
left join (
  select
    pay.student_id,
    sum(pay.amount)::integer as total_deposits,
    max(pay.operation_date) as last_payment_at
  from public.student_course_payments pay
  where pay.voided_at is null
  group by pay.student_id
) pay_totals on pay_totals.student_id = p.id
where p.role = 'student';

create or replace view public.v_student_course_balances as
select
  s.student_id,
  c.id as course_id,
  c.title as course_title,
  c.created_at as course_created_at,
  c.price_amount as course_price,
  c.currency,
  coalesce(paid.amount_paid, 0)::integer as amount_paid,
  greatest(c.price_amount - coalesce(paid.amount_paid, 0), 0)::integer as balance_due
from (
  select distinct p.id as student_id
  from public.profiles p
  where p.role = 'student'
) s
cross join public.courses c
left join (
  select
    a.student_id,
    a.course_id,
    sum(a.amount)::integer as amount_paid
  from public.student_course_payment_allocations a
  where a.voided_at is null
  group by a.student_id, a.course_id
) paid on paid.student_id = s.student_id and paid.course_id = c.id
where coalesce(c.active, true) = true
order by s.student_id, c.created_at asc, c.id asc;

grant execute on function public.record_student_course_payment(uuid, integer, jsonb, text, text, text, text, timestamptz)
  to authenticated;
grant execute on function public.apply_student_course_credit(uuid, uuid, integer, timestamptz)
  to authenticated;
grant execute on function public.void_student_course_payment(uuid, text) to authenticated;
grant execute on function public.void_student_course_allocation(uuid, text) to authenticated;
grant execute on function public.student_course_payment_credit(uuid) to authenticated;


-- ----- from 026_course_fee_amount.sql -----
-- Superseded by 027_course_fees_table.sql (dedicated course_fees table).
-- Course fee (for manual student course payment tracking; suggested default when admin adds a fee)

alter table public.courses
  add column if not exists fee_amount integer;

update public.courses
set fee_amount = coalesce(fee_amount, price_amount, 0)
where fee_amount is null;

alter table public.courses
  alter column fee_amount set default 0;

alter table public.courses
  alter column fee_amount set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_fee_amount_non_negative'
  ) then
    alter table public.courses
      add constraint courses_fee_amount_non_negative
      check (fee_amount >= 0);
  end if;
end $$;

comment on column public.courses.fee_amount is
  'Default course fee in smallest currency unit (XAF). Admin may override per student when recording obligations.';


-- ----- from 027_course_fees_table.sql -----
-- =============================================================================
-- Per-course fees in a dedicated table (not on courses.fee_amount)
-- =============================================================================

create table if not exists public.course_fees (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null unique references public.courses(id) on delete cascade,
  amount integer not null check (amount > 0),
  currency text not null default 'XAF',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_course_fees_course on public.course_fees(course_id);

alter table public.course_fees enable row level security;

drop policy if exists "course_fees_admin_teacher_all" on public.course_fees;
create policy "course_fees_admin_teacher_all"
  on public.course_fees for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

drop trigger if exists trg_course_fees_updated_at on public.course_fees;
create trigger trg_course_fees_updated_at
before update on public.course_fees
for each row execute function public.tg_set_updated_at();

-- Migrate from courses.fee_amount / price_amount when present
insert into public.course_fees (course_id, amount, currency)
select
  c.id,
  greatest(coalesce(c.fee_amount, c.price_amount, 0), 1),
  coalesce(c.currency, 'XAF')
from public.courses c
where coalesce(c.fee_amount, c.price_amount, 0) > 0
on conflict (course_id) do nothing;

alter table public.courses drop constraint if exists courses_fee_amount_non_negative;
alter table public.courses drop column if exists fee_amount;

create or replace function public.upsert_course_fee(
  p_course_id uuid,
  p_amount integer,
  p_currency text default 'XAF',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Fee amount must be > 0';
  end if;

  if not exists (select 1 from public.courses c where c.id = p_course_id) then
    raise exception 'Course not found';
  end if;

  insert into public.course_fees (course_id, amount, currency, notes, created_by)
  values (
    p_course_id,
    p_amount,
    coalesce(nullif(trim(p_currency), ''), 'XAF'),
    p_notes,
    auth.uid()
  )
  on conflict (course_id) do update
  set
    amount = excluded.amount,
    currency = excluded.currency,
    notes = coalesce(excluded.notes, public.course_fees.notes),
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_course_fee(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  delete from public.course_fees where course_id = p_course_id;
end;
$$;

create or replace view public.v_course_fees as
select
  c.id as course_id,
  c.title as course_title,
  c.level,
  c.active,
  c.created_at as course_created_at,
  f.id as fee_id,
  f.amount as fee_amount,
  f.currency,
  f.notes,
  f.updated_at as fee_updated_at
from public.courses c
left join public.course_fees f on f.course_id = c.id
order by c.created_at asc, c.id asc;

grant execute on function public.upsert_course_fee(uuid, integer, text, text) to authenticated;
grant execute on function public.delete_course_fee(uuid) to authenticated;


-- ----- from 028_course_fees_in_payment_rpc.sql -----
-- Use course_fees catalog for outstanding balance and payment validation

create or replace function public.student_course_outstanding(
  p_student_id uuid,
  p_course_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce(
      (
        select f.amount
        from public.course_fees f
        where f.course_id = p_course_id
      ),
      (
        select c.price_amount
        from public.courses c
        where c.id = p_course_id
      ),
      0
    )
    - public.student_course_paid_amount(p_student_id, p_course_id),
    0
  );
$$;

create or replace function public.record_student_course_payment(
  p_student_id uuid,
  p_amount integer,
  p_allocations jsonb default '[]'::jsonb,
  p_currency text default 'XAF',
  p_payment_method text default 'cash',
  p_reference text default null,
  p_notes text default null,
  p_operation_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_alloc_total integer := 0;
  v_row jsonb;
  v_course_id uuid;
  v_alloc_amount integer;
  v_outstanding integer;
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_student_id and p.role = 'student'
  ) then
    raise exception 'Student not found';
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    v_course_id := nullif(trim(v_row->>'course_id'), '')::uuid;
    v_alloc_amount := (v_row->>'amount')::integer;

    if v_course_id is null or v_alloc_amount is null or v_alloc_amount <= 0 then
      raise exception 'Each allocation needs course_id and a positive amount';
    end if;

    if not exists (select 1 from public.courses c where c.id = v_course_id) then
      raise exception 'Course not found: %', v_course_id;
    end if;

    if not exists (select 1 from public.course_fees f where f.course_id = v_course_id) then
      raise exception 'No catalog fee set for course %. Add it under Course fees.', v_course_id;
    end if;

    v_outstanding := public.student_course_outstanding(p_student_id, v_course_id);
    if v_alloc_amount > v_outstanding then
      raise exception 'Allocation % XAF exceeds outstanding % XAF for course',
        v_alloc_amount, v_outstanding;
    end if;

    v_alloc_total := v_alloc_total + v_alloc_amount;
  end loop;

  if v_alloc_total <= 0 then
    raise exception 'Select at least one course to pay for';
  end if;

  if p_amount is null or p_amount <= 0 then
    p_amount := v_alloc_total;
  elsif p_amount <> v_alloc_total then
    raise exception 'Deposit amount % XAF must equal the sum of course fees % XAF',
      p_amount, v_alloc_total;
  end if;

  insert into public.student_course_payments (
    student_id, amount, currency, payment_method, reference, notes,
    operation_date, paid_at, created_by
  )
  values (
    p_student_id, p_amount, coalesce(nullif(trim(p_currency), ''), 'XAF'),
    coalesce(nullif(trim(p_payment_method), ''), 'cash'),
    p_reference, p_notes, p_operation_date, now(), auth.uid()
  )
  returning id into v_payment_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    v_course_id := nullif(trim(v_row->>'course_id'), '')::uuid;
    v_alloc_amount := (v_row->>'amount')::integer;

    insert into public.student_course_payment_allocations (
      student_id, payment_id, course_id, amount, currency, source,
      operation_date, created_by
    )
    values (
      p_student_id, v_payment_id, v_course_id, v_alloc_amount,
      coalesce(nullif(trim(p_currency), ''), 'XAF'),
      'payment', p_operation_date, auth.uid()
    );
  end loop;

  return v_payment_id;
end;
$$;

create or replace view public.v_student_course_balances as
select
  s.student_id,
  c.id as course_id,
  c.title as course_title,
  c.created_at as course_created_at,
  coalesce(f.amount, c.price_amount, 0)::integer as course_price,
  coalesce(f.currency, c.currency, 'XAF') as currency,
  coalesce(paid.amount_paid, 0)::integer as amount_paid,
  greatest(
    coalesce(f.amount, c.price_amount, 0) - coalesce(paid.amount_paid, 0),
    0
  )::integer as balance_due
from (
  select distinct p.id as student_id
  from public.profiles p
  where p.role = 'student'
) s
cross join public.courses c
left join public.course_fees f on f.course_id = c.id
left join (
  select
    a.student_id,
    a.course_id,
    sum(a.amount)::integer as amount_paid
  from public.student_course_payment_allocations a
  where a.voided_at is null
  group by a.student_id, a.course_id
) paid on paid.student_id = s.student_id and paid.course_id = c.id
where coalesce(c.active, true) = true
order by s.student_id, c.created_at asc, c.id asc;


-- ----- from 029_fix_course_payment_summary_totals.sql -----
-- Only courses with a catalog fee count; totals = sum of per-course balances.

create or replace view public.v_student_course_balances as
select
  s.student_id,
  c.id as course_id,
  c.title as course_title,
  c.created_at as course_created_at,
  f.amount::integer as course_price,
  f.currency,
  coalesce(paid.amount_paid, 0)::integer as amount_paid,
  greatest(f.amount - coalesce(paid.amount_paid, 0), 0)::integer as balance_due
from (
  select distinct p.id as student_id
  from public.profiles p
  where p.role = 'student'
) s
cross join public.courses c
inner join public.course_fees f on f.course_id = c.id
left join (
  select
    a.student_id,
    a.course_id,
    sum(a.amount)::integer as amount_paid
  from public.student_course_payment_allocations a
  where a.voided_at is null
  group by a.student_id, a.course_id
) paid on paid.student_id = s.student_id and paid.course_id = c.id
where coalesce(c.active, true) = true
order by s.student_id, c.created_at asc, c.id asc;

create or replace function public.student_course_outstanding(
  p_student_id uuid,
  p_course_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce(
      (select f.amount from public.course_fees f where f.course_id = p_course_id),
      0
    )
    - public.student_course_paid_amount(p_student_id, p_course_id),
    0
  );
$$;

create or replace view public.v_student_course_payment_summary as
select
  p.id as student_id,
  p.first_name,
  p.last_name,
  p.email,
  coalesce(bal.total_course_price, 0) as total_course_price,
  coalesce(bal.total_allocated, 0) as total_allocated,
  coalesce(bal.total_owed, 0) as total_owed,
  coalesce(pay_totals.total_deposits, 0) as total_deposits,
  coalesce(pay_totals.total_deposits, 0) - coalesce(alloc_totals.total_allocated, 0) as credit_balance,
  pay_totals.last_payment_at
from public.profiles p
left join (
  select
    b.student_id,
    sum(b.course_price)::integer as total_course_price,
    sum(b.amount_paid)::integer as total_allocated,
    sum(b.balance_due)::integer as total_owed
  from public.v_student_course_balances b
  group by b.student_id
) bal on bal.student_id = p.id
left join (
  select
    pay.student_id,
    sum(pay.amount)::integer as total_deposits,
    max(pay.operation_date) as last_payment_at
  from public.student_course_payments pay
  where pay.voided_at is null
  group by pay.student_id
) pay_totals on pay_totals.student_id = p.id
left join (
  select
    a.student_id,
    sum(a.amount)::integer as total_allocated
  from public.student_course_payment_allocations a
  where a.voided_at is null
  group by a.student_id
) alloc_totals on alloc_totals.student_id = p.id
where p.role = 'student';


-- ----- from 030_deposit_waterfall_allocation.sql -----
-- Deposits: any amount; auto-allocate to courses in creation order (waterfall). Remainder = credit.

create or replace function public.record_student_course_payment(
  p_student_id uuid,
  p_amount integer,
  p_allocations jsonb default '[]'::jsonb,
  p_currency text default 'XAF',
  p_payment_method text default 'cash',
  p_reference text default null,
  p_notes text default null,
  p_operation_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_remaining integer;
  v_course record;
  v_outstanding integer;
  v_apply integer;
  v_manual_total integer := 0;
  v_row jsonb;
  v_course_id uuid;
  v_alloc_amount integer;
begin
  if public.current_user_role() not in ('admin', 'teacher') then
    raise exception 'Not authorized';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be > 0';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_student_id and p.role = 'student'
  ) then
    raise exception 'Student not found';
  end if;

  insert into public.student_course_payments (
    student_id, amount, currency, payment_method, reference, notes,
    operation_date, paid_at, created_by
  )
  values (
    p_student_id, p_amount, coalesce(nullif(trim(p_currency), ''), 'XAF'),
    coalesce(nullif(trim(p_payment_method), ''), 'cash'),
    p_reference, p_notes, p_operation_date, now(), auth.uid()
  )
  returning id into v_payment_id;

  -- Optional manual lines (non-empty JSON array); otherwise waterfall by course created_at
  if coalesce(jsonb_array_length(p_allocations), 0) > 0 then
    for v_row in select * from jsonb_array_elements(p_allocations)
    loop
      v_course_id := nullif(trim(v_row->>'course_id'), '')::uuid;
      v_alloc_amount := (v_row->>'amount')::integer;

      if v_course_id is null or v_alloc_amount is null or v_alloc_amount <= 0 then
        raise exception 'Each allocation needs course_id and a positive amount';
      end if;

      v_outstanding := public.student_course_outstanding(p_student_id, v_course_id);
      if v_alloc_amount > v_outstanding then
        raise exception 'Allocation % XAF exceeds outstanding % XAF for course',
          v_alloc_amount, v_outstanding;
      end if;

      v_manual_total := v_manual_total + v_alloc_amount;

      insert into public.student_course_payment_allocations (
        student_id, payment_id, course_id, amount, currency, source,
        operation_date, created_by
      )
      values (
        p_student_id, v_payment_id, v_course_id, v_alloc_amount,
        coalesce(nullif(trim(p_currency), ''), 'XAF'),
        'payment', p_operation_date, auth.uid()
      );
    end loop;

    if v_manual_total > p_amount then
      raise exception 'Total allocated % XAF exceeds deposit % XAF', v_manual_total, p_amount;
    end if;
  else
    v_remaining := p_amount;

    for v_course in
      select c.id as course_id
      from public.courses c
      inner join public.course_fees f on f.course_id = c.id
      where coalesce(c.active, true) = true
      order by c.created_at asc, c.id asc
    loop
      exit when v_remaining <= 0;

      v_outstanding := public.student_course_outstanding(p_student_id, v_course.course_id);
      if v_outstanding <= 0 then
        continue;
      end if;

      v_apply := least(v_remaining, v_outstanding);

      insert into public.student_course_payment_allocations (
        student_id, payment_id, course_id, amount, currency, source,
        operation_date, created_by
      )
      values (
        p_student_id, v_payment_id, v_course.course_id, v_apply,
        coalesce(nullif(trim(p_currency), ''), 'XAF'),
        'payment', p_operation_date, auth.uid()
      );

      v_remaining := v_remaining - v_apply;
    end loop;
  end if;

  return v_payment_id;
end;
$$;


-- ----- from 031_student_course_balance_for_app.sql -----
-- Mobile app home screen: same "amount owed" as Finance → Course payments (total_owed).

create or replace function public.get_my_course_total_owed()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.total_owed::integer
      from public.v_student_course_payment_summary s
      where s.student_id = auth.uid()
    ),
    0
  );
$$;

grant execute on function public.get_my_course_total_owed() to authenticated;

comment on function public.get_my_course_total_owed() is
  'Sum of per-course balance_due for the logged-in student (matches backoffice Course payments).';


-- ----- from 032_admin_whatsapp_setting.sql -----
-- WhatsApp number for students to request course-fee payments (mobile app home screen).

insert into public.app_settings (key, value)
values (
  'admin_whatsapp_number',
  jsonb_build_object('number', '')
)
on conflict (key) do nothing;

comment on table public.app_settings is
  'Global settings. admin_whatsapp_number.value.number = international digits for payment WhatsApp.';


-- ----- from 033_remove_subscription_access_gating.sql -----
-- Stop using paid subscription / finance state for content access.
-- Historical payment tables stay in place; access is now role-based.
-- Apply this after wiping client/backoffice billing UI.

create or replace function public.current_user_subscription_type()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'none'
  );
$$;

create or replace function public.current_user_subscription_access_state()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'full';
$$;

create or replace function public.current_user_has_library_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('student', 'library_user', 'teacher', 'admin');
$$;

create or replace function public.current_user_has_course_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('student', 'teacher', 'admin');
$$;

create or replace function public.current_user_school_max_level()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select 999;
$$;

create or replace function public.current_user_can_submit_assignments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('student', 'teacher', 'admin');
$$;

create or replace function public.current_user_can_access_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_has_course_access()
    and exists (
      select 1
      from public.courses c
      where c.id = p_course_id
        and c.active = true
    );
$$;


-- ----- from 034_finance_and_access_controls.sql -----
-- =============================================================================
-- Finance payment collection mode + resource access controls
-- =============================================================================

-- Per-user manual grant/deny override (used when access_blocking_mode = manual,
-- or as admin override when access_blocking_mode = automatic).
alter table public.profiles
  add column if not exists resource_access text not null default 'default';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_resource_access_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_resource_access_check
      check (resource_access in ('default', 'granted', 'denied'));
  end if;
end $$;

comment on column public.profiles.resource_access is
  'default = follow blocking mode rules; granted = always allow; denied = always block';

-- Global settings -------------------------------------------------------------

insert into public.app_settings (key, value)
values
  ('payment_collection_mode', jsonb_build_object('mode', 'manual')),
  ('access_blocking_mode', jsonb_build_object('mode', 'manual'))
on conflict (key) do nothing;

-- Setting readers / writers ---------------------------------------------------

create or replace function public.payment_collection_mode()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.value->>'mode'
      from public.app_settings s
      where s.key = 'payment_collection_mode'
    ),
    'manual'
  );
$$;

create or replace function public.set_payment_collection_mode(p_mode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change payment collection mode';
  end if;

  if p_mode not in ('manual', 'automatic') then
    raise exception 'Invalid payment collection mode';
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (
    'payment_collection_mode',
    jsonb_build_object('mode', p_mode),
    now(),
    auth.uid()
  )
  on conflict (key) do update
  set value = jsonb_build_object('mode', p_mode),
      updated_at = now(),
      updated_by = auth.uid();

  -- Keep legacy toggle aligned for future in-app payment integrations.
  perform public.set_subscription_payments_enabled(p_mode = 'automatic');
end;
$$;

create or replace function public.access_blocking_mode()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.value->>'mode'
      from public.app_settings s
      where s.key = 'access_blocking_mode'
    ),
    'manual'
  );
$$;

create or replace function public.set_access_blocking_mode(p_mode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change access blocking mode';
  end if;

  if p_mode not in ('manual', 'automatic') then
    raise exception 'Invalid access blocking mode';
  end if;

  insert into public.app_settings (key, value, updated_at, updated_by)
  values (
    'access_blocking_mode',
    jsonb_build_object('mode', p_mode),
    now(),
    auth.uid()
  )
  on conflict (key) do update
  set value = jsonb_build_object('mode', p_mode),
      updated_at = now(),
      updated_by = auth.uid();
end;
$$;

-- Access helpers --------------------------------------------------------------

create or replace function public.student_course_total_owed(p_student_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select s.total_owed::integer
      from public.v_student_course_payment_summary s
      where s.student_id = p_student_id
    ),
    0
  );
$$;

create or replace function public.user_is_resource_blocked(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_access text;
  v_mode text;
  v_owed integer;
begin
  select p.role, p.resource_access
  into v_role, v_access
  from public.profiles p
  where p.id = p_user_id;

  if v_role is null then
    return true;
  end if;

  -- Staff always have access.
  if v_role in ('admin', 'teacher') then
    return false;
  end if;

  if v_access = 'granted' then
    return false;
  end if;

  if v_access = 'denied' then
    return true;
  end if;

  v_mode := public.access_blocking_mode();

  if v_mode = 'manual' then
    return false;
  end if;

  v_owed := public.student_course_total_owed(p_user_id);
  return v_owed > 0;
end;
$$;

create or replace function public.set_user_resource_access(
  p_user_id uuid,
  p_access text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change user resource access';
  end if;

  if p_access not in ('default', 'granted', 'denied') then
    raise exception 'Invalid resource access value';
  end if;

  update public.profiles
  set resource_access = p_access,
      updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

-- Restore access gating (role + blocking rules) -------------------------------

create or replace function public.current_user_subscription_access_state()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.user_is_resource_blocked(auth.uid()) then 'suspended'
    else 'full'
  end;
$$;

create or replace function public.current_user_has_library_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_role() in ('student', 'library_user', 'teacher', 'admin')
    and not public.user_is_resource_blocked(auth.uid());
$$;

create or replace function public.current_user_has_course_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_role() in ('student', 'teacher', 'admin')
    and not public.user_is_resource_blocked(auth.uid());
$$;

create or replace function public.current_user_can_submit_assignments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_role() in ('student', 'teacher', 'admin')
    and not public.user_is_resource_blocked(auth.uid());
$$;

create or replace function public.current_user_can_access_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_has_course_access()
    and exists (
      select 1
      from public.courses c
      where c.id = p_course_id
        and c.active = true
    );
$$;

grant execute on function public.payment_collection_mode() to authenticated;
grant execute on function public.set_payment_collection_mode(text) to authenticated;
grant execute on function public.access_blocking_mode() to authenticated;
grant execute on function public.set_access_blocking_mode(text) to authenticated;
grant execute on function public.student_course_total_owed(uuid) to authenticated;
grant execute on function public.user_is_resource_blocked(uuid) to authenticated;
grant execute on function public.set_user_resource_access(uuid, text) to authenticated;


-- =============================================================================
-- Forum (mobile app) + book_category enum + get_enum_values
-- =============================================================================

do $$ begin
  create type public.book_category as enum (
    'bible', 'commentary', 'dictionnaire', 'concordance', 'other'
  );
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists bio text,
  add column if not exists online_status boolean default false,
  add column if not exists last_seen timestamptz;

alter table public.lessons
  add column if not exists sort_order integer default 0,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  is_private boolean default false,
  is_deleted boolean default false,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.room_participants (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (room_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  message_type text default 'text',
  is_deleted boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_rooms_created_by on public.rooms(created_by);
create index if not exists idx_rooms_is_deleted on public.rooms(is_deleted) where is_deleted = false;
create index if not exists idx_messages_room_id on public.messages(room_id);
create index if not exists idx_messages_room_created on public.messages(room_id, created_at desc);

alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Rooms are viewable by authenticated users" on public.rooms;
create policy "Rooms are viewable by authenticated users"
  on public.rooms for select to authenticated using (is_deleted = false);

drop policy if exists "Authenticated users can create rooms" on public.rooms;
create policy "Authenticated users can create rooms"
  on public.rooms for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "Room creator can update room" on public.rooms;
create policy "Room creator can update room"
  on public.rooms for update to authenticated using (auth.uid() = created_by);

drop policy if exists "Room participants viewable by authenticated" on public.room_participants;
create policy "Room participants viewable by authenticated"
  on public.room_participants for select to authenticated using (true);

drop policy if exists "Users can join rooms" on public.room_participants;
create policy "Users can join rooms"
  on public.room_participants for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can leave rooms" on public.room_participants;
create policy "Users can leave rooms"
  on public.room_participants for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Messages viewable by authenticated users" on public.messages;
create policy "Messages viewable by authenticated users"
  on public.messages for select to authenticated using (true);

drop policy if exists "Authenticated users can send messages" on public.messages;
create policy "Authenticated users can send messages"
  on public.messages for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can soft-delete own messages" on public.messages;
create policy "Users can soft-delete own messages"
  on public.messages for update to authenticated using (auth.uid() = user_id);

create or replace function public.get_enum_values(enum_name text)
returns table(value text, sort_order real)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select e.enumlabel::text, e.enumsortorder::real
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typname = enum_name
  order by e.enumsortorder;
$$;

grant execute on function public.get_enum_values(text) to authenticated;

-- Course catalog pricing columns (used by finance views as fallback)
alter table public.courses
  add column if not exists price_amount integer not null default 0,
  add column if not exists currency text not null default 'XAF';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_price_amount_non_negative'
  ) then
    alter table public.courses
      add constraint courses_price_amount_non_negative check (price_amount >= 0);
  end if;
end $$;

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
  before update on public.courses
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_rooms_updated_at on public.rooms;
create trigger trg_rooms_updated_at
  before update on public.rooms
  for each row execute function public.tg_set_updated_at();


-- =============================================================================
-- Final access model (role-based; matches current Flutter app)
-- Finance settings RPCs stay available for backoffice without blocking content.
-- =============================================================================

create or replace function public.current_user_subscription_type()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'none');
$$;

create or replace function public.current_user_subscription_access_state()
returns text language sql stable security definer set search_path = public as $$
  select 'full';
$$;

create or replace function public.current_user_has_library_access()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('student', 'library_user', 'teacher', 'admin');
$$;

create or replace function public.current_user_has_course_access()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('student', 'teacher', 'admin');
$$;

create or replace function public.current_user_school_max_level()
returns integer language sql stable security definer set search_path = public as $$
  select 999;
$$;

create or replace function public.current_user_can_submit_assignments()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_role() in ('student', 'teacher', 'admin');
$$;

create or replace function public.current_user_can_access_course(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_user_has_course_access()
    and exists (
      select 1 from public.courses c
      where c.id = p_course_id and c.active = true
    );
$$;

drop policy if exists "courses_select_students_with_access" on public.courses;
create policy "courses_select_students_with_access"
  on public.courses for select to authenticated
  using (public.current_user_has_course_access() and active = true);

drop policy if exists "books_select_paid_gating" on public.books;
create policy "books_select_paid_gating"
  on public.books for select to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher', 'student', 'library_user')
  );

drop policy if exists "assignments_delete_teacher_or_admin" on public.assignments;
create policy "assignments_delete_teacher_or_admin"
  on public.assignments for delete to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher')
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1 from public.courses c
        where c.id = assignments.course_id and c.teacher_id = auth.uid()
      )
    )
  );

drop policy if exists "announcement_reads_student_update_own" on public.announcement_reads;
create policy "announcement_reads_student_update_own"
  on public.announcement_reads for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
    coalesce(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'student'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(excluded.first_name, public.profiles.first_name),
    last_name = coalesce(excluded.last_name, public.profiles.last_name),
    updated_at = now();
  return new;
end;
$$;

insert into public.app_settings (key, value) values
  ('subscription_payments_enabled', jsonb_build_object('enabled', false)),
  ('admin_whatsapp_number', jsonb_build_object('number', '')),
  ('payment_collection_mode', jsonb_build_object('mode', 'manual')),
  ('access_blocking_mode', jsonb_build_object('mode', 'manual'))
on conflict (key) do nothing;

