/**
 * Client-side totals — must match v_student_course_balances + payment ledger.
 * Only courses with a catalog fee (course_price > 0) count toward amount owed.
 */
export function computeStudentPaymentTotals({
  balances = [],
  payments = [],
  allocations = [],
}) {
  const courseRows = (balances || [])
    .filter((b) => Number(b.course_price || 0) > 0)
    .sort(
      (a, b) =>
        new Date(a.course_created_at || 0) - new Date(b.course_created_at || 0)
    );

  const totalCoursePrice = courseRows.reduce(
    (s, b) => s + Number(b.course_price || 0),
    0
  );
  const totalPaidOnCourses = courseRows.reduce(
    (s, b) => s + Number(b.amount_paid || 0),
    0
  );
  const totalOwed = courseRows.reduce((s, b) => s + Number(b.balance_due || 0), 0);

  const activePayments = (payments || []).filter((p) => !p.voided_at);
  const activeAllocations = (allocations || []).filter((a) => !a.voided_at);

  const totalDeposits = activePayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalAllocated = activeAllocations.reduce(
    (s, a) => s + Number(a.amount || 0),
    0
  );
  const creditBalance = Math.max(totalDeposits - totalAllocated, 0);

  return {
    courseRows,
    totalCoursePrice,
    totalPaidOnCourses,
    totalOwed,
    totalDeposits,
    totalAllocated,
    creditBalance,
  };
}
