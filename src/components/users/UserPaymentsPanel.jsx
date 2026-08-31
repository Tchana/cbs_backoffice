import { useEffect, useMemo, useState } from "react";
import {
  getLibraryUserPaymentSummary,
  getPaymentTypeForRole,
  getStudentPaymentSummary,
  getUserPaymentHistory,
  getUserTotalOwed,
  PAYMENT_METHODS,
  PAYMENT_TYPE_LABELS,
  recordUserPayment,
} from "../../services/PaymentManagement";
import { getPaymentCollectionMode } from "../../services/SettingsManagement";

const formatAmount = (amount, currency = "XAF") =>
  `${Number(amount || 0).toLocaleString()} ${currency}`;

const UserPaymentsPanel = ({ user, onPaymentRecorded }) => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [totalOwed, setTotalOwed] = useState(0);
  const [paymentMode, setPaymentMode] = useState("manual");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const paymentType = getPaymentTypeForRole(user?.role);
  const canRecord = paymentType && paymentMode === "manual";

  const feeAmount = Number(summary?.fee_amount || 0);
  const totalPaid = Number(summary?.total_paid || 0);
  const progressPercent =
    feeAmount > 0 ? Math.min(100, Math.round((totalPaid / feeAmount) * 100)) : 0;
  const isFullyPaid = feeAmount > 0 && totalOwed <= 0;
  const canRecordInstallment = canRecord && !isFullyPaid;

  const installmentCount = useMemo(
    () => history.filter((p) => !p.voided_at).length,
    [history]
  );

  const loadData = async () => {
    if (!user?.id || !paymentType) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const summaryPromise =
        user.role === "student"
          ? getStudentPaymentSummary(user.id)
          : user.role === "library_user"
          ? getLibraryUserPaymentSummary(user.id)
          : Promise.resolve(null);

      const [mode, owed, payments, paymentSummary] = await Promise.all([
        getPaymentCollectionMode(),
        getUserTotalOwed(user.id),
        getUserPaymentHistory(user.id),
        summaryPromise,
      ]);
      setPaymentMode(mode);
      setTotalOwed(owed);
      setHistory(payments);
      setSummary(paymentSummary);
    } catch (err) {
      setError(err?.message || "Failed to load payment data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount, 10);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid installment amount.");
      return;
    }

    if (feeAmount > 0 && totalOwed > 0 && parsedAmount > totalOwed) {
      setError(
        `Installment cannot exceed the remaining balance of ${formatAmount(totalOwed)}.`
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      await recordUserPayment(user, {
        amount: parsedAmount,
        paymentMethod,
        reference,
        notes,
      });
      setAmount("");
      setReference("");
      setNotes("");
      await loadData();
      onPaymentRecorded?.();
    } catch (err) {
      setError(err?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const handlePayRemaining = () => {
    if (totalOwed > 0) {
      setAmount(String(totalOwed));
      setError("");
    }
  };

  if (!paymentType) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Payment type</p>
          <p className="mt-1 text-sm font-medium text-gray-100">
            {PAYMENT_TYPE_LABELS[paymentType]}
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total fee</p>
          <p className="mt-1 text-sm font-medium text-gray-100">
            {feeAmount > 0 ? formatAmount(feeAmount) : "Not set"}
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total paid</p>
          <p className="mt-1 text-sm font-medium text-gray-100">
            {formatAmount(totalPaid)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Remaining</p>
          <p
            className={`mt-1 text-sm font-medium ${
              totalOwed > 0 ? "text-amber-300" : "text-green-300"
            }`}
          >
            {feeAmount > 0 ? formatAmount(totalOwed) : "—"}
          </p>
        </div>
      </div>

      {feeAmount > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/30 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
            <span>Installment progress</span>
            <span>
              {progressPercent}% · {installmentCount} payment
              {installmentCount === 1 ? "" : "s"} recorded
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${
                isFullyPaid ? "bg-green-500" : "bg-indigo-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {user.role === "student" && (
        <p className="text-xs text-gray-500">
          Students can pay school fees in installments. Record each partial payment separately.
          Library access is included with school fees.
        </p>
      )}

      {user.role === "library_user" && (
        <p className="text-xs text-gray-500">
          Library users can pay the library fee in installments. Record each partial payment
          separately.
        </p>
      )}

      {feeAmount <= 0 && (
        <p className="rounded-lg border border-amber-700/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          Set the {user.role === "student" ? "school" : "library"} fee amount on the Finance page
          before tracking installments and outstanding balances.
        </p>
      )}

      {isFullyPaid && (
        <p className="rounded-lg border border-green-700/40 bg-green-900/20 px-4 py-3 text-sm text-green-200">
          Fee fully paid. No further installments are required.
        </p>
      )}

      {paymentMode === "automatic" ? (
        <p className="rounded-lg border border-indigo-700/40 bg-indigo-900/20 px-4 py-3 text-sm text-indigo-200">
          Payment collection is set to automatic. Manual recording is disabled until you switch
          back to manual mode on the Finance page.
        </p>
      ) : (
        canRecordInstallment && (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-lg border border-gray-700 bg-gray-900/30 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-200">Record installment</p>
              {totalOwed > 0 && (
                <button
                  type="button"
                  onClick={handlePayRemaining}
                  disabled={saving}
                  className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                >
                  Use remaining balance ({formatAmount(totalOwed)})
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-gray-400">
                  Installment amount (XAF)
                  {totalOwed > 0 ? ` · max ${formatAmount(totalOwed)}` : ""}
                </span>
                <input
                  type="number"
                  min="1"
                  max={totalOwed > 0 ? totalOwed : undefined}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                  placeholder={totalOwed > 0 ? `e.g. ${Math.min(totalOwed, 50000)}` : "e.g. 50000"}
                  disabled={saving}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400">Method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                  disabled={saving}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-gray-400">Reference (optional)</span>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                  disabled={saving}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-gray-400">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                  disabled={saving}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Record installment"}
            </button>
          </form>
        )
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div>
        <p className="mb-2 text-sm font-medium text-gray-200">Installment history</p>
        {loading ? (
          <p className="text-sm text-gray-500">Loading payments...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-500">No installments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/60 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {history.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-2 text-gray-400">
                      {payment.installment_number || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {new Date(payment.operation_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type}
                    </td>
                    <td className="px-3 py-2 text-gray-100">
                      {formatAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="px-3 py-2 capitalize text-gray-300">
                      {payment.payment_method?.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2 text-gray-400">{payment.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPaymentsPanel;
