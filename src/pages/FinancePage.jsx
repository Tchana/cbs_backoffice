import { useEffect, useMemo, useState } from "react";
import Header from "../components/common/Header";
import { useApiLoader } from "../contexts/ApiLoaderContext";
import {
  CreateManualDebt,
  GetFinanceSummary,
  GetSubscriptionTransactions,
  GetStudentFinanceLedger,
  RecordPayment,
  UpsertReceiptMetadata,
} from "../services/FinanceManagement";

const formatMoney = (v) => `${Number(v || 0).toLocaleString()} XAF`;

const planDisplayName = (targetRole) => {
  if (targetRole === "library_user") return "Library User Plan";
  if (targetRole === "student") return "Student Plan";
  return "Subscription Plan";
};

const formatPaymentDateTime = (iso) => {
  if (!iso) return { date: "-", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
};

const paymentDisplayReference = (tx) => {
  const payload = tx.checkout_payload;
  if (payload?.displayReference) return payload.displayReference;
  const prefix = tx.plan?.target_role === "library_user" ? "LIB" : "STUD";
  const suffix = (tx.provider_tx_ref || "").replace(/-/g, "").slice(0, 6).toUpperCase();
  return suffix ? `${prefix}-${suffix}` : "-";
};

const statusClass = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "succeeded") return "bg-emerald-900/50 text-emerald-300";
  if (s === "failed" || s === "cancelled") return "bg-red-900/50 text-red-300";
  return "bg-amber-900/50 text-amber-300";
};

const FinancePage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [view, setView] = useState("payments");
  const [payments, setPayments] = useState([]);
  const [feeRows, setFeeRows] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [ledger, setLedger] = useState({ charges: [], payments: [] });
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [debtForm, setDebtForm] = useState({ amount: "", description: "" });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "cash",
    reference: "",
    notes: "",
  });

  const loadPayments = async () => {
    const data = await runWithLoader(() => GetSubscriptionTransactions());
    setPayments(data || []);
  };

  const loadFees = async () => {
    const data = await runWithLoader(() => GetFinanceSummary());
    setFeeRows(data || []);
  };

  const loadAll = async () => {
    await Promise.all([loadPayments(), loadFees()]);
  };

  const loadLedger = async (student) => {
    if (!student?.student_id) return;
    const data = await runWithLoader(() => GetStudentFinanceLedger(student.student_id));
    setLedger({ charges: data.charges || [], payments: data.payments || [] });
  };

  useEffect(() => {
    loadAll().catch((e) => console.error("Load finance failed", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paymentStats = useMemo(() => {
    const succeeded = payments.filter((p) => p.provider_status === "succeeded").length;
    const pending = payments.filter((p) => p.provider_status === "pending").length;
    const failed = payments.filter(
      (p) => p.provider_status === "failed" || p.provider_status === "cancelled"
    ).length;
    return { succeeded, pending, failed, total: payments.length };
  }, [payments]);

  const feeStats = useMemo(() => {
    const totalDue = feeRows.reduce((s, r) => s + Number(r.balance_due || 0), 0);
    const withDebt = feeRows.filter((r) => Number(r.balance_due || 0) > 0).length;
    return { totalDue, withDebt };
  }, [feeRows]);

  const openStudent = async (student) => {
    setSelectedStudent(student);
    await loadLedger(student);
  };

  const closeStudent = () => {
    setSelectedStudent(null);
    setLedger({ charges: [], payments: [] });
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    await runWithLoader(() =>
      CreateManualDebt({
        studentId: selectedStudent.student_id,
        amount: debtForm.amount,
        operationDate: new Date().toISOString(),
        description: debtForm.description,
      })
    );
    setShowDebtModal(false);
    setDebtForm({ amount: "", description: "" });
    await Promise.all([loadFees(), loadLedger(selectedStudent)]);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    await runWithLoader(() =>
      RecordPayment({
        studentId: selectedStudent.student_id,
        amount: paymentForm.amount,
        operationDate: new Date().toISOString(),
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      })
    );
    setShowPaymentModal(false);
    setPaymentForm({ amount: "", paymentMethod: "cash", reference: "", notes: "" });
    await Promise.all([loadFees(), loadLedger(selectedStudent)]);
  };

  const generateReceipt = async (payment) => {
    if (!selectedStudent) return;
    const receiptNumber = `RCP-${new Date().getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;
    await runWithLoader(() =>
      UpsertReceiptMetadata({
        paymentId: payment.id,
        studentId: selectedStudent.student_id,
        receiptNumber,
        operationDate: payment.operation_date,
      })
    );
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Payment Receipt", 14, 18);
    doc.setFontSize(11);
    doc.text(`Receipt No: ${receiptNumber}`, 14, 30);
    doc.text(
      `Student: ${(selectedStudent.first_name || "").trim()} ${(selectedStudent.last_name || "").trim()}`.trim(),
      14,
      38
    );
    doc.text(`Amount: ${formatMoney(payment.amount)}`, 14, 46);
    doc.text(`Method: ${payment.payment_method || "-"}`, 14, 54);
    doc.save(`${receiptNumber}.pdf`);
  };

  const studentName = (row) =>
    `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email || "-";

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Finance" />
      <main className="max-w-6xl mx-auto py-6 px-4 lg:px-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg bg-gray-800 p-1 border border-gray-700">
            <TabButton active={view === "payments"} onClick={() => setView("payments")}>
              Subscription payments
            </TabButton>
            <TabButton active={view === "fees"} onClick={() => setView("fees")}>
              Course fees
            </TabButton>
          </div>
          <button
            type="button"
            onClick={() => loadAll()}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm text-gray-100 hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>

        {view === "payments" && (
          <section className="rounded-xl border border-gray-700 bg-gray-800/80 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Mobile money payments</h2>
              <p className="mt-1 text-sm text-gray-400">
                Payments from the app (pawaPay). Manage subscriptions on the Subscriptions page.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Total" value={paymentStats.total} />
              <Stat label="Succeeded" value={paymentStats.succeeded} tone="success" />
              <Stat label="Pending" value={paymentStats.pending} tone="warn" />
              <Stat label="Failed" value={paymentStats.failed} tone="danger" />
            </div>

            <div className="overflow-auto rounded-lg border border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-900/80 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Plan</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-100">
                  {payments.map((tx) => {
                    const { date, time } = formatPaymentDateTime(tx.created_at);
                    return (
                      <tr key={tx.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-100">{date}</div>
                          {time ? <div className="text-xs text-gray-500">{time}</div> : null}
                        </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-100">{studentName(tx.profile || {})}</div>
                        {tx.profile?.email ? (
                          <div className="text-xs text-gray-500">{tx.profile.email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{planDisplayName(tx.plan?.target_role)}</td>
                      <td className="px-4 py-3 font-medium">{formatMoney(tx.amount)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${statusClass(tx.provider_status)}`}
                        >
                          {tx.provider_status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">
                        {paymentDisplayReference(tx)}
                      </td>
                      </tr>
                    );
                  })}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                        No payments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "fees" && (
          <section className="rounded-xl border border-gray-700 bg-gray-800/80 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Course fees</h2>
              <p className="mt-1 text-sm text-gray-400">
                Manual charges and cash payments for individual courses (separate from trimester subscriptions).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Stat label="Total outstanding" value={formatMoney(feeStats.totalDue)} />
              <Stat label="Students with balance" value={feeStats.withDebt} />
            </div>

            <div className="overflow-auto rounded-lg border border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-900/80 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-left">Balance</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-100">
                  {feeRows.map((r) => (
                    <tr key={r.student_id}>
                      <td className="px-4 py-3">{studentName(r)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            Number(r.balance_due) > 0 ? "text-amber-300" : "text-gray-300"
                          }
                        >
                          {formatMoney(r.balance_due)}
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
                  {feeRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-gray-400">
                        No course fee records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedStudent && (
              <div className="rounded-lg border border-gray-600 bg-gray-900/50 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium text-white">{studentName(selectedStudent)}</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDebtModal(true)}
                      className="rounded-md bg-amber-700 px-3 py-1 text-xs text-white hover:bg-amber-600"
                    >
                      Add charge
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="rounded-md bg-emerald-700 px-3 py-1 text-xs text-white hover:bg-emerald-600"
                    >
                      Record payment
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <LedgerList
                    title="Charges"
                    empty="No charges."
                    items={ledger.charges.map((c) => ({
                      id: c.id,
                      primary: c.description || c.charge_type,
                      secondary: `${formatMoney(c.amount)} - ${c.course?.title || "General"}`,
                    }))}
                  />
                  <LedgerList
                    title="Payments"
                    empty="No payments."
                    items={ledger.payments.map((p) => ({
                      id: p.id,
                      primary: formatMoney(p.amount),
                      secondary: p.payment_method,
                      action: (
                        <button
                          type="button"
                          onClick={() => generateReceipt(p)}
                          className="mt-1 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          PDF receipt
                        </button>
                      ),
                    }))}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {showDebtModal && (
          <Modal title="Add charge" onClose={() => setShowDebtModal(false)}>
            <form onSubmit={handleAddDebt} className="space-y-3">
              <input
                type="number"
                min="1"
                required
                value={debtForm.amount}
                onChange={(e) => setDebtForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder="Amount (XAF)"
                className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
              />
              <textarea
                value={debtForm.description}
                onChange={(e) => setDebtForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Description"
                rows={2}
                className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
              />
              <button className="w-full rounded-md bg-amber-600 py-2 text-white hover:bg-amber-500">
                Save
              </button>
            </form>
          </Modal>
        )}

        {showPaymentModal && (
          <Modal title="Record payment" onClose={() => setShowPaymentModal(false)}>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <input
                type="number"
                min="1"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder="Amount (XAF)"
                className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
              />
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) =>
                  setPaymentForm((s) => ({ ...s, paymentMethod: e.target.value }))
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
                onChange={(e) => setPaymentForm((s) => ({ ...s, reference: e.target.value }))}
                placeholder="Reference (optional)"
                className="w-full rounded-md bg-gray-700 px-3 py-2 text-white"
              />
              <button className="w-full rounded-md bg-emerald-600 py-2 text-white hover:bg-emerald-500">
                Save
              </button>
            </form>
          </Modal>
        )}
      </main>
    </div>
  );
};

const TabButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
      active ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
    }`}
  >
    {children}
  </button>
);

const Stat = ({ label, value, tone }) => {
  const toneClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "danger"
          ? "text-red-300"
          : "text-white";
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
};

const LedgerList = ({ title, empty, items }) => (
  <div className="rounded-lg bg-gray-800 p-3">
    <p className="mb-2 text-sm font-medium text-gray-200">{title}</p>
    <div className="max-h-48 space-y-2 overflow-auto">
      {items.map((item) => (
        <div key={item.id} className="rounded-md bg-gray-900 px-3 py-2 text-sm">
          <p className="text-white">{item.primary}</p>
          <p className="text-xs text-gray-400">{item.secondary}</p>
          {item.action}
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-gray-500">{empty}</p>}
    </div>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-5">
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

export default FinancePage;
