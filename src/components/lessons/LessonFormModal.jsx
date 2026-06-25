import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect } from "react";

const inputClass =
  "w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const LessonFormModal = ({
  onClose,
  onSubmit,
  formValues,
  handleInputChange,
  allCourses = [],
  title = "Create lesson",
  submitLabel = "Create lesson",
  isEdit = false,
  isSubmitting = false,
}) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const existingFileUrl =
    typeof formValues.file === "string" && formValues.file
      ? formValues.file
      : formValues.fileUrl || null;
  const pickedFileName =
    formValues.file instanceof File ? formValues.file.name : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-form-title"
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative flex w-full max-w-2xl max-h-[min(90vh,720px)] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-gray-700 px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-500/50 bg-indigo-900/40 text-indigo-300">
                <BookOpen size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="lesson-form-title"
                  className="text-xl font-semibold text-white"
                >
                  {title}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  {isEdit
                    ? "Update lesson details and optionally replace the PDF."
                    : "Add a new lesson to a course."}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Course
                </label>
                {isEdit ? (
                  <div className="rounded-lg border border-gray-600 bg-gray-900/50 px-4 py-3 text-sm text-gray-200">
                    {formValues.courseTitle || "—"}
                  </div>
                ) : (
                  <select
                    className={inputClass}
                    value={formValues.course ?? ""}
                    onChange={(e) => handleInputChange(e, "course")}
                    required
                  >
                    <option value="">Select a course</option>
                    {allCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Lesson title"
                  value={formValues.title ?? ""}
                  onChange={(e) => handleInputChange(e, "title")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  className={`${inputClass} min-h-[120px] resize-y`}
                  placeholder="Lesson description"
                  value={formValues.description ?? ""}
                  onChange={(e) => handleInputChange(e, "description")}
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lesson PDF{isEdit ? " (optional)" : ""}
                </label>
                {isEdit && existingFileUrl && !pickedFileName ? (
                  <div className="mb-3 flex items-start gap-3 rounded-lg border border-gray-700/80 bg-gray-900/40 p-3">
                    <FileText size={18} className="mt-0.5 shrink-0 text-indigo-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-300">Current file attached</p>
                      <button
                        type="button"
                        onClick={() =>
                          window.open(existingFileUrl, "_blank", "noopener,noreferrer")
                        }
                        className="mt-1 text-sm text-indigo-400 hover:text-indigo-300 underline truncate block max-w-full text-left"
                      >
                        Open current PDF
                      </button>
                    </div>
                  </div>
                ) : null}
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
                  onChange={(e) => handleInputChange(e, "file")}
                />
                {pickedFileName ? (
                  <p className="mt-2 text-sm text-gray-400">
                    Selected: {pickedFileName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-700 px-6 py-4">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : submitLabel}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default LessonFormModal;
