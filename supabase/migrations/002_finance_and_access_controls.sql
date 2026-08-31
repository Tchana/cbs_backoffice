-- Incremental migration for existing CBS databases.
-- Safe to re-run (idempotent where possible).

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

insert into public.app_settings (key, value)
values
  ('payment_collection_mode', jsonb_build_object('mode', 'manual')),
  ('access_blocking_mode', jsonb_build_object('mode', 'manual'))
on conflict (key) do nothing;

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
