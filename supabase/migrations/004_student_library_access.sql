-- =============================================================================
-- Students include library access with school fees; library fee is library-user only
-- =============================================================================

-- Shared override / mode helpers used by resource-specific blocking
create or replace function public.user_access_override_blocks(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_access text;
begin
  select p.resource_access into v_access
  from public.profiles p
  where p.id = p_user_id;

  return coalesce(v_access = 'denied', true);
end;
$$;

create or replace function public.user_access_override_allows(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_access text;
begin
  select p.resource_access into v_access
  from public.profiles p
  where p.id = p_user_id;

  return coalesce(v_access = 'granted', false);
end;
$$;

-- Course / assignment blocking (students only)
create or replace function public.user_is_course_blocked(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_mode text;
begin
  select p.role into v_role from public.profiles p where p.id = p_user_id;

  if v_role is null then
    return true;
  end if;

  if v_role in ('admin', 'teacher') then
    return false;
  end if;

  if v_role <> 'student' then
    return true;
  end if;

  if public.user_access_override_allows(p_user_id) then
    return false;
  end if;

  if public.user_access_override_blocks(p_user_id) then
    return true;
  end if;

  v_mode := public.access_blocking_mode();
  if v_mode = 'manual' then
    return false;
  end if;

  return public.student_course_total_owed(p_user_id) > 0;
end;
$$;

-- Library blocking (library users pay library fee; students include library with school fees)
create or replace function public.user_is_library_blocked(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_mode text;
begin
  select p.role into v_role from public.profiles p where p.id = p_user_id;

  if v_role is null then
    return true;
  end if;

  if v_role in ('admin', 'teacher') then
    return false;
  end if;

  if public.user_access_override_allows(p_user_id) then
    return false;
  end if;

  if public.user_access_override_blocks(p_user_id) then
    return true;
  end if;

  -- Students get library access with school fees — no separate library fee
  if v_role = 'student' then
    return false;
  end if;

  if v_role <> 'library_user' then
    return true;
  end if;

  v_mode := public.access_blocking_mode();
  if v_mode = 'manual' then
    return false;
  end if;

  return public.library_user_total_owed(p_user_id) > 0;
end;
$$;

-- Backward-compatible aggregate: blocked for the user's primary paid resources
create or replace function public.user_is_resource_blocked(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select p.role into v_role from public.profiles p where p.id = p_user_id;

  if v_role = 'student' then
    return public.user_is_course_blocked(p_user_id);
  elsif v_role = 'library_user' then
    return public.user_is_library_blocked(p_user_id);
  elsif v_role in ('admin', 'teacher') then
    return false;
  end if;

  return true;
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
    and not public.user_is_library_blocked(auth.uid());
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
    and not public.user_is_course_blocked(auth.uid());
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
    and not public.user_is_course_blocked(auth.uid());
$$;

create or replace function public.get_user_access_status(p_user_id uuid)
returns jsonb
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
  v_course_blocked boolean;
  v_library_blocked boolean;
  v_blocked boolean;
  v_effective text;
begin
  select p.role, p.resource_access
  into v_role, v_access
  from public.profiles p
  where p.id = p_user_id;

  if v_role is null then
    return jsonb_build_object('error', 'user_not_found');
  end if;

  v_mode := public.access_blocking_mode();
  v_owed := public.user_total_owed(p_user_id);
  v_course_blocked := public.user_is_course_blocked(p_user_id);
  v_library_blocked := public.user_is_library_blocked(p_user_id);
  v_blocked := public.user_is_resource_blocked(p_user_id);

  if v_blocked then
    if v_access = 'denied' then
      v_effective := 'blocked_manual';
    elsif v_mode = 'automatic' and v_owed > 0 then
      v_effective := 'blocked_fees';
    else
      v_effective := 'blocked';
    end if;
  else
    if v_access = 'granted' and v_mode = 'automatic' and v_owed > 0 then
      v_effective := 'allowed_override';
    elsif v_access = 'granted' then
      v_effective := 'allowed_manual';
    else
      v_effective := 'allowed';
    end if;
  end if;

  return jsonb_build_object(
    'role', v_role,
    'resource_access', v_access,
    'access_blocking_mode', v_mode,
    'total_owed', v_owed,
    'is_blocked', v_blocked,
    'is_course_blocked', v_course_blocked,
    'is_library_blocked', v_library_blocked,
    'library_included_with_school_fees', v_role = 'student',
    'effective_state', v_effective
  );
end;
$$;

grant execute on function public.user_access_override_blocks(uuid) to authenticated;
grant execute on function public.user_access_override_allows(uuid) to authenticated;
grant execute on function public.user_is_course_blocked(uuid) to authenticated;
grant execute on function public.user_is_library_blocked(uuid) to authenticated;
