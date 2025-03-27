import { motion } from "framer-motion";
import { X } from "lucide-react";

const UserViewModal = ({ user, onClose }) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md relative"
      >
        <button
          className="absolute top-4 right-4 text-red-500 hover:text-red-700"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-6">User Details</h2>

        <div className="space-y-4">
          {/* Profile Image */}
          <div className="flex justify-center mb-6">
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
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Activity</h3>
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">
                Member since: {new Date(user.createdAt).toLocaleDateString()}
              </p>
              {user.role === "teacher" && (
                <div>
                  <label className="text-gray-400 text-sm block">Courses</label>
                  <p className="text-white">
                    {user.courses?.length || 0} active courses
                  </p>
                </div>
              )}
              {user.role === "student" && (
                <div>
                  <label className="text-gray-400 text-sm block">
                    Enrolled In
                  </label>
                  <p className="text-white">
                    {user.enrollments?.length || 0} courses
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserViewModal;
