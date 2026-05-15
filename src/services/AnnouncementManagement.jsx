import { supabase } from "../lib/supabase";

export const GetAnnouncements = async () => {
  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id,title,body,published,course_id,created_by,visible_for_days,visible_until,created_at,updated_at,course:courses(id,title),creator:profiles(id,first_name,last_name)"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

export const GetAnnouncementActor = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user?.id) throw new Error("Not authenticated");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  return {
    id: user.id,
    role: profile?.role || "",
  };
};

export const CreateAnnouncement = async ({
  title,
  body,
  courseId = null,
  published = true,
  visibleForDays = 7,
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
      visible_for_days: visibleForDays,
      created_by: user.id,
    })
    .select(
      "id,title,body,published,course_id,created_by,visible_for_days,visible_until,created_at,updated_at,course:courses(id,title),creator:profiles(id,first_name,last_name)"
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
    ...(patch.visibleForDays !== undefined
      ? { visible_for_days: patch.visibleForDays }
      : {}),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("announcements")
    .update(payload)
    .eq("id", id)
    .select(
      "id,title,body,published,course_id,created_by,visible_for_days,visible_until,created_at,updated_at,course:courses(id,title),creator:profiles(id,first_name,last_name)"
    )
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const DeleteAnnouncement = async (id) => {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

