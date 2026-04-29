import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Save } from "lucide-react";
import { useApiLoader } from "../../contexts/ApiLoaderContext";
import {
  GetAssignmentSubmissionsForGrading,
  UpdateOpenPdfGrading,
} from "../../services/AssignmentManagement";

const _safeNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const AssignmentGradeModal = ({ assignment, onClose, onSaved }) => {
  const runWithLoader = useApiLoader().runWithLoader;

  const assignmentId = assignment?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  // Map<answerId, { teacherPoints, teacherFeedback }>
  const [openPdfEdits, setOpenPdfEdits] = useState({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!assignmentId) return;
      setLoading(true);
      setError("");
      try {
        const res = await runWithLoader(() =>
          GetAssignmentSubmissionsForGrading(assignmentId)
        );

        if (!mounted) return;
        setData(res);

        // Initialize edits from existing answers.
        const openPdfIds = new Set(
          (res.questions || [])
            .filter((q) => q.type === "open_pdf")
            .map((q) => q.id)
        );
        const init = {};
        for (const sub of res.submissions || []) {
          for (const a of sub.answers || []) {
            if (a && openPdfIds.has(a.question_id)) {
              init[a.id] = {
                teacherPoints: a.teacher_points ?? "",
                teacherFeedback: a.teacher_feedback ?? "",
              };
            }
          }
        }
        setOpenPdfEdits(init);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load submissions.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [assignmentId]);

  const openPdfQuestionIds = useMemo(() => {
    const qs = data?.questions || [];
    return new Set(qs.filter((q) => q.type === "open_pdf").map((q) => q.id));
  }, [data]);

  const handleSave = async () => {
    setError("");
    try {
      const updates = [];
      for (const [answerId, v] of Object.entries(openPdfEdits)) {
        updates.push({
          answerId,
          teacherPoints: _safeNumber(v.teacherPoints),
          teacherFeedback: (v.teacherFeedback ?? "").toString(),
        });
      }

      await runWithLoader(() => UpdateOpenPdfGrading(updates));
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(e?.message || "Failed to save grading.");
    }
  };

  const submissions = data?.submissions || [];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center">
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="relative bg-gray-800 rounded-lg p-6 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Grade submissions
            </h2>
            <button
              className="text-red-400 hover:text-red-200"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          {error && <p className="text-red-400 mb-3">{error}</p>}

          {loading ? (
            <p className="text-gray-300">Loading...</p>
          ) : submissions.length === 0 ? (
            <p className="text-gray-300">No submissions yet.</p>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-gray-700 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">
                        {sub.student
                          ? `${sub.student.first_name || ""} ${sub.student.last_name || ""}`.trim() ||
                            "Student"
                          : "Student"}
                      </p>
                      <p className="text-gray-300 text-sm">
                        Submitted:{" "}
                        {sub.submitted_at
                          ? new Date(sub.submitted_at).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-200 text-sm">
                        MCQ total: {sub.mcq_score_total ?? 0}
                      </p>
                      <p className="text-indigo-200 text-sm">
                        Final total: {sub.final_score_total ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-600">
                    {(sub.answers || [])
                      .filter((a) => openPdfQuestionIds.has(a.question_id))
                      .map((a) => (
                        <div
                          key={a.id}
                          className="mt-3 bg-gray-800 rounded-md p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-white text-sm font-medium">
                              Open PDF answer
                            </p>
                            {a.student_answer_pdf_url ? (
                              <a
                                href={a.student_answer_pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-300 hover:text-indigo-200 text-sm underline"
                              >
                                View PDF
                              </a>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                No PDF
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div>
                              <label className="block text-gray-300 text-sm mb-1">
                                Points
                              </label>
                              <input
                                type="number"
                                step={0.5}
                                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                                value={
                                  openPdfEdits[a.id]?.teacherPoints ?? ""
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setOpenPdfEdits((prev) => ({
                                    ...prev,
                                    [a.id]: {
                                      ...(prev[a.id] || {
                                        teacherPoints: "",
                                        teacherFeedback: "",
                                      }),
                                      teacherPoints: v,
                                    },
                                  }));
                                }}
                              />
                            </div>

                            <div>
                              <label className="block text-gray-300 text-sm mb-1">
                                Feedback
                              </label>
                              <input
                                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                                value={
                                  openPdfEdits[a.id]?.teacherFeedback ?? ""
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setOpenPdfEdits((prev) => ({
                                    ...prev,
                                    [a.id]: {
                                      ...(prev[a.id] || {
                                        teacherPoints: "",
                                        teacherFeedback: "",
                                      }),
                                      teacherFeedback: v,
                                    },
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} />
              Save grading
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AssignmentGradeModal;

