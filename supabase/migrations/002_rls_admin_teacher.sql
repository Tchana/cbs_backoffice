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
