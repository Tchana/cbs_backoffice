import { supabase } from "../lib/supabase";

export const GetCoursePaymentSummary = async () => {
  const { data, error } = await supabase
    .from("v_student_course_payment_summary")
    .select("*")
    .order("total_owed", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
};

export const GetStudentCourseBalances = async (studentId) => {
  const { data, error } = await supabase
    .from("v_student_course_balances")
    .select("*")
    .eq("student_id", studentId)
    .order("course_created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
};

export const GetStudentCoursePaymentLedger = async (studentId) => {
  const [paymentsRes, allocationsRes] = await Promise.all([
    supabase
      .from("student_course_payments")
      .select(
        "id,student_id,amount,currency,payment_method,reference,notes,operation_date,paid_at,created_at,voided_at,void_reason"
      )
      .eq("student_id", studentId)
      .order("operation_date", { ascending: false }),
    supabase
      .from("student_course_payment_allocations")
      .select(
        "id,student_id,payment_id,course_id,amount,currency,source,operation_date,created_at,voided_at,void_reason,course:courses(id,title,created_at)"
      )
      .eq("student_id", studentId)
      .order("operation_date", { ascending: false }),
  ]);

  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (allocationsRes.error) throw new Error(allocationsRes.error.message);

  return {
    payments: paymentsRes.data || [],
    allocations: allocationsRes.data || [],
  };
};

export const GetActiveCoursesForPayment = async () => {
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id,title,created_at,currency,course_fees(amount,currency,notes)"
    )
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
};

export const RecordCoursePayment = async ({
  studentId,
  amount,
  allocations = null,
  paymentMethod = "cash",
  reference,
  notes,
  operationDate,
}) => {
  const payload =
    allocations == null
      ? []
      : allocations
          .filter((row) => row.courseId && Number(row.amount) > 0)
          .map((row) => ({
            course_id: row.courseId,
            amount: Number(row.amount),
          }));

  const { data, error } = await supabase.rpc("record_student_course_payment", {
    p_student_id: studentId,
    p_amount: Number(amount),
    p_allocations: payload,
    p_currency: "XAF",
    p_payment_method: paymentMethod || "cash",
    p_reference: reference || null,
    p_notes: notes || null,
    p_operation_date: operationDate || new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return data;
};

export const ApplyCourseCredit = async ({
  studentId,
  courseId,
  amount,
  operationDate,
}) => {
  const { data, error } = await supabase.rpc("apply_student_course_credit", {
    p_student_id: studentId,
    p_course_id: courseId,
    p_amount: Number(amount),
    p_operation_date: operationDate || new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return data;
};

export const VoidCoursePayment = async (paymentId, reason) => {
  const { error } = await supabase.rpc("void_student_course_payment", {
    p_payment_id: paymentId,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
};

export const VoidCourseAllocation = async (allocationId, reason) => {
  const { error } = await supabase.rpc("void_student_course_allocation", {
    p_allocation_id: allocationId,
    p_reason: reason || null,
  });
  if (error) throw new Error(error.message);
};
