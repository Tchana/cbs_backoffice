import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, User, Edit, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

const BlogViewModal = ({ blog, onClose, onEdit, onDelete }) => {
  if (!blog) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl relative z-[10000] max-h-[90vh] overflow-y-auto"
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

          {/* Blog Header */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-4">{blog.title}</h2>
            
            {/* Meta Information */}
            <div className="flex items-center space-x-6 text-gray-400 mb-4">
              <div className="flex items-center space-x-2">
                <User size={16} />
                <span>{blog.author}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>{formatDate(blog.created_at)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(blog)}
                className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => onDelete(blog.id)}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Blog Image */}
          {blog.image && (
            <div className="mb-6">
              <img
                src={blog.image}
                alt={blog.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Blog Content */}
          <div className="prose prose-invert max-w-none">
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {blog.content}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default BlogViewModal; 