import { supabase } from "../lib/supabase";

export const CreateCourse = async (
  coverImage,
  teacherFirstName,
  teacherLastName,
  title,
  description,
  level,
  priceAmount = 0
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
      price_amount: Number.isFinite(Number(priceAmount)) ? Number(priceAmount) : 0,
      teacher_id: teacher.id,
      course_cover_url: courseCoverUrl,
      active: true,
    })
    .select("id, title, description, level, price_amount, currency, teacher_id, course_cover_url, active, created_at")
    .single();

  if (error) throw new Error(error.message);

  // Keep forum in sync: every new course gets a room
  // with the same name as the course title.
  try {
    await supabase.from("rooms").insert({
      name: title,
      description: description || `Course discussion for ${title}`,
      is_private: false,
      created_by: teacher.id,
    });
  } catch (roomErr) {
    // Do not block course creation if room creation fails.
    console.error("Course created but room creation failed:", roomErr);
  }

  const { data: teacherRow } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("id", teacher.id)
    .single();

  return {
    ...data,
    createdAt: data?.created_at || null,
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
    .select("id, title, description, level, price_amount, currency, teacher_id, course_cover_url, active, created_at")
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
      file: l.file_url,
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
      price_amount: row.price_amount ?? 0,
      currency: row.currency ?? "XAF",
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
      active: row.active ?? true,
      createdAt: row.created_at || null,
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
  teacherLastName,
  priceAmount
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
      ...(priceAmount !== undefined && priceAmount !== null
        ? { price_amount: Number(priceAmount) || 0 }
        : {}),
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

export const setCourseActive = async (id, active) => {
  const { data, error } = await supabase
    .from("courses")
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,active")
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteCourse = async (id) => {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
