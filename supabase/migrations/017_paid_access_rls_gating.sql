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

