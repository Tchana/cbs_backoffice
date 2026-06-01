import { supabase } from "../lib/supabase";

export const GetCourseFeesCatalog = async () => {
  const { data, error } = await supabase
    .from("v_course_fees")
    .select("*")
    .order("course_created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
};

export const GetCourseFeeByCourseId = async (courseId) => {
  const { data, error } = await supabase
    .from("course_fees")
    .select("id,course_id,amount,currency,notes,created_at,updated_at")
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const UpsertCourseFee = async ({ courseId, amount, notes, currency = "XAF" }) => {
  const { data, error } = await supabase.rpc("upsert_course_fee", {
    p_course_id: courseId,
    p_amount: Number(amount),
    p_currency: currency,
    p_notes: notes || null,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const DeleteCourseFee = async (courseId) => {
  const { error } = await supabase.rpc("delete_course_fee", {
    p_course_id: courseId,
  });
  if (error) throw new Error(error.message);
};

/** Map course_id -> fee row for batch lookups */
export const GetCourseFeesMap = async () => {
  const { data, error } = await supabase
    .from("course_fees")
    .select("course_id,amount,currency,notes");
  if (error) throw new Error(error.message);
  const map = {};
  for (const row of data || []) {
    map[row.course_id] = row;
  }
  return map;
};
