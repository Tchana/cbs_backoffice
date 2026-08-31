import { supabase } from "../lib/supabase";

const parseMode = (value, fallback = "manual") =>
  value === "automatic" ? "automatic" : fallback;

export const getPaymentCollectionMode = async () => {
  const { data, error } = await supabase.rpc("payment_collection_mode");
  if (error) throw new Error(error.message);
  return parseMode(data);
};

export const setPaymentCollectionMode = async (mode) => {
  const { error } = await supabase.rpc("set_payment_collection_mode", {
    p_mode: mode,
  });
  if (error) throw new Error(error.message);
  return mode;
};

export const getAccessBlockingMode = async () => {
  const { data, error } = await supabase.rpc("access_blocking_mode");
  if (error) throw new Error(error.message);
  return parseMode(data);
};

export const setAccessBlockingMode = async (mode) => {
  const { error } = await supabase.rpc("set_access_blocking_mode", {
    p_mode: mode,
  });
  if (error) throw new Error(error.message);
  return mode;
};

export const getStudentSchoolTotalOwed = async (studentId) => {
  const { data, error } = await supabase.rpc("student_school_total_owed", {
    p_student_id: studentId,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
};

/** @deprecated Use getStudentSchoolTotalOwed */
export const getStudentCourseTotalOwed = getStudentSchoolTotalOwed;

export const setUserResourceAccess = async (userId, access) => {
  const { error } = await supabase.rpc("set_user_resource_access", {
    p_user_id: userId,
    p_access: access,
  });
  if (error) throw new Error(error.message);
  return access;
};

export const getFinanceSettings = async () => {
  const [paymentMode, accessMode] = await Promise.all([
    getPaymentCollectionMode(),
    getAccessBlockingMode(),
  ]);
  return { paymentMode, accessMode };
};
