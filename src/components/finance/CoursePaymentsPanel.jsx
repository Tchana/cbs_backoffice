import { useCallback, useEffect, useMemo, useState } from "react";
import { useApiLoader } from "../../contexts/ApiLoaderContext";
import {
  ApplyCourseCredit,
  GetCoursePaymentSummary,
  GetStudentCourseBalances,
  GetStudentCoursePaymentLedger,
  RecordCoursePayment,
  VoidCourseAllocation,
  VoidCoursePayment,
} from "../../services/CoursePaymentManagement";
import {
  downloadCourseDepositReceiptPdf,
  downloadStudentCoursePaymentReportPdf,
} from "../../utils/coursePaymentReceiptPdf";
import { computeStudentPaymentTotals } from "../../utils/coursePaymentTotals";
import { computeWaterfallAllocations } from "../../utils/coursePaymentWaterfall";

const formatMoney = (v) => `${Number(v || 0).toLocaleString()} XAF`;

const studentName = (row) =>
  `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email || "-";

const CoursePaymentsPanel = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [balances, setBalances] = useState([]);
  const [ledger, setLedger] = useState({ payments: [], allocations: [] });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "cash",
    reference: "",
    notes: "",
  });
  const [creditForm, setCreditForm] = useState({ courseId: "", amount: "" });
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    const data = await runWithLoader(() => GetCoursePaymentSummary());
    setRows(data || []);
  }, [runWithLoader]);

  const loadStudent = useCallback(
    async (student) => {
      if (!student?.student_id) return;
      const [bal, led] = await Promise.all([
        runWithLoader(() => GetStudentCourseBalances(student.student_id)),
        runWithLoader(() => GetStudentCoursePaymentLedger(student.student_id)),
      ]);
      setBalances(bal || []);
      setLedger(led || { payments: [], allocations: [] });
    },
    [runWithLoader]
  );

  useEffect(() => {
    loadSummary().catch((e) => console.error(e));
  }, [loadSummary]);

  const stats = useMemo(() => {
    const withDebt = rows.filter((r) => Number(r.total_owed || 0) > 0).length;
    const totalOwed = rows.reduce((s, r) => s + Number(r.total_owed || 0), 0);
    const totalCredit = rows.reduce((s, r) => s + Math.max(Number(r.credit_balance || 0), 0), 0);
    return { withDebt, totalOwed, totalCredit };
  }, [rows]);

  const openStudent = async (student) => {
    setSelected(student);
    setError("");
    await loadStudent(student);
  };

  const closeStudent = () => {
    setSelected(null);
    setBalances([]);
    setLedger({ payments: [], allocations: [] });
    setError("");
  };

  const refreshAll = async () => {
    const data = await runWithLoader(() => GetCoursePaymentSummary());
    setRows(data || []);
    if (selected) {
      const updated = (data || []).find((r) => r.student_id === selected.student_id);
      const student = updated || selected;
      if (updated) setSelected(updated);
      await loadStudent(student);
    }
  };

  const openPaymentModal = () => {
    setError("");
    setPaymentForm({
      amount: "",
      paymentMethod: "cash",
      reference: "",
      notes: "",
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setError("");
    if (!selected) return;

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }

    try {
      await runWithLoader(() =>
        RecordCoursePayment({
          studentId: selected.student_id,
          amount,
          paymentMethod: paymentForm.paymentMethod,
          reference: paymentForm.reference,
          notes: paymentForm.notes,
          allocations: null,
        })
      );
      setShowPaymentModal(false);
      setPaymentForm({
        amount: "",
        paymentMethod: "cash",
        reference: "",
        notes: "",
      });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to record payment.");
    }
  };

  const handleApplyCredit = async (e) => {
    e.preventDefault();
    setError("");
    if (!selected) return;
    try {
      await runWithLoader(() =>
        ApplyCourseCredit({
          studentId: selected.student_id,
          courseId: creditForm.courseId,
          amount: creditForm.amount,
        })
      );
      setShowCreditModal(false);
      setCreditForm({ courseId: "", amount: "" });
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to apply credit.");
    }
  };

  const handleVoidPayment = async (paymentId) => {
    const reason = window.prompt("Reason for voiding this payment (optional):") ?? "";
    setError("");
    try {
      await runWithLoader(() => VoidCoursePayment(paymentId, reason));
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to void payment.");
    }
  };

  const handleVoidAllocation = async (allocationId) => {
    const reason = window.prompt("Reason for voiding this allocation (optional):") ?? "";
    setError("");
    try {
      await runWithLoader(() => VoidCourseAllocation(allocationId, reason));
      await refreshAll();
    } catch (err) {
      setError(err.message || "Failed to void allocation.");
    }
  };

  const studentTotals = useMemo(() => {
    if (!selected) return null;
    return computeStudentPaymentTotals({
      balances,
      payments: ledger.payments,
      allocations: ledger.allocations,
    });
  }, [selected, balances, ledger.payments, ledger.allocations]);

  const displayBalances = useMemo(
    () => studentTotals?.courseRows ?? [],
    [studentTotals]
  );

  const waterfallPreview = useMemo(
    () => computeWaterfallAllocations(paymentForm.amount, displayBalances),
    [paymentForm.amount, displayBalances]
  );

  const allocationsByPayment = useMemo(() => {
    const map = {};
    for (const a of ledger.allocations) {
      const key = a.payment_id || "credit";
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [ledger.allocations]);

  const handleDownloadDepositReceipt = async (payment) => {
    if (!selected || payment.voided_at) return;
    setError("");
    try {
      await downloadCourseDepositReceiptPdf({
        student: selected,
        payment,
        allocations: allocationsByPayment[payment.id] || [],
      });
    } catch (err) {
      setError(err.message || "Failed to generate receipt.");
    }
  };

  const handleDownloadPaymentReport = async () => {
    if (!selected) return;
    setError("");
    try {
      await downloadStudentCoursePaymentReportPdf({
        student: selected,
        balances,
        payments: ledger.payments,
        allocations: ledger.allocations,
      });
    } catch (err) {
      setError(err.message || "Failed to generate payment report.");
    }
  };

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/80 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Course payments</h2>
        <p className="text-sm text-gray-400 mt-1">
          Record any deposit amount; it is applied to courses automatically in catalog
          order (oldest course first) until the money runs out. Any remainder stays as
          credit. Download a payment report or per-deposit receipt from the student view.
          This does not affect app access.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Students with balance due" value={stats.withDebt} />
        <Stat label="Total owed (all students)" value={formatMoney(stats.totalOwed)} />
        <Stat label="Total credit on account" value={formatMoney(stats.totalCredit)} />
      </div>

      {error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900/80 text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-right">Deposits</th>
              <th className="px-4 py-3 text-right">Assigned</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Owed</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {rows.map((r) => (
              <tr key={r.student_id} className="hover:bg-gray-900/40">
                <td className="px-4 py-3 text-white">{studentName(r)}</td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatMoney(r.total_deposits)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatMoney(r.total_allocated)}
                </td>
                <td className="px-4 py-3 text-right text-emerald-300">
                  {formatMoney(Math.max(Number(r.credit_balance || 0), 0))}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      Number(r.total_owed || 0) > 0 ? "text-amber-300" : "text-gray-400"
                    }
                  >
                    {formatMoney(r.total_owed)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openStudent(r)}
                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-500"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  No students found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="rounded-lg border border-gray-600 bg-gray-900/50 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-medium text-white">{studentName(selected)}</h3>
              <p className="text-xs text-gray-400 mt-1">
                Credit:{" "}
                <span className="text-emerald-300">
                  {formatMoney(studentTotals?.creditBalance ?? 0)}
                </span>
                {" · "}
                Total owed:{" "}
                <span className="text-amber-300">
                  {formatMoney(studentTotals?.totalOwed ?? 0)}
                </span>
                <span className="text-gray-500">
                  {" "}
                  (sum of per-course balances)
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadPaymentReport}
                className="rounded-md bg-violet-700 px-3 py-1 text-xs text-white hover:bg-violet-600"
              >
                Payment report (PDF)
              </button>
              <button
                type="button"
                onClick={openPaymentModal}
                className="rounded-md bg-emerald-700 px-3 py-1 text-xs text-white hover:bg-emerald-600"
              >
                Record deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowCreditModal(true);
                }}
                disabled={Number(studentTotals?.creditBalance ?? 0) <= 0}
                className="rounded-md bg-sky-700 px-3 py-1 text-xs text-white hover:bg-sky-600 disabled:opacity-40"
              >
                Apply credit
              </button>
              <button
                type="button"
                onClick={closeStudent}
                className="rounded-md bg-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/80 text-gray-400">
                <tr>
                  <th className="px-3 py-2 text-left">Course (creation order)</th>
                  <th className="px-3 py-2 text-right">Course fee</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {displayBalances.map((b) => (
                  <tr key={b.course_id}>
                    <td className="px-3 py-2 text-white">{b.course_title}</td>
                    <td className="px-3 py-2 text-right text-gray-300">
                      {formatMoney(b.course_price)}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-300">
                      {formatMoney(b.amount_paid)}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-300">
                      {formatMoney(b.balance_due)}
                    </td>
                  </tr>
                ))}
                {displayBalances.length > 0 && studentTotals && (
                  <tr className="bg-gray-900/60 font-semibold">
                    <td className="px-3 py-2 text-white">Total</td>
                    <td className="px-3 py-2 text-right text-gray-200">
                      {formatMoney(studentTotals.totalCoursePrice)}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-200">
                      {formatMoney(studentTotals.totalPaidOnCourses)}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-200">
                      {formatMoney(studentTotals.totalOwed)}
                    </td>
                  </tr>
                )}
                {displayBalances.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                      No courses with a catalog fee yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-200 mb-2">Deposits</p>
              <div className="max-h-64 space-y-2 overflow-auto">
                {ledger.payments.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-md px-3 py-2 text-sm ${
                      p.voided_at ? "bg-gray-900/40 opacity-60" : "bg-gray-800"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-white">{formatMoney(p.amount)}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(p.operation_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{p.payment_method}</p>
                    {(allocationsByPayment[p.id] || []).map((a) => (
                      <p key={a.id} className="text-xs text-gray-500 pl-2">
                        → {a.course?.title}: {formatMoney(a.amount)}
                        {a.voided_at ? " (voided)" : ""}
                      </p>
                    ))}
                    {!p.voided_at && (
                      <div className="mt-1 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadDepositReceipt(p)}
                          className="text-xs text-violet-400 hover:text-violet-300"
                        >
                          Download receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVoidPayment(p.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Void payment
                        </button>
                      </div>
                    )}
                    {p.voided_at && (
                      <p className="text-xs text-red-400 mt-1">Voided</p>
                    )}
                  </div>
                ))}
                {ledger.payments.length === 0 && (
                  <p className="text-sm text-gray-500">No deposits yet.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-200 mb-2">All assignments</p>
              <div className="max-h-64 space-y-2 overflow-auto">
                {ledger.allocations.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-md px-3 py-2 text-sm ${
                      a.voided_at ? "bg-gray-900/40 opacity-60" : "bg-gray-800"
                    }`}
                  >
                    <p className="text-white">
                      {a.course?.title}: {formatMoney(a.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.source === "credit" ? "From credit" : "From deposit"}
                      {" · "}
                      {new Date(a.operation_date).toLocaleDateString()}
                    </p>
                    {!a.voided_at && (
                      <button
                        type="button"
                        onClick={() => handleVoidAllocation(a.id)}
                        className="mt-1 text-xs text-red-400 hover:text-red-300"
                      >
                        Void assignment
                      </button>
                    )}
                  </div>
                ))}
                {ledger.allocations.length === 0 && (
                  <p className="text-sm text-gray-500">No assignments yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selected && (
        <Modal title="Record deposit" onClose={() => setShowPaymentModal(false)}>
          <form onSubmit={handleRecordPayment} className="space-y-3">
            <input
              type="number"
              min="1"
              required
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Deposit amount (XAF)"
              className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
            />

            {Number(paymentForm.amount) > 0 && (
              <div className="rounded-md border border-gray-600 bg-gray-900/50 p-3 space-y-2">
                <p className="text-xs text-gray-400">
                  Waterfall preview (oldest course with a fee first)
                </p>
                {waterfallPreview.allocations.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {waterfallPreview.allocations.map((line) => (
                      <li key={line.courseId} className="flex justify-between text-gray-200">
                        <span>{line.courseTitle}</span>
                        <span>{formatMoney(line.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No outstanding course balances — full amount will be credit.
                  </p>
                )}
                <div className="flex justify-between text-xs pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Assigned to courses</span>
                  <span className="text-emerald-300">
                    {formatMoney(waterfallPreview.assignedTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Credit after deposit</span>
                  <span className="text-sky-300">
                    {formatMoney(waterfallPreview.credit)}
                  </span>
                </div>
              </div>
            )}

            <select
              value={paymentForm.paymentMethod}
              onChange={(e) =>
                setPaymentForm((f) => ({ ...f, paymentMethod: e.target.value }))
              }
              className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
            >
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile money</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>

            <input
              type="text"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="Reference (optional)"
              className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
            />
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
            />
            <button
              type="submit"
              disabled={!paymentForm.amount || Number(paymentForm.amount) <= 0}
              className="w-full rounded-md bg-emerald-600 py-2 text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              Record deposit
            </button>
          </form>
        </Modal>
      )}

      {showCreditModal && selected && (
        <Modal title="Apply credit to course" onClose={() => setShowCreditModal(false)}>
          <form onSubmit={handleApplyCredit} className="space-y-3">
            <p className="text-sm text-gray-400">
              Available credit: {formatMoney(studentTotals?.creditBalance ?? 0)}
            </p>
            <select
              required
              value={creditForm.courseId}
              onChange={(e) => setCreditForm((f) => ({ ...f, courseId: e.target.value }))}
              className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
            >
              <option value="">Select course…</option>
              {displayBalances
                .filter((b) => Number(b.balance_due) > 0)
                .map((b) => (
                  <option key={b.course_id} value={b.course_id}>
                    {b.course_title} (owed {formatMoney(b.balance_due)})
                  </option>
                ))}
            </select>
            <input
              type="number"
              min="1"
              required
              value={creditForm.amount}
              onChange={(e) => setCreditForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="Amount (XAF)"
              className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
            />
            <button className="w-full rounded-md bg-sky-600 py-2 text-white hover:bg-sky-500">
              Apply credit
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
};

const Stat = ({ label, value }) => (
  <div className="rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="mt-1 text-lg font-semibold text-white">{value}</p>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold text-white">{title}</p>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
          Close
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default CoursePaymentsPanel;
