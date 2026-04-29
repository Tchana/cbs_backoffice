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

