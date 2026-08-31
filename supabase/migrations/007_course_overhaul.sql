-- =============================================================================
-- Course overhaul: overview, lesson resources, course comments, remove level
-- =============================================================================

-- Remove auto forum room on course create
drop trigger if exists trg_create_room_for_new_course on public.courses;

-- Course overview (rich HTML learning objectives)
alter table public.courses
  add column if not exists learning_objectives text;

-- Overview videos (external links; open in app)
create table if not exists public.course_overview_videos (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_overview_videos_course
  on public.course_overview_videos(course_id, sort_order);

-- Lesson resources (multiple per lesson)
create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  resource_type text not null check (
    resource_type in ('video', 'audio', 'pdf', 'doc', 'image', 'link', 'slides')
  ),
  title text,
  url text not null,
  source_kind text not null default 'external' check (source_kind in ('external', 'upload')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_lesson_resources_lesson
  on public.lesson_resources(lesson_id, sort_order);

-- Migrate legacy single PDF per lesson
insert into public.lesson_resources (
  lesson_id, resource_type, title, url, source_kind, sort_order
)
select
  l.id,
  'pdf',
  coalesce(nullif(trim(l.title), ''), 'Lesson PDF'),
  l.file_url,
  'upload',
  0
from public.lessons l
where l.file_url is not null
  and trim(l.file_url) <> ''
  and not exists (
    select 1 from public.lesson_resources r where r.lesson_id = l.id
  );

-- Per-course discussion comments
create table if not exists public.course_comments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_comments_course
  on public.course_comments(course_id, created_at desc);

-- Assignment question type: allow document uploads (same flow as open_pdf)
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'assignment_question_type'
      and e.enumlabel = 'open_doc'
  ) then
    alter type public.assignment_question_type add value 'open_doc';
  end if;
end $$;

-- Remove course level (no longer used)
drop policy if exists "courses_select_students_with_access" on public.courses;

create policy "courses_select_students_with_access"
  on public.courses for select to authenticated
  using (public.current_user_has_course_access());

drop view if exists public.v_course_fees;
create view public.v_course_fees as
select
  c.id as course_id,
  c.title as course_title,
  c.active,
  c.created_at as course_created_at,
  f.id as fee_id,
  f.amount as fee_amount,
  f.currency,
  f.notes,
  f.updated_at as fee_updated_at
from public.courses c
left join public.course_fees f on f.course_id = c.id
order by c.created_at, c.id;

grant select on public.v_course_fees to authenticated;

alter table public.courses drop column if exists level;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.course_overview_videos enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.course_comments enable row level security;

drop policy if exists "course_overview_videos_read" on public.course_overview_videos;
create policy "course_overview_videos_read"
  on public.course_overview_videos for select to authenticated
  using (true);

drop policy if exists "course_overview_videos_admin_teacher_write"
  on public.course_overview_videos;
create policy "course_overview_videos_admin_teacher_write"
  on public.course_overview_videos for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

drop policy if exists "lesson_resources_read" on public.lesson_resources;
create policy "lesson_resources_read"
  on public.lesson_resources for select to authenticated
  using (true);

drop policy if exists "lesson_resources_admin_teacher_write" on public.lesson_resources;
create policy "lesson_resources_admin_teacher_write"
  on public.lesson_resources for all to authenticated
  using (public.current_user_role() in ('admin', 'teacher'))
  with check (public.current_user_role() in ('admin', 'teacher'));

drop policy if exists "course_comments_read" on public.course_comments;
create policy "course_comments_read"
  on public.course_comments for select to authenticated
  using (
    public.current_user_role() in ('admin', 'teacher', 'student', 'library_user')
  );

drop policy if exists "course_comments_insert" on public.course_comments;
create policy "course_comments_insert"
  on public.course_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_role() in ('admin', 'teacher', 'student')
  );

drop policy if exists "course_comments_update_own" on public.course_comments;
create policy "course_comments_update_own"
  on public.course_comments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "course_comments_delete" on public.course_comments;
create policy "course_comments_delete"
  on public.course_comments for delete to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'teacher')
  );

grant select on public.course_overview_videos to authenticated;
grant select on public.lesson_resources to authenticated;
grant select on public.course_comments to authenticated;

-- Refresh course access without level gating
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

create or replace view public.v_course_detail as
select
  c.id,
  c.title,
  c.description,
  c.learning_objectives,
  c.teacher_id,
  c.course_cover_url,
  c.active,
  c.price_amount,
  c.currency,
  c.created_at,
  c.updated_at
from public.courses c;

grant select on public.v_course_detail to authenticated;
