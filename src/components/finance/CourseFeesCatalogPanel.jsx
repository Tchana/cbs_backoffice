import { useCallback, useEffect, useState } from "react";
import { useApiLoader } from "../../contexts/ApiLoaderContext";
import {
  DeleteCourseFee,
  GetCourseFeesCatalog,
  UpsertCourseFee,
} from "../../services/CourseFeeManagement";

const formatMoney = (v, currency = "XAF") =>
  `${Number(v || 0).toLocaleString()} ${currency}`;

const CourseFeesCatalogPanel = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ amount: "", notes: "" });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const data = await runWithLoader(() => GetCourseFeesCatalog());
    setRows(data || []);
  }, [runWithLoader]);

  useEffect(() => {
    load().catch((e) => console.error(e));
  }, [load]);

  const startEdit = (row) => {
    setEditingId(row.course_id);
    setForm({
      amount: row.fee_amount ? String(row.fee_amount) : "",
      notes: row.notes || "",
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ amount: "", notes: "" });
    setError("");
  };

  const handleSave = async (courseId) => {
    setError("");
    try {
      await runWithLoader(() =>
        UpsertCourseFee({
          courseId,
          amount: form.amount,
          notes: form.notes,
        })
      );
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message || "Failed to save course fee.");
    }
  };

  const handleDelete = async (courseId) => {
    if (!window.confirm("Remove the fee for this course?")) return;
    setError("");
    try {
      await runWithLoader(() => DeleteCourseFee(courseId));
      await load();
    } catch (err) {
      setError(err.message || "Failed to remove course fee.");
    }
  };

  const withFee = rows.filter((r) => r.fee_id).length;
  const withoutFee = rows.length - withFee;

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/80 p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Course fees catalog</h2>
        <p className="text-sm text-gray-400 mt-1">
          Set the fee for each course here. When recording a student&apos;s course fee in
          Course payments, this amount is suggested (you can still override per student).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Courses with a fee" value={withFee} />
        <Stat label="Courses without a fee" value={withoutFee} />
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
              <th className="px-4 py-3 text-left">Course</th>
              <th className="px-4 py-3 text-left">Level</th>
              <th className="px-4 py-3 text-right">Fee</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {rows.map((row) => (
              <tr key={row.course_id} className="hover:bg-gray-900/40">
                <td className="px-4 py-3 text-white">{row.course_title}</td>
                <td className="px-4 py-3 text-gray-300">{row.level ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {editingId === row.course_id ? (
                    <input
                      type="number"
                      min="1"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-28 rounded-md bg-gray-700 px-2 py-1 text-white text-right"
                      placeholder="Amount"
                    />
                  ) : row.fee_amount ? (
                    <span className="text-emerald-300">
                      {formatMoney(row.fee_amount, row.currency)}
                    </span>
                  ) : (
                    <span className="text-gray-500">Not set</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {editingId === row.course_id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSave(row.course_id)}
                        className="rounded-md bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-600"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-md bg-gray-700 px-2 py-1 text-xs text-gray-200 hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-500"
                      >
                        {row.fee_id ? "Edit" : "Add fee"}
                      </button>
                      {row.fee_id && (
                        <button
                          type="button"
                          onClick={() => handleDelete(row.course_id)}
                          className="rounded-md bg-red-900/60 px-2 py-1 text-xs text-red-200 hover:bg-red-800/60"
                        >
                          Remove
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                  No courses found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const Stat = ({ label, value }) => (
  <div className="rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="mt-1 text-lg font-semibold text-white">{value}</p>
  </div>
);

export default CourseFeesCatalogPanel;
