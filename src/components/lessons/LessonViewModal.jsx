import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect } from "react";

const DetailField = ({ label, value, className = "" }) => (
  <div className={className}>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-medium text-gray-100 break-words whitespace-pre-wrap">
      {(value ?? "").trim() || "—"}
    </p>
  </div>
);

const SectionCard = ({ title, description, children }) => (
  <section className="rounded-xl border border-gray-700/80 bg-gray-900/40 p-5">
    <div className="mb-4">
      <h3 className="text-base font-semibold text-gray-100">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-gray-400">{description}</p>
      ) : null}
    </div>
    {children}
  </section>
);

const LessonViewModal = ({ lesson, onClose }) => {
  if (!lesson) return null;

  const fileUrl = lesson.file || lesson.file_url;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleFileOpen = () => {
    if (fileUrl) window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 md:p-8">
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
          aria-labelledby="lesson-details-title"
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative flex w-full max-w-4xl max-h-[min(90vh,880px)] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-gray-700 bg-gray-800/95 px-6 py-5 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-indigo-500/50 bg-indigo-900/40 text-indigo-300">
                <BookOpen size={28} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                  Lesson details
                </p>
                <h2
                  id="lesson-details-title"
                  className="mt-1 text-xl font-semibold text-white sm:text-2xl break-words"
                >
                  {lesson.title || "Untitled lesson"}
                </h2>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
                  <BookOpen size={14} className="shrink-0" />
                  <span className="truncate">{lesson.courseTitle || "—"}</span>
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

          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 sm:py-7">
            <div className="space-y-6">
              <SectionCard title="Overview" description="Lesson identification">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailField label="Title" value={lesson.title} className="sm:col-span-2" />
                  <DetailField label="Course" value={lesson.courseTitle} className="sm:col-span-2" />
                </div>
              </SectionCard>

              <SectionCard title="Description" description="Full lesson summary">
                <DetailField label="Description" value={lesson.description} />
              </SectionCard>

              <SectionCard title="Materials" description="Attached lesson file">
                {fileUrl ? (
                  <div className="flex items-start gap-3 rounded-lg border border-gray-700/80 bg-gray-800/60 p-4">
                    <div className="rounded-lg bg-indigo-900/50 p-2 text-indigo-300">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-100">PDF lesson file</p>
                      <p className="mt-1 break-all text-sm text-gray-400">{fileUrl}</p>
                      <button
                        type="button"
                        onClick={handleFileOpen}
                        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                      >
                        Open file
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No file attached to this lesson.</p>
                )}
              </SectionCard>
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-700 bg-gray-800/95 px-6 py-4 sm:px-8">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-100 transition-colors hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default LessonViewModal;
