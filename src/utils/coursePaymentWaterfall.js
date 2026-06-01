/**
 * Preview waterfall allocation: oldest course first (by course_created_at), fill each balance_due.
 */
export function computeWaterfallAllocations(depositAmount, courseRows = []) {
  const amount = Number(depositAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { allocations: [], assignedTotal: 0, credit: 0 };
  }

  const ordered = [...courseRows].sort(
    (a, b) =>
      new Date(a.course_created_at || 0) - new Date(b.course_created_at || 0) ||
      String(a.course_id).localeCompare(String(b.course_id))
  );

  let remaining = amount;
  const allocations = [];

  for (const row of ordered) {
    if (remaining <= 0) break;
    const owed = Number(row.balance_due || 0);
    if (owed <= 0) continue;

    const apply = Math.min(remaining, owed);
    allocations.push({
      courseId: row.course_id,
      courseTitle: row.course_title,
      amount: apply,
      balanceBefore: owed,
    });
    remaining -= apply;
  }

  return {
    allocations,
    assignedTotal: amount - remaining,
    credit: remaining,
  };
}
