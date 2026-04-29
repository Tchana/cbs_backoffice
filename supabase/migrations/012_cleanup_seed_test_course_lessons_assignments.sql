-- =============================================================================
-- Cleanup seeded QA test data
-- =============================================================================
-- Removes only the test data created by:
--   011_seed_test_course_lessons_assignments.sql
--
-- Safe behavior:
--   - Targets one specific seeded course title.
--   - Deletes dependent enrollments first.
--   - Deletes course (cascades to lessons/assignments/questions/options/submissions).
--   - Removes auto-created forum room that uses same seeded course title.
-- =============================================================================

do $$
declare
  v_seed_course_title text := 'QA Test Course - Foundations of Biblical Studies';
  v_deleted_courses int := 0;
  v_deleted_rooms int := 0;
begin
  -- 1) Remove enrollments tied to seeded course(s) explicitly
  delete from public.enrollments e
  using public.courses c
  where e.course_id = c.id
    and c.title = v_seed_course_title;

  -- 2) Remove seeded course(s)
  --    This cascades to lessons, assignments, questions, options, keys, submissions, answers.
  delete from public.courses c
  where c.title = v_seed_course_title;
  get diagnostics v_deleted_courses = row_count;

  -- 3) Remove forum room generated from seeded course title (best effort)
  if to_regclass('public.rooms') is not null then
    delete from public.rooms r
    where r.name = v_seed_course_title;
    get diagnostics v_deleted_rooms = row_count;
  end if;

  raise notice 'Cleanup finished. deleted_courses=%, deleted_rooms=%',
    v_deleted_courses, v_deleted_rooms;
end $$;

