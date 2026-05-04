import { supabase } from "../lib/supabase";

export const GetFinanceSummary = async () => {
  const { data, error } = await supabase
    .from("v_student_finance_summary")
    .select("*")
    .order("balance_due", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
};

export const GetStudentFinanceLedger = async (studentId) => {
  const [chargesRes, paymentsRes, allocationsRes] = await Promise.all([
    supabase
      .from("student_fee_charges")
      .select("id,student_id,course_id,amount,currency,charge_type,description,operation_date,created_at,course:courses(id,title)")
      .eq("student_id", studentId)
      .order("operation_date", { ascending: true }),
    supabase
      .from("student_fee_payments")
      .select("id,student_id,amount,currency,payment_method,reference,notes,operation_date,paid_at,created_at")
      .eq("student_id", studentId)
      .order("operation_date", { ascending: true }),
    supabase
      .from("student_fee_allocations")
      .select("id,payment_id,charge_id,amount_allocated,operation_date,created_at")
      .order("operation_date", { ascending: true }),
  ]);

  if (chargesRes.error) throw new Error(chargesRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (allocationsRes.error) throw new Error(allocationsRes.error.message);

  return {
    charges: chargesRes.data || [],
    payments: paymentsRes.data || [],
    allocations: allocationsRes.data || [],
  };
};

export const CreateManualDebt = async ({
  studentId,
  amount,
  operationDate,
  chargeType = "manual_debt",
  description,
  courseId = null,
}) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("student_fee_charges")
    .insert({
      student_id: studentId,
      course_id: courseId || null,
      amount: Number(amount),
      charge_type: chargeType,
      description: description || null,
      operation_date: operationDate || new Date().toISOString(),
      created_by: user?.id || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const RecordPayment = async ({
  studentId,
  amount,
  paymentMethod,
  reference,
  notes,
  operationDate,
}) => {
  const { data, error } = await supabase.rpc("record_payment_and_allocate_fifo", {
    p_student_id: studentId,
    p_amount: Number(amount),
    p_currency: "XAF",
    p_payment_method: paymentMethod || "cash",
    p_reference: reference || null,
    p_notes: notes || null,
    p_operation_date: operationDate || new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return data;
};

export const UpsertReceiptMetadata = async ({
  paymentId,
  studentId,
  receiptNumber,
  operationDate,
}) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("student_fee_receipts")
    .upsert(
      {
        payment_id: paymentId,
        student_id: studentId,
        receipt_number: receiptNumber,
        generated_at: new Date().toISOString(),
        operation_date: operationDate || new Date().toISOString(),
        created_by: user?.id || null,
      },
      { onConflict: "payment_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
};

