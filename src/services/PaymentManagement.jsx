import { supabase } from "../lib/supabase";

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export const PAYMENT_TYPE_LABELS = {
  school_fee: "School fee",
  student_course_fee: "School fee",
  library_fee: "Library fee",
};

export const getUserAccessStatus = async (userId) => {
  const { data, error } = await supabase.rpc("get_user_access_status", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const getUserTotalOwed = async (userId) => {
  const { data, error } = await supabase.rpc("user_total_owed", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
};

export const getSchoolFeeAmount = async () => {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "school_fee_amount")
    .maybeSingle();

  if (!error && data?.value != null) {
    return Number(data.value.amount ?? 0);
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("school_fee_amount", {});
  if (rpcError) throw new Error(rpcError.message);
  return rpcData ?? 0;
};

export const setSchoolFeeAmount = async (amount, currency = "XAF") => {
  const { error } = await supabase.rpc("set_school_fee_amount", {
    p_amount: amount,
    p_currency: currency,
  });
  if (error) throw new Error(error.message);
  return amount;
};

export const getLibraryFeeAmount = async () => {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "library_fee_amount")
    .maybeSingle();

  if (!error && data?.value != null) {
    return Number(data.value.amount ?? 0);
  }

  // Fallback once PostgREST schema cache picks up the RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "library_fee_amount",
    {}
  );
  if (rpcError) throw new Error(rpcError.message);
  return rpcData ?? 0;
};

export const setLibraryFeeAmount = async (amount, currency = "XAF") => {
  const { error } = await supabase.rpc("set_library_fee_amount", {
    p_amount: amount,
    p_currency: currency,
  });
  if (error) throw new Error(error.message);
  return amount;
};

export const getStudentPaymentSummary = async (studentId) => {
  const { data, error } = await supabase
    .from("v_student_school_payment_summary")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const getLibraryUserPaymentSummary = async (userId) => {
  const { data, error } = await supabase
    .from("v_library_user_payment_summary")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const getUserPaymentHistory = async (userId) => {
  const { data, error } = await supabase
    .from("v_user_payment_history")
    .select("*")
    .eq("user_id", userId)
    .is("voided_at", null)
    .order("operation_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
};

export const recordStudentSchoolPayment = async ({
  studentId,
  amount,
  paymentMethod = "cash",
  reference = "",
  notes = "",
  operationDate = new Date().toISOString(),
}) => {
  const { data, error } = await supabase.rpc("record_student_school_payment", {
    p_student_id: studentId,
    p_amount: amount,
    p_currency: "XAF",
    p_payment_method: paymentMethod,
    p_reference: reference || null,
    p_notes: notes || null,
    p_operation_date: operationDate,
  });
  if (error) throw new Error(error.message);
  return data;
};

/** @deprecated Use recordStudentSchoolPayment */
export const recordStudentCoursePayment = recordStudentSchoolPayment;

export const recordLibraryUserPayment = async ({
  userId,
  amount,
  paymentMethod = "cash",
  reference = "",
  notes = "",
  operationDate = new Date().toISOString(),
}) => {
  const { data, error } = await supabase.rpc("record_library_user_payment", {
    p_user_id: userId,
    p_amount: amount,
    p_currency: "XAF",
    p_payment_method: paymentMethod,
    p_reference: reference || null,
    p_notes: notes || null,
    p_operation_date: operationDate,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const recordUserPayment = async (user, payment) => {
  if (user.role === "student") {
    return recordStudentSchoolPayment({ studentId: user.id, ...payment });
  }
  if (user.role === "library_user") {
    return recordLibraryUserPayment({ userId: user.id, ...payment });
  }
  throw new Error("Payments can only be recorded for students and library users.");
};

export const getPaymentTypeForRole = (role) => {
  if (role === "student") return "school_fee";
  if (role === "library_user") return "library_fee";
  return null;
};

export const getAllPaymentRecords = async ({ paymentType = "all", limit = 300 } = {}) => {
  let query = supabase
    .from("v_user_payment_history")
    .select("*")
    .is("voided_at", null)
    .order("operation_date", { ascending: false })
    .limit(limit);

  if (paymentType !== "all") {
    query = query.eq("payment_type", paymentType);
  }

  const { data: payments, error } = await query;
  if (error) throw new Error(error.message);

  const records = payments || [];
  if (records.length === 0) return [];

  const userIds = [...new Set(records.map((p) => p.user_id).filter(Boolean))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role")
    .in("id", userIds);

  if (profilesError) throw new Error(profilesError.message);

  const profileById = (profiles || []).reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});

  return records.map((payment) => {
    const profile = profileById[payment.user_id];
    const fullName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : "";
    return {
      ...payment,
      userName: fullName || profile?.email || "Unknown user",
      userEmail: profile?.email || "",
      userRole: profile?.role || "",
    };
  });
};

export const getFinancePaymentStats = async () => {
  const [
    schoolFee,
    libraryFee,
    { data: schoolSummaries, error: schoolError },
    { data: librarySummaries, error: libraryError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    getSchoolFeeAmount(),
    getLibraryFeeAmount(),
    supabase.from("v_student_school_payment_summary").select("*"),
    supabase.from("v_library_user_payment_summary").select("*"),
    supabase
      .from("v_user_payment_history")
      .select("amount, payment_type, operation_date")
      .is("voided_at", null),
  ]);

  if (schoolError) throw new Error(schoolError.message);
  if (libraryError) throw new Error(libraryError.message);
  if (paymentsError) throw new Error(paymentsError.message);

  const students = schoolSummaries || [];
  const libraryUsers = librarySummaries || [];
  const allPayments = payments || [];

  const schoolCollected = students.reduce((sum, row) => sum + Number(row.total_paid || 0), 0);
  const libraryCollected = libraryUsers.reduce(
    (sum, row) => sum + Number(row.total_paid || 0),
    0
  );
  const schoolOutstanding = students.reduce(
    (sum, row) => sum + Number(row.total_owed || 0),
    0
  );
  const libraryOutstanding = libraryUsers.reduce(
    (sum, row) => sum + Number(row.total_owed || 0),
    0
  );

  const studentsFullyPaid = students.filter(
    (row) => schoolFee > 0 && Number(row.total_owed || 0) <= 0
  ).length;
  const libraryFullyPaid = libraryUsers.filter(
    (row) => libraryFee > 0 && Number(row.total_owed || 0) <= 0
  ).length;

  const schoolPayments = allPayments.filter((p) => p.payment_type === "school_fee");
  const libraryPayments = allPayments.filter((p) => p.payment_type === "library_fee");

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const collectedThisMonth = allPayments
    .filter((p) => {
      const date = new Date(p.operation_date);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    })
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return {
    schoolFee,
    libraryFee,
    totalCollected: schoolCollected + libraryCollected,
    schoolCollected,
    libraryCollected,
    totalOutstanding: schoolOutstanding + libraryOutstanding,
    schoolOutstanding,
    libraryOutstanding,
    studentCount: students.length,
    libraryUserCount: libraryUsers.length,
    studentsFullyPaid,
    libraryFullyPaid,
    installmentCount: allPayments.length,
    schoolInstallmentCount: schoolPayments.length,
    libraryInstallmentCount: libraryPayments.length,
    collectedThisMonth,
  };
};
