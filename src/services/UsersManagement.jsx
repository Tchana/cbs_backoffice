import { supabase } from "../lib/supabase";

function mapProfileToUser(row) {
  return {
    id: row.id,
    uuid: row.id,
    email: row.email,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    role: row.role || "teacher",
    pImage: row.avatar_url,
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
    .select("id, email, first_name, last_name, role, avatar_url")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error getting users:", error);
    throw new Error(error.message);
  }

  return (data || []).map(mapProfileToUser);
};

export const editUser = async (id, email, firstname, lastname, role) => {
  const { error } = await supabase
    .from("profiles")
    .update({
      email: email || undefined,
      first_name: firstname,
      last_name: lastname,
      role: role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const { data } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role, avatar_url")
    .eq("id", id)
    .single();

  return data ? mapProfileToUser(data) : null;
};

export const deleteUser = async (id) => {
  const { error } = await supabase.from("profiles").delete().eq("id", id);

  if (error) throw new Error(error.message);
  return { success: true };
};
