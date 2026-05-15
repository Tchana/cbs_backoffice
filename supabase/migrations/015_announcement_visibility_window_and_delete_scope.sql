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

