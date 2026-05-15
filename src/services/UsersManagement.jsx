import { supabase } from "../lib/supabase";

function mapProfileToUser(row) {
  return {
    id: row.id,
    uuid: row.id,
    email: row.email,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    phone: row.phone || "",
    role: row.role || "teacher",
    subscriptionType: row.subscription_type || "none",
    schoolMaxLevel: row.school_max_level ?? 0,
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
    .select("id, email, first_name, last_name, phone, role, subscription_type, school_max_level, avatar_url, created_at")
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
  subscriptionType,
  schoolMaxLevel
) => {
  const updates = {
    updated_at: new Date().toISOString(),
  };
  if (email !== undefined) updates.email = email || undefined;
  if (firstname !== undefined) updates.first_name = firstname;
  if (lastname !== undefined) updates.last_name = lastname;
  if (phone !== undefined) updates.phone = phone || null;
  if (role !== undefined) updates.role = role;
  if (subscriptionType !== undefined) updates.subscription_type = subscriptionType;
  if (schoolMaxLevel !== undefined) updates.school_max_level = Number(schoolMaxLevel) || 0;
  if (updates.role === "student" && updates.school_max_level == null) {
    updates.school_max_level = 1;
    updates.subscription_type = "student";
  } else if (updates.role === "library_user") {
    updates.subscription_type = "library_user";
  }

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
    .select("id, email, first_name, last_name, phone, role, subscription_type, school_max_level, avatar_url, created_at")
    .eq("id", id)
    .single();

  return data ? mapProfileToUser(data) : null;
};

export const deleteUser = async (id) => {
  const { error } = await supabase.from("profiles").delete().eq("id", id);

  if (error) throw new Error(error.message);
  return { success: true };
};

export const GetUserSubscriptionStatus = async (userId) => {
  const { data, error } = await supabase
    .from("v_user_subscription_status")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
};

export const GetUserSubscriptionHistory = async (userId) => {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("id,status,source,starts_at,ends_at,access_state,access_state_note,created_at,plan:subscription_plans(code,name,target_role,duration_months),payment:payment_transactions(provider_tx_ref,provider_status,amount,currency),installments:user_subscription_installments(id,installment_number,label,amount_due,amount_paid,currency,due_at,paid_at,status)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
};

export const CreateManualSubscription = async ({
  userId,
  planCode,
  startsAt,
  endsAt,
  reason,
}) => {
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("id,duration_months")
    .eq("code", planCode)
    .eq("active", true)
    .single();
  if (planError) throw new Error(planError.message);

  const start = startsAt ? new Date(startsAt) : new Date();
  const end = endsAt
    ? new Date(endsAt)
    : new Date(start.getTime() + Number(plan.duration_months || 3) * 30 * 24 * 3600 * 1000);

  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      source: "backoffice_manual",
      status: "active",
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      created_by: actor?.id || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await supabase.rpc("apply_subscription_entitlement", { p_user_id: userId });

  return { ...data, reason: reason || null };
};
