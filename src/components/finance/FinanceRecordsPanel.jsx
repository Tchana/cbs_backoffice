import { useEffect, useMemo, useState } from "react";
import {
  getAllPaymentRecords,
  getFinancePaymentStats,
  PAYMENT_TYPE_LABELS,
} from "../../services/PaymentManagement";
import LoadingSpinner from "../common/LoadingSpinner";

const formatAmount = (amount, currency = "XAF") =>
  `${Number(amount || 0).toLocaleString()} ${currency}`;

const RECORD_FILTERS = [
  { key: "all", label: "All payments" },
  { key: "school_fee", label: "School fees" },
  { key: "library_fee", label: "Library fees" },
];

const StatTile = ({ label, value, hint, accent = "text-gray-100" }) => (
  <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

const FinanceRecordsPanel = () => {
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (paymentType = filter) => {
    setLoading(true);
    setError("");
    try {
      const [statsData, recordsData] = await Promise.all([
        getFinancePaymentStats(),
        getAllPaymentRecords({ paymentType }),
      ]);
      setStats(statsData);
      setRecords(recordsData);
    } catch (err) {
      setError(err?.message || "Failed to load payment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filteredTotal = useMemo(
    () => records.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [records]
  );

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {stats && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Total collected"
              value={formatAmount(stats.totalCollected)}
              hint={`${stats.installmentCount} installments recorded`}
              accent="text-green-300"
            />
            <StatTile
              label="Collected this month"
              value={formatAmount(stats.collectedThisMonth)}
              hint="All payment types"
              accent="text-indigo-300"
            />
            <StatTile
              label="Outstanding"
              value={formatAmount(stats.totalOutstanding)}
              hint={`${formatAmount(stats.schoolOutstanding)} school · ${formatAmount(stats.libraryOutstanding)} library`}
              accent="text-amber-300"
            />
            <StatTile
              label="Fully paid accounts"
              value={`${stats.studentsFullyPaid + stats.libraryFullyPaid}`}
              hint={`${stats.studentsFullyPaid} students · ${stats.libraryFullyPaid} library users`}
              accent="text-emerald-300"
            />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5">
              <h3 className="text-sm font-semibold text-gray-100">School fees</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Fee amount</dt>
                  <dd className="font-medium text-gray-100">{formatAmount(stats.schoolFee)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Students</dt>
                  <dd className="font-medium text-gray-100">{stats.studentCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Collected</dt>
                  <dd className="font-medium text-green-300">
                    {formatAmount(stats.schoolCollected)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Outstanding</dt>
                  <dd className="font-medium text-amber-300">
                    {formatAmount(stats.schoolOutstanding)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Installments</dt>
                  <dd className="font-medium text-gray-100">{stats.schoolInstallmentCount}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5">
              <h3 className="text-sm font-semibold text-gray-100">Library fees</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Fee amount</dt>
                  <dd className="font-medium text-gray-100">{formatAmount(stats.libraryFee)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Library users</dt>
                  <dd className="font-medium text-gray-100">{stats.libraryUserCount}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Collected</dt>
                  <dd className="font-medium text-green-300">
                    {formatAmount(stats.libraryCollected)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Outstanding</dt>
                  <dd className="font-medium text-amber-300">
                    {formatAmount(stats.libraryOutstanding)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-400">Installments</dt>
                  <dd className="font-medium text-gray-100">{stats.libraryInstallmentCount}</dd>
                </div>
              </dl>
            </div>
          </section>
        </>
      )}

      <section className="rounded-xl border border-gray-700 bg-gray-800/40 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-100">Payment records</h3>
            <p className="mt-1 text-sm text-gray-400">
              {records.length} record{records.length === 1 ? "" : "s"}
              {filter !== "all" ? ` · ${formatAmount(filteredTotal)} shown` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RECORD_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === item.key
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : records.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">No payment records yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-900/60 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {records.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-300">
                      {new Date(payment.operation_date).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-gray-100">
                      <div className="font-medium">{payment.userName}</div>
                      {payment.userEmail && (
                        <div className="text-xs text-gray-500">{payment.userEmail}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 capitalize text-gray-300">
                      {payment.userRole?.replace("_", " ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {payment.installment_number || "—"}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-100">
                      {formatAmount(payment.amount, payment.currency)}
                    </td>
                    <td className="px-3 py-2 capitalize text-gray-300">
                      {payment.payment_method?.replace("_", " ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-400">{payment.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default FinanceRecordsPanel;
