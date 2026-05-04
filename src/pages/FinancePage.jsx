import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import Header from "../components/common/Header";
import { useApiLoader } from "../contexts/ApiLoaderContext";
import {
  CreateManualDebt,
  GetFinanceSummary,
  GetStudentFinanceLedger,
  RecordPayment,
  UpsertReceiptMetadata,
} from "../services/FinanceManagement";

const formatMoney = (v) => `${Number(v || 0).toLocaleString()} FCFA`;

const FinancePage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [rows, setRows] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [ledger, setLedger] = useState({ charges: [], payments: [], allocations: [] });
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [debtForm, setDebtForm] = useState({ amount: "", operationDate: "", description: "" });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    operationDate: "",
    paymentMethod: "cash",
    reference: "",
    notes: "",
  });

  const loadSummary = async () => {
    const data = await runWithLoader(() => GetFinanceSummary());
    setRows(data || []);
  };

  const loadLedger = async (student) => {
    if (!student?.student_id) return;
    const data = await runWithLoader(() => GetStudentFinanceLedger(student.student_id));
    setLedger(data);
  };

  useEffect(() => {
    loadSummary().catch((e) => console.error("Load finance summary failed", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const totalDue = rows.reduce((s, r) => s + Number(r.balance_due || 0), 0);
    const totalCharges = rows.reduce((s, r) => s + Number(r.total_charges || 0), 0);
    const totalPayments = rows.reduce((s, r) => s + Number(r.total_payments || 0), 0);
    const debtStudents = rows.filter((r) => Number(r.balance_due || 0) > 0).length;
    return { totalDue, totalCharges, totalPayments, debtStudents };
  }, [rows]);

  const openLedger = async (student) => {
    setSelectedStudent(student);
    await loadLedger(student);
  };

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    await runWithLoader(() =>
      CreateManualDebt({
        studentId: selectedStudent.student_id,
        amount: debtForm.amount,
        operationDate: debtForm.operationDate || new Date().toISOString(),
        description: debtForm.description,
      })
    );
    setShowDebtModal(false);
    setDebtForm({ amount: "", operationDate: "", description: "" });
    await Promise.all([loadSummary(), loadLedger(selectedStudent)]);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    await runWithLoader(() =>
      RecordPayment({
        studentId: selectedStudent.student_id,
        amount: paymentForm.amount,
        operationDate: paymentForm.operationDate || new Date().toISOString(),
        paymentMethod: paymentForm.paymentMethod,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      })
    );
    setShowPaymentModal(false);
    setPaymentForm({
      amount: "",
      operationDate: "",
      paymentMethod: "cash",
      reference: "",
      notes: "",
    });
    await Promise.all([loadSummary(), loadLedger(selectedStudent)]);
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
    doc.text(`Email: ${selectedStudent.email || "-"}`, 14, 46);
    doc.text(`Amount: ${formatMoney(payment.amount)}`, 14, 54);
    doc.text(`Method: ${payment.payment_method || "-"}`, 14, 62);
    doc.text(`Reference: ${payment.reference || "-"}`, 14, 70);
    doc.text(
      `Operation Date: ${payment.operation_date ? new Date(payment.operation_date).toLocaleString() : "-"}`,
      14,
      78
    );
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 14, 86);
    doc.text("Thank you.", 14, 98);
    doc.save(`${receiptNumber}.pdf`);
  };

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Finance" />
      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8 space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Kpi title="Total Due" value={formatMoney(totals.totalDue)} />
          <Kpi title="Total Charges" value={formatMoney(totals.totalCharges)} />
          <Kpi title="Total Paid" value={formatMoney(totals.totalPayments)} />
          <Kpi title="Students with Debt" value={String(totals.debtStudents)} />
        </section>

        <section className="bg-gray-800/80 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Student Fees</h2>
            <button
              onClick={() => loadSummary()}
              className="px-3 py-1 bg-gray-700 text-gray-100 rounded-md hover:bg-gray-600"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-300">
                <tr className="border-b border-gray-700">
                  <th className="py-2 text-left">Student</th>
                  <th className="py-2 text-left">Charges</th>
                  <th className="py-2 text-left">Paid</th>
                  <th className="py-2 text-left">Balance</th>
                  <th className="py-2 text-left">Last Payment</th>
                  <th className="py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="text-gray-100">
                {rows.map((r) => (
                  <tr key={r.student_id} className="border-b border-gray-700/60">
                    <td className="py-2">
                      {`${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email}
                    </td>
                    <td className="py-2">{formatMoney(r.total_charges)}</td>
                    <td className="py-2">{formatMoney(r.total_payments)}</td>
                    <td className="py-2">{formatMoney(r.balance_due)}</td>
                    <td className="py-2">
                      {r.last_payment_at ? new Date(r.last_payment_at).toLocaleString() : "Never"}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => openLedger(r)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-500"
                      >
                        Ledger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedStudent && (
          <section className="bg-gray-800/80 border border-gray-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">
                Ledger: {`${selectedStudent.first_name || ""} ${selectedStudent.last_name || ""}`.trim()}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDebtModal(true)}
                  className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-500"
                >
                  Add Debt
                </button>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-500"
                >
                  Record Payment
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-200 font-medium mb-2">Charges</p>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {ledger.charges.map((c) => (
                    <div key={c.id} className="bg-gray-800 rounded-md p-2">
                      <p className="text-white text-sm">{c.description || c.charge_type}</p>
                      <p className="text-gray-300 text-xs">
                        {formatMoney(c.amount)} · {c.course?.title || "No course"} ·{" "}
                        {c.operation_date ? new Date(c.operation_date).toLocaleDateString() : "-"}
                      </p>
                    </div>
                  ))}
                  {ledger.charges.length === 0 ? <p className="text-gray-400 text-sm">No charges.</p> : null}
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-200 font-medium mb-2">Payments</p>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {ledger.payments.map((p) => (
                    <div key={p.id} className="bg-gray-800 rounded-md p-2">
                      <p className="text-white text-sm">{formatMoney(p.amount)}</p>
                      <p className="text-gray-300 text-xs">
                        {p.payment_method} · {p.operation_date ? new Date(p.operation_date).toLocaleDateString() : "-"}
                      </p>
                      <div className="mt-2">
                        <button
                          onClick={() => generateReceipt(p)}
                          className="px-2 py-1 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-500"
                        >
                          Generate PDF Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                  {ledger.payments.length === 0 ? <p className="text-gray-400 text-sm">No payments.</p> : null}
                </div>
              </div>
            </div>
          </section>
        )}

        {showDebtModal && (
          <Modal title="Add Student Debt" onClose={() => setShowDebtModal(false)}>
            <form onSubmit={handleAddDebt} className="space-y-3">
              <input
                type="number"
                min="1"
                required
                value={debtForm.amount}
                onChange={(e) => setDebtForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder="Amount (FCFA)"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
              <input
                type="datetime-local"
                value={debtForm.operationDate}
                onChange={(e) => setDebtForm((s) => ({ ...s, operationDate: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
              <textarea
                value={debtForm.description}
                onChange={(e) => setDebtForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Reason / description"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
              <button className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-500">
                Save Debt
              </button>
            </form>
          </Modal>
        )}

        {showPaymentModal && (
          <Modal title="Record Payment" onClose={() => setShowPaymentModal(false)}>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <input
                type="number"
                min="1"
                required
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder="Amount (FCFA)"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
              <input
                type="datetime-local"
                value={paymentForm.operationDate}
                onChange={(e) => setPaymentForm((s) => ({ ...s, operationDate: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm((s) => ({ ...s, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm((s) => ({ ...s, reference: e.target.value }))}
                placeholder="Reference"
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Notes"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              />
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-500">
                Save Payment
              </button>
            </form>
          </Modal>
        )}
      </main>
    </div>
  );
};

const Kpi = ({ title, value }) => (
  <div className="bg-gray-800/80 border border-gray-700 rounded-lg p-4">
    <p className="text-gray-300 text-sm">{title}</p>
    <p className="text-white text-xl font-semibold mt-1">{value}</p>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative w-full max-w-lg bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-semibold">{title}</p>
        <button onClick={onClose} className="text-gray-300 hover:text-white">
          Close
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default FinancePage;

