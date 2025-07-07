import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

const BlogRegistrationModal = ({
  onClose,
  onRegister,
  editValues,
  handleInputChange,
}) => {
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
          className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl relative z-[10000] max-h-[90vh] overflow-y-auto"
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

          <h2 className="text-2xl font-bold text-white mb-6">
            {editValues.title ? "Edit Blog Post" : "Add New Blog Post"}
          </h2>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Blog Title
              </label>
              <input
                type="text"
                value={editValues.title || ""}
                onChange={(e) => handleInputChange(e, "title")}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter blog title"
              />
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
                Blog Content
              </label>
              <textarea
                value={editValues.content || ""}
                onChange={(e) => handleInputChange(e, "content")}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] resize-y"
                placeholder="Write your blog content here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Blog Image
              </label>
              <input
                type="file"
                onChange={(e) => handleInputChange(e, "image")}
                accept="image/*"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              {editValues.title ? "Update Blog Post" : "Add Blog Post"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default BlogRegistrationModal; 