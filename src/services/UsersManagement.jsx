import { supabase } from "../lib/supabase";

function mapProfileToUser(row) {
  return {
    id: row.id,
    uuid: row.id,
    email: row.email,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    phone: row.phone || "",
    vocation: row.vocation || "",
    testimony: row.testimony || "",
    journey: row.journey || "",
    role: row.role || "teacher",
    resourceAccess: row.resource_access || "default",
    pImage: row.avatar_url,
    createdAt: row.created_at || null,
  };
}

export const courses = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select("id, title")
    .order("title");

  if (error) {
    console.error("Error getting courses:", error);
    throw new Error(error.message);
  }

  const courseList = (data || []).map((c) => ({ id: c.id, name: c.title }));
  localStorage.setItem("course_list", JSON.stringify(courseList));
  return data || [];
};

export const lessons = async () => {
  const courseList = JSON.parse(localStorage.getItem("course_list") || "[]");
  if (!courseList.length) {
    await courses();
    return lessons();
  }

  const allLessons = [];
  for (const course of courseList) {
    const { data: lessonRows, error } = await supabase
      .from("lessons")
      .select("id, title, description")
      .eq("course_id", course.id);

    if (error) throw new Error(error.message);
    (lessonRows || []).forEach((lesson) => {
      allLessons.push({
        course_name: course.name,
        uuid: lesson.id,
        title: lesson.title,
        description: lesson.description || "",
      });
    });
  }
  return allLessons;
};

export const GetUsers = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone, vocation, testimony, journey, role, resource_access, avatar_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting users:", error);
    throw new Error(error.message);
  }

  return (data || []).map(mapProfileToUser);
};

export const editUser = async (
  id,
  email,
  firstname,
  lastname,
  role,
  phone,
  pImage,
  vocation,
  testimony,
  journey
) => {
  const updates = {
    updated_at: new Date().toISOString(),
  };
  if (email !== undefined) updates.email = email || undefined;
  if (firstname !== undefined) updates.first_name = firstname;
  if (lastname !== undefined) updates.last_name = lastname;
  if (phone !== undefined) updates.phone = phone || null;
  if (vocation !== undefined) updates.vocation = vocation || null;
  if (testimony !== undefined) updates.testimony = testimony || null;
  if (journey !== undefined) updates.journey = journey || null;
  if (role !== undefined) updates.role = role;

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (pImage && pImage instanceof File) {
    const fileExt = pImage.name.split(".").pop();
    const fileName = `${id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, pImage, { upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", id);
    }
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone, vocation, testimony, journey, role, resource_access, avatar_url, created_at")
    .eq("id", id)
    .single();

  return data ? mapProfileToUser(data) : null;
};

export const deleteUser = async (id) => {
  const { error } = await supabase.from("profiles").delete().eq("id", id);

  if (error) throw new Error(error.message);
  return { success: true };
};
