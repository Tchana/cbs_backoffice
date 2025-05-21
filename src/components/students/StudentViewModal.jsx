import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect } from "react";

const StudentViewModal = ({ user, onClose }) => {
  if (!user) return null;

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl"
        >
          {/* Fixed Close Button */}
          <div className="absolute -top-3 -right-3 z-10">
            <button
              className="text-red-500 hover:text-red-700 p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors duration-200 shadow-lg"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          <h2 className="text-xl font-semibold text-white mb-6">
            Student Details
          </h2>

          <div className="space-y-6">
            {/* Profile Image */}
            <div className="flex justify-center">
              <img
                src={user.p_image || "/default-user.png"}
                alt={`${user.firstName}'s profile`}
                className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500"
              />
            </div>

            {/* User Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm">First Name</label>
                <p className="text-white font-medium">{user.firstName}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Last Name</label>
                <p className="text-white font-medium">{user.lastName}</p>
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Email</label>
                <p className="text-white font-medium">{user.email}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Role</label>
                <p className="text-white font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Status</label>
                <p className="text-green-400 font-medium">Active</p>
              </div>
            </div>

            {/* Additional Information */}
            <div className="pt-6 border-t border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Activity</h3>
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">
                  Member since: {new Date(user.createdAt).toLocaleDateString()}
                </p>
                <div>
                  <label className="text-gray-400 text-sm block">
                    Enrolled In
                  </label>
                  <p className="text-white">
                    {user.enrollments?.length || 0} courses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default StudentViewModal;
