import { supabase } from "../lib/supabase";

export const CreateLesson = async (
  courseId,
  lessonTitle,
  lessonDescription,
  lessonFile
) => {
  let fileUrl = null;
  if (lessonFile && lessonFile instanceof File) {
    const ext = lessonFile.name.split(".").pop();
    const path = `${courseId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("lesson-files")
      .upload(path, lessonFile, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("lesson-files")
        .getPublicUrl(path);
      fileUrl = urlData.publicUrl;
    }
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      course_id: courseId,
      title: lessonTitle,
      description: lessonDescription || null,
      file_url: fileUrl,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const DeleteLesson = async (lessonId) => {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(error.message);
  return { success: true };
};

export const EditLesson = async (lessonId, title, description, file) => {
  const updates = { updated_at: new Date().toISOString() };
  if (title != null) updates.title = title;
  if (description != null) updates.description = description;

  if (file && file instanceof File) {
    const { data: lesson } = await supabase
      .from("lessons")
      .select("course_id")
      .eq("id", lessonId)
      .single();
    if (lesson) {
      const ext = file.name.split(".").pop();
      const path = `${lesson.course_id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("lesson-files")
        .upload(path, file, { upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("lesson-files")
          .getPublicUrl(path);
        updates.file_url = urlData.publicUrl;
      }
    }
  }

  const { data, error } = await supabase
    .from("lessons")
    .update(updates)
    .eq("id", lessonId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
