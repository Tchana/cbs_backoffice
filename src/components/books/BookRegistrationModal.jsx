import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

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
  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="bg-gray-800 rounded-xl p-6 w-full max-w-md relative z-[10000]"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
          >
            <X size={24} />
          </button>

          <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={editValues.title || ""}
                onChange={(e) => handleInputChange(e, "title")}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter book title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <select
                value={editValues.category || ""}
                onChange={(e) => handleInputChange(e, "category")}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Author
              </label>
              <input
                type="text"
                value={editValues.author || ""}
                onChange={(e) => handleInputChange(e, "author")}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter author name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Language
              </label>
              <select
                value={editValues.language || ""}
                onChange={(e) => handleInputChange(e, "language")}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select language</option>
                <option value="Français">Français</option>
                <option value="Anglais">Anglais</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={editValues.description ?? ""}
                onChange={(e) => handleInputChange(e, "description")}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Access Tier
              </label>
              <select
                value={editValues.accessTier || "public"}
                onChange={(e) => handleInputChange(e, "accessTier")}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="public">public (everyone)</option>
                <option value="subscriber">subscriber only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Book Cover {!isEdit && <span className="text-red-400">*</span>}
              </label>
              <input
                type="file"
                onChange={(e) => handleInputChange(e, "bookCover")}
                accept="image/*"
                required={!isEdit}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {coverSelected && (
                <p className="mt-1 text-xs text-emerald-400">
                  Selected: {editValues.bookCover.name}
                </p>
              )}
              {!isEdit && !coverSelected && (
                <p className="mt-1 text-xs text-gray-500">Required when creating a book.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Book File {!isEdit && <span className="text-red-400">*</span>}
              </label>
              <input
                type="file"
                onChange={(e) => handleInputChange(e, "book")}
                accept=".pdf,.doc,.docx"
                required={!isEdit}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {bookSelected && (
                <p className="mt-1 text-xs text-emerald-400">
                  Selected: {editValues.book.name}
                </p>
              )}
              {!isEdit && !bookSelected && (
                <p className="mt-1 text-xs text-gray-500">Required when creating a book.</p>
              )}
            </div>

            {formError && (
              <p className="rounded-lg border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
                {formError}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={onRegister}
              disabled={!isEdit && !canSubmitCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default BookRegistrationModal;
