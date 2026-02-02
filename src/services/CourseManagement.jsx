import { supabase } from "../lib/supabase";

export const CreateCourse = async (
  coverImage,
  teacherFirstName,
  teacherLastName,
  title,
  description,
  level
) => {
  const { data: teachersData, error: teacherError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("role", "teacher");

  if (teacherError) throw new Error(teacherError.message);

  const teacher = (teachersData || []).find(
    (t) =>
      t.first_name === teacherFirstName && t.last_name === teacherLastName
  );
  if (!teacher) throw new Error("Teacher not found");

  let courseCoverUrl = null;
  if (coverImage && coverImage instanceof File) {
    const ext = coverImage.name.split(".").pop();
    const path = `${teacher.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("course-covers")
      .upload(path, coverImage, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("course-covers")
        .getPublicUrl(path);
      courseCoverUrl = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title,
      description,
      level: level || null,
      teacher_id: teacher.id,
      course_cover_url: courseCoverUrl,
    })
    .select("id, title, description, level, teacher_id, course_cover_url")
    .single();

  if (error) throw new Error(error.message);

  const { data: teacherRow } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", teacher.id)
    .single();

  return {
    ...data,
    teacher: teacherRow
      ? {
          uuid: teacherRow.id,
          firstName: teacherRow.first_name,
          lastName: teacherRow.last_name,
        }
      : null,
    lessons: [],
  };
};

export const GetCourses = async () => {
  const { data: coursesData, error: coursesError } = await supabase
    .from("courses")
    .select("id, title, description, level, teacher_id, course_cover_url")
    .order("created_at", { ascending: false });

  if (coursesError) throw new Error(coursesError.message);
  const courses = coursesData || [];

  const teacherIds = [...new Set(courses.map((c) => c.teacher_id).filter(Boolean))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .in("id", teacherIds);
  const profilesById = (profilesData || []).reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const { data: lessonsData } = await supabase
    .from("lessons")
    .select("id, course_id, title, description, file_url")
    .in("course_id", courses.map((c) => c.id));
  const lessonsByCourse = (lessonsData || []).reduce((acc, l) => {
    if (!acc[l.course_id]) acc[l.course_id] = [];
    acc[l.course_id].push({
      id: l.id,
      title: l.title,
      description: l.description,
      file_url: l.file_url,
    });
    return acc;
  }, {});

  return courses.map((row) => {
    const teacher = profilesById[row.teacher_id];
    return {
      id: row.id,
      title: row.title,
      description: row.description || "",
      level: row.level || "",
      teacher_id: row.teacher_id,
      teacher: teacher
        ? {
            id: teacher.id,
            uuid: teacher.id,
            firstName: teacher.first_name,
            lastName: teacher.last_name,
          }
        : null,
      course_cover_url: row.course_cover_url,
      lessons: lessonsByCourse[row.id] || [],
    };
  });
};

export const editCourse = async (
  id,
  title,
  description,
  level,
  teacherFirstName,
  teacherLastName
) => {
  const { data: teachersData, error: teacherError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("role", "teacher");

  if (teacherError) throw new Error(teacherError.message);

  const teacher = (teachersData || []).find(
    (t) =>
      t.first_name === teacherFirstName && t.last_name === teacherLastName
  );
  if (!teacher) throw new Error("Teacher not found");

  const { data, error } = await supabase
    .from("courses")
    .update({
      title,
      description,
      level: level || null,
      teacher_id: teacher.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    ...data,
    teacher: teacher
      ? {
          uuid: teacher.id,
          firstName: teacher.first_name,
          lastName: teacher.last_name,
        }
      : null,
  };
};

export const deleteCourse = async (id) => {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
