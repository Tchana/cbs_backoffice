-- Make role comparison case-insensitive so 'Admin' / 'Teacher' in DB still match RLS.
-- Run after 002_rls_admin_teacher.sql.

create or replace function public.current_user_role()
returns text as $$
  select lower(trim(role)) from public.profiles where id = auth.uid();
$$ language sql security definer stable;
