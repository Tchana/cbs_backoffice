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

