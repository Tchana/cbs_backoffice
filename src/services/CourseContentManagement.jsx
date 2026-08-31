import { supabase } from "../lib/supabase";

export const RESOURCE_TYPES = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "Document" },
  { value: "image", label: "Image" },
  { value: "link", label: "Link" },
  { value: "slides", label: "Slides" },
];

const inferResourceType = (file) => {
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();
  if (type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/.test(name)) return "video";
  if (type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg)$/.test(name)) return "audio";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (/\.(doc|docx|odt|rtf)$/.test(name)) return "doc";
  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/.test(name)) return "image";
  if (/\.(ppt|pptx|odp)$/.test(name)) return "slides";
  return "doc";
};

export const uploadLessonResourceFile = async (courseId, file) => {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${courseId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("lesson-files")
    .upload(path, file, { upsert: true });
  if (uploadError) throw new Error(uploadError.message);
  const { data: urlData } = supabase.storage.from("lesson-files").getPublicUrl(path);
  return {
    url: urlData.publicUrl,
    resourceType: inferResourceType(file),
    sourceKind: "upload",
  };
};

export const saveCourseOverviewVideos = async (courseId, videos = []) => {
  await supabase.from("course_overview_videos").delete().eq("course_id", courseId);
  const rows = (videos || [])
    .filter((v) => v?.url?.trim())
    .map((v, index) => ({
      course_id: courseId,
      title: v.title?.trim() || null,
      url: v.url.trim(),
      sort_order: index,
    }));
  if (rows.length === 0) return [];
  const { data, error } = await supabase
    .from("course_overview_videos")
    .insert(rows)
    .select("*");
  if (error) throw new Error(error.message);
  return data || [];
};

export const saveLessonWithResources = async (courseId, lesson) => {
  const { data: lessonRow, error: lessonError } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      title: lesson.title,
      description: lesson.description || null,
      sort_order: lesson.sortOrder ?? 0,
    })
    .select("id")
    .single();
  if (lessonError) throw new Error(lessonError.message);

  const resourceRows = [];
  for (let i = 0; i < (lesson.resources || []).length; i++) {
    const resource = lesson.resources[i];
    let url = resource.url?.trim() || "";
    let resourceType = resource.resourceType || "link";
    let sourceKind = resource.sourceKind || "external";

    if (resource.file instanceof File) {
      const uploaded = await uploadLessonResourceFile(courseId, resource.file);
      url = uploaded.url;
      resourceType = uploaded.resourceType;
      sourceKind = uploaded.sourceKind;
    }

    if (!url) continue;

    resourceRows.push({
      lesson_id: lessonRow.id,
      resource_type: resourceType,
      title: resource.title?.trim() || null,
      url,
      source_kind: sourceKind,
      sort_order: i,
    });
  }

  if (resourceRows.length > 0) {
    const { error: resError } = await supabase.from("lesson_resources").insert(resourceRows);
    if (resError) throw new Error(resError.message);
  }

  return lessonRow.id;
};

export const updateLessonWithResources = async (courseId, lessonId, lesson) => {
  const { error: lessonError } = await supabase
    .from("lessons")
    .update({
      title: lesson.title,
      description: lesson.description || null,
      sort_order: lesson.sortOrder ?? 0,
    })
    .eq("id", lessonId);
  if (lessonError) throw new Error(lessonError.message);

  await supabase.from("lesson_resources").delete().eq("lesson_id", lessonId);

  const resourceRows = [];
  for (let i = 0; i < (lesson.resources || []).length; i++) {
    const resource = lesson.resources[i];
    let url = resource.url?.trim() || "";
    let resourceType = resource.resourceType || "link";
    let sourceKind = resource.sourceKind || "external";

    if (resource.file instanceof File) {
      const uploaded = await uploadLessonResourceFile(courseId, resource.file);
      url = uploaded.url;
      resourceType = uploaded.resourceType;
      sourceKind = uploaded.sourceKind;
    }

    if (!url) continue;

    resourceRows.push({
      lesson_id: lessonId,
      resource_type: resourceType,
      title: resource.title?.trim() || null,
      url,
      source_kind: sourceKind,
      sort_order: i,
    });
  }

  if (resourceRows.length > 0) {
    const { error: resError } = await supabase.from("lesson_resources").insert(resourceRows);
    if (resError) throw new Error(resError.message);
  }

  return lessonId;
};

export const getCourseComments = async (courseId) => {
  const { data, error } = await supabase
    .from("course_comments")
    .select("id, course_id, user_id, content, created_at, updated_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const comments = data || [];
  if (comments.length === 0) return [];

  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role")
    .in("id", userIds);

  const profileById = (profiles || []).reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  return comments.map((c) => {
    const profile = profileById[c.user_id];
    return {
      ...c,
      authorName: profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
        : "Unknown",
      authorRole: profile?.role || "",
    };
  });
};

export const addCourseComment = async (courseId, content) => {
  const { data, error } = await supabase
    .from("course_comments")
    .insert({ course_id: courseId, user_id: (await supabase.auth.getUser()).data.user?.id, content })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteCourseComment = async (commentId) => {
  const { error } = await supabase.from("course_comments").delete().eq("id", commentId);
  if (error) throw new Error(error.message);
};
