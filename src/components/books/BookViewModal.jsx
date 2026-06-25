import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, FileText, Globe, Lock, Tag, User, X } from "lucide-react";
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

const SectionCard = ({ title, children }) => (
  <section className="rounded-xl border border-gray-700/80 bg-gray-900/40 p-5">
    <h3 className="mb-4 text-base font-semibold text-gray-100">{title}</h3>
    {children}
  </section>
);

const accessLabel = (tier) => {
  if (tier === "subscriber") return "Subscriber only";
  return "Public";
};

const BookViewModal = ({ book, onClose, onEdit, canEdit = false }) => {
  if (!book) return null;

  const coverUrl = book.bookCover?.trim() || null;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const openFile = () => {
    if (book.book) window.open(book.book, "_blank", "noopener,noreferrer");
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
          aria-labelledby="book-details-title"
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative flex w-full max-w-4xl max-h-[min(90vh,880px)] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-gray-700 bg-gray-800/95 px-6 py-5 sm:px-8">
            <div className="flex items-start gap-5">
              <div className="w-[88px] shrink-0 sm:w-[104px]">
                <div className="aspect-[5/7] overflow-hidden rounded-lg border border-gray-600 bg-gray-900 shadow-lg">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-amber-500/70">
                      <BookOpen size={32} />
                    </div>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
                  Book details
                </p>
                <h2
                  id="book-details-title"
                  className="mt-1 text-xl font-semibold text-white sm:text-2xl break-words"
                >
                  {book.title || "Untitled book"}
                </h2>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-400">
                  <User size={14} className="shrink-0" />
                  {book.author?.trim() || "Unknown author"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {book.category ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-600 bg-gray-900 px-2.5 py-0.5 text-xs font-medium text-gray-200">
                      <Tag size={12} />
                      {book.category}
                    </span>
                  ) : null}
                  {book.language ? (
                    <span className="rounded-full border border-gray-600 bg-gray-900 px-2.5 py-0.5 text-xs font-medium text-gray-200">
                      {book.language}
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      book.accessTier === "subscriber"
                        ? "border-amber-800/80 bg-amber-900/30 text-amber-300"
                        : "border-emerald-800/80 bg-emerald-900/30 text-emerald-300"
                    }`}
                  >
                    {book.accessTier === "subscriber" ? (
                      <Lock size={12} />
                    ) : (
                      <Globe size={12} />
                    )}
                    {accessLabel(book.accessTier)}
                  </span>
                </div>
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
              <SectionCard title="Description">
                <DetailField label="Summary" value={book.description} />
              </SectionCard>

              <SectionCard title="File">
                {book.book ? (
                  <div className="flex items-start gap-3 rounded-lg border border-gray-700/80 bg-gray-800/60 p-4">
                    <div className="rounded-lg bg-indigo-900/50 p-2 text-indigo-300">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-100">Book document</p>
                      <button
                        type="button"
                        onClick={openFile}
                        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                      >
                        Open book file
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No file attached.</p>
                )}
              </SectionCard>
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-700 bg-gray-800/95 px-6 py-4 sm:px-8">
            <div className="flex justify-end gap-3">
              {canEdit && onEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(book);
                  }}
                  className="rounded-lg border border-indigo-600 bg-indigo-600/20 px-4 py-2.5 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-600/30"
                >
                  Edit book
                </button>
              ) : null}
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

export default BookViewModal;
