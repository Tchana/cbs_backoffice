import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

const COVER_ASPECT = "aspect-[5/7]";

const BookRegistrationModal = ({
  onClose,
  onRegister,
  editValues,
  handleInputChange,
  categoryOptions = [],
  categoryLoadError = "",
  title = "Add New Book",
  submitLabel = "Add Book",
  isEdit = false,
  formError = "",
}) => {
  const coverSelected = editValues.bookCover instanceof File;
  const bookSelected = editValues.book instanceof File;
  const canSubmitCreate = coverSelected && bookSelected;

  const [coverPreview, setCoverPreview] = useState(null);

  const existingCoverUrl = editValues.bookCoverUrl || null;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    if (editValues.bookCover instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result);
      reader.readAsDataURL(editValues.bookCover);
    } else if (existingCoverUrl) {
      setCoverPreview(existingCoverUrl);
    } else {
      setCoverPreview(null);
    }
  }, [editValues.bookCover, existingCoverUrl]);

  const displayCover = useMemo(() => coverPreview, [coverPreview]);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          aria-hidden
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          className="relative z-[100000] flex w-full max-w-lg max-h-[min(90vh,800px)] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl"
          initial={{ scale: 0.97, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 12 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="space-y-4">
              {/* Cover preview — portrait 5:7 */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-300">Cover preview</p>
                <div className="mx-auto w-[120px] sm:w-[140px]">
                  <div
                    className={`${COVER_ASPECT} overflow-hidden rounded-lg border border-gray-600 bg-gray-900 shadow-lg`}
                  >
                    {displayCover ? (
                      <img
                        src={displayCover}
                        alt="Cover preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-amber-500/50">
                        <BookOpen size={28} />
                        <span className="text-[10px] text-gray-500">5:7 ratio</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-center text-xs text-gray-500">
                  Recommended portrait cover — same proportions as the mobile library.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  value={editValues.title || ""}
                  onChange={(e) => handleInputChange(e, "title")}
                  className="w-full rounded-lg bg-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                  placeholder="Enter book title"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Category
                </label>
                <select
                  value={editValues.category || ""}
                  onChange={(e) => handleInputChange(e, "category")}
                  className="w-full rounded-lg bg-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                >
                  <option value="">Select a category</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {categoryLoadError && (
                  <p className="mt-1 text-xs text-red-400">{categoryLoadError}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Author
                </label>
                <input
                  type="text"
                  value={editValues.author || ""}
                  onChange={(e) => handleInputChange(e, "author")}
                  className="w-full rounded-lg bg-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                  placeholder="Enter author name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Language
                </label>
                <select
                  value={editValues.language || ""}
                  onChange={(e) => handleInputChange(e, "language")}
                  className="w-full rounded-lg bg-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                >
                  <option value="">Select language</option>
                  <option value="Français">Français</option>
                  <option value="Anglais">Anglais</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  value={editValues.description ?? ""}
                  onChange={(e) => handleInputChange(e, "description")}
                  className="min-h-[88px] w-full resize-y rounded-lg bg-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Access tier
                </label>
                <select
                  value={editValues.accessTier || "public"}
                  onChange={(e) => handleInputChange(e, "accessTier")}
                  className="w-full rounded-lg bg-gray-700 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                >
                  <option value="public">Public (everyone)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Book cover {!isEdit && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="file"
                  onChange={(e) => handleInputChange(e, "bookCover")}
                  accept="image/*"
                  className="w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-amber-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-amber-500"
                />
                {coverSelected && (
                  <p className="mt-1 text-xs text-emerald-400">
                    Selected: {editValues.bookCover.name}
                  </p>
                )}
                {!isEdit && !coverSelected && (
                  <p className="mt-1 text-xs text-gray-500">
                    Portrait image recommended (e.g. 500×700 px).
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">
                  Book file {!isEdit && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="file"
                  onChange={(e) => handleInputChange(e, "book")}
                  accept=".pdf,.doc,.docx"
                  className="w-full text-sm text-gray-300 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
                />
                {bookSelected && (
                  <p className="mt-1 text-xs text-emerald-400">
                    Selected: {editValues.book.name}
                  </p>
                )}
              </div>

              {formError && (
                <p className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
                  {formError}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-700 px-6 py-4">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2.5 text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onRegister}
                disabled={!isEdit && !canSubmitCreate}
                className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default BookRegistrationModal;
