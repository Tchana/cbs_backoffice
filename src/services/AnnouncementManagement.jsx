import { supabase } from "../lib/supabase";

export const GetAnnouncements = async () => {
  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id,title,body,published,course_id,created_by,created_at,updated_at,course:courses(id,title),creator:profiles(id,first_name,last_name)"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

export const CreateAnnouncement = async ({
  title,
  body,
  courseId = null,
  published = true,
}) => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title: title.trim(),
      body: body.trim(),
      course_id: courseId || null,
      published,
      created_by: user.id,
    })
    .select(
      "id,title,body,published,course_id,created_by,created_at,updated_at,course:courses(id,title),creator:profiles(id,first_name,last_name)"
    )
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const UpdateAnnouncement = async (id, patch) => {
  const payload = {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.body !== undefined ? { body: patch.body } : {}),
    ...(patch.published !== undefined ? { published: patch.published } : {}),
    ...(patch.courseId !== undefined ? { course_id: patch.courseId } : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("announcements")
    .update(payload)
    .eq("id", id)
    .select(
      "id,title,body,published,course_id,created_by,created_at,updated_at,course:courses(id,title),creator:profiles(id,first_name,last_name)"
    )
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const DeleteAnnouncement = async (id) => {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

