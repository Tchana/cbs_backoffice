import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, CheckCircle2, Circle } from "lucide-react";
import { useApiLoader } from "../../contexts/ApiLoaderContext";
import { CreateAssignment } from "../../services/AssignmentManagement";

const _makeEmptyMCQQuestion = () => ({
  id: crypto.randomUUID(),
  type: "mcq_single",
  prompt: "",
  points: 1,
  mcqOptions: [{ id: crypto.randomUUID(), optionText: "" }],
  correctOptionIndex: 0,
});

const _makeEmptyOpenPdfQuestion = () => ({
  id: crypto.randomUUID(),
  type: "open_pdf",
  prompt: "",
  points: 1,
});

const AssignmentCreateModal = ({
  course,
  lessons = [],
  onClose,
  onCreated,
}) => {
  const runWithLoader = useApiLoader().runWithLoader;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [lessonId, setLessonId] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [assignmentPdfFile, setAssignmentPdfFile] = useState(null);

  const [questions, setQuestions] = useState([_makeEmptyMCQQuestion()]);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length > 0 &&
      questions.length > 0 &&
      questions.every((q) => q.prompt.trim().length > 0) &&
      questions.filter((q) => q.type === "mcq_single").every((q) => {
        const opts = q.mcqOptions || [];
        return (
          opts.length > 0 &&
          opts.every((o) => (o.optionText || "").trim().length > 0)
        );
      })
    );
  }, [title, questions]);

  useEffect(() => {
    // Reset when course changes
    setTitle("");
    setDescription("");
    setPublished(false);
    setLessonId(null);
    setDueDate("");
    setAssignmentPdfFile(null);
    setQuestions([_makeEmptyMCQQuestion()]);
  }, [course?.id]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!canSubmit) {
      setError("Please complete all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        courseId: course.id,
        lessonId,
        title: title.trim(),
        description: description.trim() || null,
        published,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assignmentPdfFile,
        questions: questions.map((q, idx) => {
          if (q.type === "mcq_single") {
            return {
              type: "mcq_single",
              prompt: q.prompt.trim(),
              points: Number(q.points || 1),
              mcqOptions: (q.mcqOptions || []).map((o) => ({
                optionText: o.optionText,
              })),
              correctOptionIndex: Number(q.correctOptionIndex || 0),
            };
          }

          return {
            type: "open_pdf",
            prompt: q.prompt.trim(),
            points: Number(q.points || 1),
          };
        }),
      };

      await runWithLoader(() => CreateAssignment(payload));
      onCreated?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || "Failed to create assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePublished = () => setPublished((p) => !p);

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
          className="relative bg-gray-800 rounded-lg p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Create Assignment
            </h2>
            <button
              className="text-red-400 hover:text-red-200"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="text-red-400">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title
                </label>
                <input
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Attach to Lesson (optional)
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  value={lessonId || ""}
                  onChange={(e) => setLessonId(e.target.value || null)}
                >
                  <option value="">Course-level</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Due date (optional)
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={togglePublished}
                  id="published"
                />
                <label htmlFor="published" className="text-gray-200">
                  Published (visible to students)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Optional prompt PDF (used by open_pdf questions)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setAssignmentPdfFile(e.target.files[0])}
                  className="w-full text-gray-300"
                />
                <div className="text-gray-400 text-sm">
                  {assignmentPdfFile ? assignmentPdfFile.name : "No file"}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                  Questions
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                    onClick={() =>
                      setQuestions((qs) => [...qs, _makeEmptyMCQQuestion()])
                    }
                  >
                    <Plus size={16} />
                    MCQ
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                    onClick={() =>
                      setQuestions((qs) => [...qs, _makeEmptyOpenPdfQuestion()])
                    }
                  >
                    <Plus size={16} />
                    Open PDF
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className="bg-gray-700 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-white font-medium">
                        Question {qIdx + 1} —{" "}
                        {q.type === "mcq_single" ? "MCQ (single)" : "Open PDF"}
                      </div>
                      <button
                        type="button"
                        className="text-red-400 hover:text-red-200"
                        onClick={() =>
                          setQuestions((qs) => qs.filter((qq) => qq.id !== q.id))
                        }
                        disabled={questions.length === 1}
                        title={
                          questions.length === 1
                            ? "At least one question required"
                            : "Remove question"
                        }
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Prompt
                      </label>
                      <input
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded-md"
                        value={q.prompt}
                        onChange={(e) => {
                          const v = e.target.value;
                          setQuestions((qs) =>
                            qs.map((qq) =>
                              qq.id === q.id ? { ...qq, prompt: v } : qq
                            )
                          );
                        }}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Points
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          className="w-full px-3 py-2 bg-gray-600 text-white rounded-md"
                          value={q.points}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setQuestions((qs) =>
                              qs.map((qq) =>
                                qq.id === q.id ? { ...qq, points: v } : qq
                              )
                            );
                          }}
                        />
                      </div>
                    </div>

                    {q.type === "mcq_single" && (
                      <div className="space-y-2 pt-2 border-t border-gray-600">
                        <div className="flex items-center justify-between">
                          <p className="text-gray-200 font-medium">MCQ options</p>
                          <button
                            type="button"
                            className="flex items-center gap-2 px-2 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                            onClick={() => {
                              setQuestions((qs) =>
                                qs.map((qq) => {
                                  if (qq.id !== q.id) return qq;
                                  return {
                                    ...qq,
                                    mcqOptions: [
                                      ...(qq.mcqOptions || []),
                                      {
                                        id: crypto.randomUUID(),
                                        optionText: "",
                                      },
                                    ],
                                  };
                                })
                              );
                            }}
                          >
                            <Plus size={14} />
                            Add option
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(q.mcqOptions || []).map((o, oIdx) => (
                            <div
                              key={o.id}
                              className="flex items-center gap-3"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setQuestions((qs) =>
                                    qs.map((qq) =>
                                      qq.id === q.id
                                        ? { ...qq, correctOptionIndex: oIdx }
                                        : qq
                                    )
                                  );
                                }}
                                className="text-indigo-200"
                                aria-label="Set correct option"
                              >
                                {q.correctOptionIndex === oIdx ? (
                                  <CheckCircle2 size={18} />
                                ) : (
                                  <Circle size={18} />
                                )}
                              </button>
                              <input
                                className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-md"
                                value={o.optionText}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setQuestions((qs) =>
                                    qs.map((qq) => {
                                      if (qq.id !== q.id) return qq;
                                      return {
                                        ...qq,
                                        mcqOptions: qq.mcqOptions.map((oo) =>
                                          oo.id === o.id
                                            ? { ...oo, optionText: v }
                                            : oo
                                        ),
                                      };
                                    })
                                  );
                                }}
                                required
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Assignment"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AssignmentCreateModal;

