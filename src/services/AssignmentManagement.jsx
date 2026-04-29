import { supabase } from "../lib/supabase";

const ensureExt = (file) => {
  const name = file?.name || "";
  const ext = name.includes(".") ? name.split(".").pop() : "";
  return ext || "pdf";
};

export const GetAssignmentsByCourse = async (courseId, { includeUnpublished = false } = {}) => {
  // RLS already restricts teachers to their own courses.
  // If includeUnpublished is false, we only request published ones.
  let q = supabase
    .from("assignments")
    .select("id,title,description,published,due_date,lesson_id,course_id,created_at,pdf_url")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (!includeUnpublished) {
    q = q.eq("published", true);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
};

export const CreateAssignment = async ({
  courseId,
  lessonId = null,
  title,
  description = null,
  published = false,
  dueDate = null,
  assignmentPdfFile = null,
  questions = [],
}) => {
  // 1) Insert assignment first (so we have assignment_id for storage path + FK relations)
  const { data: assignmentRow, error: assignmentError } = await supabase
    .from("assignments")
    .insert({
      course_id: courseId,
      lesson_id: lessonId || null,
      title,
      description,
      published,
      due_date: dueDate,
      pdf_url: null,
    })
    .select("id")
    .single();

  if (assignmentError) throw new Error(assignmentError.message);
  const assignmentId = assignmentRow.id;

  // 2) Optional assignment prompt PDF upload
  if (assignmentPdfFile && assignmentPdfFile instanceof File) {
    const ext = ensureExt(assignmentPdfFile);
    const filename = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${assignmentId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("assignment-files")
      .upload(storagePath, assignmentPdfFile, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from("assignment-files")
      .getPublicUrl(storagePath);

    const { error: updateError } = await supabase
      .from("assignments")
      .update({ pdf_url: urlData.publicUrl })
      .eq("id", assignmentId);

    if (updateError) throw new Error(updateError.message);
  }

  // 3) Insert questions + MCQ options/correct key
  // questions: [
  //   { type: 'mcq_single'|'open_pdf', prompt, points, mcqOptions?: [{ optionText }], correctOptionIndex?: number }
  // ]
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const { data: qRow, error: qError } = await supabase
      .from("assignment_questions")
      .insert({
        assignment_id: assignmentId,
        type: q.type,
        prompt: q.prompt,
        order_index: i,
        points: q.points ?? 1,
      })
      .select("id")
      .single();

    if (qError) throw new Error(qError.message);
    const questionId = qRow.id;

    if (q.type === "mcq_single") {
      const opts = q.mcqOptions || [];
      if (!opts.length) throw new Error("MCQ question must have at least one option");

      const { data: optRows, error: optError } = await supabase
        .from("assignment_mcq_options")
        .insert(
          opts.map((o, idx) => ({
            question_id: questionId,
            option_text: o.optionText,
            order_index: idx,
          }))
        )
        .select("id,order_index");

      if (optError) throw new Error(optError.message);

      const correctIdx = q.correctOptionIndex ?? 0;
      const correctOpt = (optRows || []).find((r) => r.order_index === correctIdx);
      if (!correctOpt) throw new Error("Correct option is invalid");

      const { error: correctError } = await supabase
        .from("assignment_mcq_correct")
        .insert({
          question_id: questionId,
          correct_option_id: correctOpt.id,
        });

      if (correctError) throw new Error(correctError.message);
    }
  }

  return assignmentId;
};

export const GetAssignmentQuestions = async (assignmentId) => {
  const { data: questions, error } = await supabase
    .from("assignment_questions")
    .select("id,type,prompt,order_index,points")
    .eq("assignment_id", assignmentId)
    .order("order_index");

  if (error) throw new Error(error.message);

  const mcqQuestionIds = (questions || [])
    .filter((q) => q.type === "mcq_single")
    .map((q) => q.id);

  let mcqOptionsByQuestionId = {};
  let mcqCorrectByQuestionId = {};

  if (mcqQuestionIds.length) {
    const { data: optionsRows, error: optionsError } = await supabase
      .from("assignment_mcq_options")
      .select("id,question_id,option_text,order_index")
      .in("question_id", mcqQuestionIds)
      .order("order_index");

    if (optionsError) throw new Error(optionsError.message);

    mcqOptionsByQuestionId = (optionsRows || []).reduce((acc, o) => {
      if (!acc[o.question_id]) acc[o.question_id] = [];
      acc[o.question_id].push(o);
      return acc;
    }, {});

    const { data: correctRows, error: correctError } = await supabase
      .from("assignment_mcq_correct")
      .select("question_id,correct_option_id")
      .in("question_id", mcqQuestionIds);

    if (correctError) throw new Error(correctError.message);

    mcqCorrectByQuestionId = (correctRows || []).reduce((acc, c) => {
      acc[c.question_id] = c.correct_option_id;
      return acc;
    }, {});
  }

  return {
    questions: (questions || []).map((q) => ({
      ...q,
      options: mcqOptionsByQuestionId[q.id] || [],
      correct_option_id: mcqCorrectByQuestionId[q.id] || null,
    })),
  };
};

export const GetAssignmentSubmissionsForGrading = async (assignmentId) => {
  // 1) Submission rows + student profiles
  const { data: submissions, error: subError } = await supabase
    .from("assignment_submissions")
    .select(
      "id,student_id,submitted_at,mcq_score_total,open_score_total,final_score_total"
    )
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: false });

  if (subError) throw new Error(subError.message);

  const submissionRows = submissions || [];
  const studentIds = [...new Set(submissionRows.map((s) => s.student_id))];

  const { data: studentsData, error: studentsError } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,avatar_url,email")
    .in("id", studentIds);

  if (studentsError) throw new Error(studentsError.message);

  const studentsById = (studentsData || []).reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  // 2) Answers + questions
  const submissionIds = submissionRows.map((s) => s.id);

  let answers = [];
  if (submissionIds.length) {
    const { data: ansRows, error: ansError } = await supabase
      .from("assignment_submission_answers")
      .select(
        "id,submission_id,question_id,selected_option_id,student_answer_pdf_url,teacher_points,teacher_feedback"
      )
      .in("submission_id", submissionIds);

    if (ansError) throw new Error(ansError.message);
    answers = ansRows || [];
  }

  const questionIds = [...new Set(answers.map((a) => a.question_id))];
  const { data: questionRows, error: qError } = await supabase
    .from("assignment_questions")
    .select("id,type,prompt,order_index,points")
    .in("id", questionIds)
    .order("order_index");

  if (qError) throw new Error(qError.message);

  const questionsById = (questionRows || []).reduce((acc, q) => {
    acc[q.id] = q;
    return acc;
  }, {});

  const answersBySubmissionId = answers.reduce((acc, a) => {
    if (!acc[a.submission_id]) acc[a.submission_id] = [];
    acc[a.submission_id].push(a);
    return acc;
  }, {});

  return {
    submissions: submissionRows.map((s) => ({
      ...s,
      student: studentsById[s.student_id] || null,
      answers: answersBySubmissionId[s.id] || [],
      questionsById,
    })),
    questions: questionRows || [],
  };
};

export const UpdateOpenPdfGrading = async (updates) => {
  // updates: [{ answerId, teacherPoints, teacherFeedback }]
  for (const u of updates) {
    const { error } = await supabase
      .from("assignment_submission_answers")
      .update({
        teacher_points: u.teacherPoints,
        teacher_feedback: u.teacherFeedback,
      })
      .eq("id", u.answerId);

    if (error) throw new Error(error.message);
  }
};

export const UpdateAssignment = async (assignmentId, patch) => {
  const { data, error } = await supabase
    .from("assignments")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.published !== undefined ? { published: patch.published } : {}),
      ...(patch.lessonId !== undefined ? { lesson_id: patch.lessonId } : {}),
      ...(patch.dueDate !== undefined ? { due_date: patch.dueDate } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .select("id,title,description,published,due_date,lesson_id,course_id,pdf_url,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const DeleteAssignment = async (assignmentId) => {
  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) throw new Error(error.message);
};

