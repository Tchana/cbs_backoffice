-- =============================================================================
-- Seed test data: 1 course + lessons + 3 assignments
-- =============================================================================
-- Purpose:
--   Create a complete sample flow for testing enrollments, assignments,
--   MCQ grading, and open PDF submission.
--
-- Notes:
--   - This script expects at least one teacher profile to exist.
--   - If a student profile exists, it auto-enrolls that student.
--   - It removes any previous seed course with the same title first.
-- =============================================================================

do $$
declare
  v_teacher_id uuid;
  v_student_id uuid;

  v_course_id uuid;
  v_lesson_1_id uuid;
  v_lesson_2_id uuid;
  v_lesson_3_id uuid;

  v_assignment_1_id uuid;
  v_assignment_2_id uuid;
  v_assignment_3_id uuid;

  v_q1_id uuid;
  v_q2_id uuid;
  v_q3_id uuid;
  v_q4_id uuid;
  v_q5_id uuid;
  v_q6_id uuid;
  v_q7_id uuid;

  v_q1_opt_a uuid;
  v_q1_opt_b uuid;
  v_q1_opt_c uuid;
  v_q3_opt_a uuid;
  v_q3_opt_b uuid;
  v_q3_opt_c uuid;
  v_q5_opt_a uuid;
  v_q5_opt_b uuid;
  v_q5_opt_c uuid;
begin
  -- 1) Resolve test teacher and optional test student
  select p.id
  into v_teacher_id
  from public.profiles p
  where p.role = 'teacher'
  order by p.created_at asc
  limit 1;

  if v_teacher_id is null then
    raise exception 'No teacher profile found. Create at least one teacher user first.';
  end if;

  select p.id
  into v_student_id
  from public.profiles p
  where p.role = 'student'
  order by p.created_at asc
  limit 1;

  -- 2) Remove old seed data (idempotent by title)
  delete from public.courses
  where title = 'QA Test Course - Foundations of Biblical Studies';

  -- 3) Create course
  insert into public.courses (
    title,
    description,
    level,
    teacher_id,
    active
  )
  values (
    'QA Test Course - Foundations of Biblical Studies',
    'Seeded course for functional testing of lessons, enrollments, and assignments.',
    'L2',
    v_teacher_id,
    true
  )
  returning id into v_course_id;

  -- 4) Create lessons
  insert into public.lessons (course_id, title, description, file_url)
  values (
    v_course_id,
    'Lesson 1 - Introduction',
    'Core concepts and historical context.',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  )
  returning id into v_lesson_1_id;

  insert into public.lessons (course_id, title, description, file_url)
  values (
    v_course_id,
    'Lesson 2 - Hermeneutics Basics',
    'Foundations of interpretation.',
    'https://www.orimi.com/pdf-test.pdf'
  )
  returning id into v_lesson_2_id;

  insert into public.lessons (course_id, title, description, file_url)
  values (
    v_course_id,
    'Lesson 3 - Practical Application',
    'Applying principles in ministry contexts.',
    'https://www.africau.edu/images/default/sample.pdf'
  )
  returning id into v_lesson_3_id;

  -- 5) Create assignments (3)
  insert into public.assignments (
    course_id,
    lesson_id,
    title,
    description,
    pdf_url,
    published,
    due_date
  )
  values (
    v_course_id,
    v_lesson_1_id,
    'Assignment 1 - Intro Quiz + Reflection',
    'A short MCQ quiz plus one open PDF reflection.',
    null,
    true,
    now() + interval '7 days'
  )
  returning id into v_assignment_1_id;

  insert into public.assignments (
    course_id,
    lesson_id,
    title,
    description,
    pdf_url,
    published,
    due_date
  )
  values (
    v_course_id,
    v_lesson_2_id,
    'Assignment 2 - Hermeneutics Checkpoint',
    'Two MCQs and one open PDF response.',
    null,
    true,
    now() + interval '10 days'
  )
  returning id into v_assignment_2_id;

  insert into public.assignments (
    course_id,
    lesson_id,
    title,
    description,
    pdf_url,
    published,
    due_date
  )
  values (
    v_course_id,
    v_lesson_3_id,
    'Assignment 3 - Ministry Application',
    'Mixed assessment for practical understanding.',
    null,
    true,
    now() + interval '14 days'
  )
  returning id into v_assignment_3_id;

  -- ---------------------------------------------------------------------------
  -- Assignment 1 questions
  -- ---------------------------------------------------------------------------
  insert into public.assignment_questions (assignment_id, type, prompt, order_index, points)
  values (v_assignment_1_id, 'mcq_single', 'Which statement best defines biblical theology?', 1, 2)
  returning id into v_q1_id;

  insert into public.assignment_questions (assignment_id, type, prompt, order_index, points)
  values (v_assignment_1_id, 'open_pdf', 'Upload a 1-page PDF reflection on Lesson 1.', 2, 8)
  returning id into v_q2_id;

  insert into public.assignment_mcq_options (question_id, option_text, order_index)
  values (v_q1_id, 'A study of the Bible''s unified redemptive story', 1)
  returning id into v_q1_opt_a;
  insert into public.assignment_mcq_options (question_id, option_text, order_index)
  values (v_q1_id, 'A catalog of all world religions', 2)
  returning id into v_q1_opt_b;
  insert into public.assignment_mcq_options (question_id, option_text, order_index)
  values (v_q1_id, 'A method focused only on grammar', 3)
  returning id into v_q1_opt_c;

  insert into public.assignment_mcq_correct (question_id, correct_option_id)
  values (v_q1_id, v_q1_opt_a);

  -- ---------------------------------------------------------------------------
  -- Assignment 2 questions
  -- ---------------------------------------------------------------------------
  insert into public.assignment_questions (assignment_id, type, prompt, order_index, points)
  values (v_assignment_2_id, 'mcq_single', 'What is the primary goal of hermeneutics?', 1, 3)
  returning id into v_q3_id;

  insert into public.assignment_questions (assignment_id, type, prompt, order_index, points)
  values (v_assignment_2_id, 'open_pdf', 'Upload a PDF with one case of misinterpretation and your correction.', 2, 7)
  returning id into v_q4_id;

  insert into public.assignment_mcq_options (question_id, option_text, order_index)
  values (v_q3_id, 'To discover intended meaning in context', 1)
  returning id into v_q3_opt_a;
  insert into public.assignment_mcq_options (question_id, option_text, order_index)
  values (v_q3_id, 'To modernize the text at all cost', 2)
  returning id into v_q3_opt_b;
  insert into public.assignment_mcq_options (question_id, option_text, order_index)
  values (v_q3_id, 'To ignore historical audience', 3)
  returning id into v_q3_opt_c;

  insert into public.assignment_mcq_correct (question_id, correct_option_id)
  values (v_q3_id, v_q3_opt_a);

  -- ---------------------------------------------------------------------------
  -- Assignment 3 questions
  -- ---------------------------------------------------------------------------
  insert into public.assignment_questions (assignment_id, type, prompt, order_index, points)
  values (v_assignment_3_id, 'mcq_single', 'Which principle is most important for responsible application?', 1, 3)
  returning id into v_q5_id;

  insert into public.assignment_questions (assignment_id, type, prompt, order_index, points)
  values (v_assignment_3_id, 'open_pdf', 'Upload a PDF ministry application plan based on Lesson 3.', 2, 5)
  returning id into v_q6_id;

  insert into public.assignment_questions (assignment_id, type, prompt, order_index, points)
  values (v_assignment_3_id, 'open_pdf', 'Upload a PDF self-assessment of your interpretation process.', 3, 2)
  returning id into v_q7_id;

  insert into public.assignment_mcq_options (question_id, option_text, order_index)
  values (v_q5_id, 'Bridge context first, then apply faithfully', 1)
  returning id into v_q5_opt_a;
  insert into public.assignment_mcq_options (question_id, option_text, order_index)
  values (v_q5_id, 'Apply instantly without interpretation', 2)
  returning id into v_q5_opt_b;
  insert into public.assignment_mcq_options (question_id, option_text, order_index)
  values (v_q5_id, 'Ignore genre and author intent', 3)
  returning id into v_q5_opt_c;

  insert into public.assignment_mcq_correct (question_id, correct_option_id)
  values (v_q5_id, v_q5_opt_a);

  -- 6) Optional auto-enrollment for a test student
  if v_student_id is not null then
    insert into public.enrollments (course_id, student_id)
    values (v_course_id, v_student_id)
    on conflict (course_id, student_id) do nothing;
  end if;

  raise notice 'Seed completed. course_id=%, teacher_id=%, student_id=%',
    v_course_id, v_teacher_id, v_student_id;
end $$;

