import { supabase } from "../lib/supabase";
import {
  saveCourseOverviewVideos,
  saveLessonWithResources,
} from "./CourseContentManagement";

const mapTeacher = (teacher) =>
  teacher
    ? {
        id: teacher.id,
        uuid: teacher.id,
        firstName: teacher.first_name,
        lastName: teacher.last_name,
        email: teacher.email,
      }
    : null;

const fetchLessonsForCourses = async (courseIds) => {
  if (!courseIds.length) return {};

  const { data: lessonsData } = await supabase
    .from("lessons")
    .select("id, course_id, title, description, file_url, sort_order")
    .in("course_id", courseIds)
    .order("sort_order", { ascending: true });

  const lessonIds = (lessonsData || []).map((l) => l.id);
  let resourcesByLesson = {};

  if (lessonIds.length > 0) {
    const { data: resourcesData } = await supabase
      .from("lesson_resources")
      .select("*")
      .in("lesson_id", lessonIds)
      .order("sort_order", { ascending: true });

    resourcesByLesson = (resourcesData || []).reduce((acc, r) => {
      if (!acc[r.lesson_id]) acc[r.lesson_id] = [];
      acc[r.lesson_id].push({
        id: r.id,
        resourceType: r.resource_type,
        title: r.title,
        url: r.url,
        sourceKind: r.source_kind,
        sortOrder: r.sort_order,
      });
      return acc;
    }, {});
  }

  return (lessonsData || []).reduce((acc, l) => {
    if (!acc[l.course_id]) acc[l.course_id] = [];
    acc[l.course_id].push({
      id: l.id,
      title: l.title,
      description: l.description,
      file: l.file_url,
      file_url: l.file_url,
      sortOrder: l.sort_order,
      resources: resourcesByLesson[l.id] || [],
    });
    return acc;
  }, {});
};

const fetchOverviewVideosForCourses = async (courseIds) => {
  if (!courseIds.length) return {};
  const { data } = await supabase
    .from("course_overview_videos")
    .select("*")
    .in("course_id", courseIds)
    .order("sort_order", { ascending: true });

  return (data || []).reduce((acc, v) => {
    if (!acc[v.course_id]) acc[v.course_id] = [];
    acc[v.course_id].push({
      id: v.id,
      title: v.title,
      url: v.url,
      sortOrder: v.sort_order,
    });
    return acc;
  }, {});
};

export const CreateCourse = async ({
  coverImage,
  teacherId,
  title,
  description,
  learningObjectives = "",
  overviewVideos = [],
  lessons = [],
}) => {
  if (!teacherId) throw new Error("Teacher is required");

  let courseCoverUrl = null;
  if (coverImage && coverImage instanceof File) {
    const ext = coverImage.name.split(".").pop();
    const path = `${teacherId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("course-covers")
      .upload(path, coverImage, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("course-covers").getPublicUrl(path);
      courseCoverUrl = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      title,
      description,
      learning_objectives: learningObjectives || null,
      teacher_id: teacherId,
      course_cover_url: courseCoverUrl,
      active: true,
    })
    .select(
      "id, title, description, learning_objectives, price_amount, currency, teacher_id, course_cover_url, active, created_at"
    )
    .single();

  if (error) throw new Error(error.message);

  await saveCourseOverviewVideos(data.id, overviewVideos);
  for (let i = 0; i < lessons.length; i++) {
    await saveLessonWithResources(data.id, { ...lessons[i], sortOrder: i });
  }

  const { data: teacherRow } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("id", teacherId)
    .single();

  return {
    ...data,
    createdAt: data?.created_at || null,
    teacher: mapTeacher(teacherRow),
    lessons: [],
    overviewVideos: overviewVideos || [],
  };
};

export const GetCourses = async () => {
  const { data: coursesData, error: coursesError } = await supabase
    .from("courses")
    .select(
      "id, title, description, learning_objectives, price_amount, currency, teacher_id, course_cover_url, active, created_at"
    )
    .order("created_at", { ascending: false });

  if (coursesError) throw new Error(coursesError.message);
  const courses = coursesData || [];
  const courseIds = courses.map((c) => c.id);

  const teacherIds = [...new Set(courses.map((c) => c.teacher_id).filter(Boolean))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", teacherIds);
  const profilesById = (profilesData || []).reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  const [lessonsByCourse, overviewByCourse] = await Promise.all([
    fetchLessonsForCourses(courseIds),
    fetchOverviewVideosForCourses(courseIds),
  ]);

  return courses.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description || "",
    learningObjectives: row.learning_objectives || "",
    price_amount: row.price_amount ?? 0,
    currency: row.currency ?? "XAF",
    teacher_id: row.teacher_id,
    teacher: mapTeacher(profilesById[row.teacher_id]),
    course_cover_url: row.course_cover_url,
    active: row.active ?? true,
    createdAt: row.created_at || null,
    lessons: lessonsByCourse[row.id] || [],
    overviewVideos: overviewByCourse[row.id] || [],
  }));
};

export const editCourse = async ({
  id,
  title,
  description,
  learningObjectives,
  teacherId,
  overviewVideos,
}) => {
  if (!teacherId) throw new Error("Teacher is required");

  const { data, error } = await supabase
    .from("courses")
    .update({
      title,
      description,
      learning_objectives: learningObjectives || null,
      teacher_id: teacherId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (overviewVideos) {
    await saveCourseOverviewVideos(id, overviewVideos);
  }

  const { data: teacher } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("id", teacherId)
    .single();

  return {
    ...data,
    teacher: mapTeacher(teacher),
  };
};

export const setCourseActive = async (id, active) => {
  const { data, error } = await supabase
    .from("courses")
    .update({ active, updated_at: new Date().toISOString() })
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
