import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {
  CreateManualSubscription,
  GetUserSubscriptionHistory,
  GetUserSubscriptionStatus,
} from "../../services/UsersManagement";
import { useApiLoader } from "../../contexts/ApiLoaderContext";

const UserViewModal = ({ user, onClose }) => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [manualPlanCode, setManualPlanCode] = useState("student_trimester");
  const [manualReason, setManualReason] = useState("");
  if (!user) return null;
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const [status, rows] = await Promise.all([
        runWithLoader(() => GetUserSubscriptionStatus(user.id)),
        runWithLoader(() => GetUserSubscriptionHistory(user.id)),
      ]);
      setSubscriptionStatus(status);
      setHistory(rows || []);
    };
    load().catch(() => {});
  }, [user.id]);

  const handleManualGrant = async () => {
    await runWithLoader(() =>
      CreateManualSubscription({
        userId: user.id,
        planCode: manualPlanCode,
        reason: manualReason,
      })
    );
    const [status, rows] = await Promise.all([
      runWithLoader(() => GetUserSubscriptionStatus(user.id)),
      runWithLoader(() => GetUserSubscriptionHistory(user.id)),
    ]);
    setSubscriptionStatus(status);
    setHistory(rows || []);
    setManualReason("");
  };

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
            User Details
          </h2>

          <div className="space-y-6">
            {/* Profile Image */}
            <div className="flex justify-center">
              {user.pImage ? (
                <img
                  src={user.pImage}
                  alt={`${user.firstName}'s profile`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-2 border-indigo-500 bg-indigo-600 flex items-center justify-center text-white text-2xl font-semibold">
                  {initials}
                </div>
              )}
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
                <label className="text-gray-400 text-sm">Subscription</label>
                <p className="text-white font-medium">
                  {user.subscriptionType || "none"}
                </p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">School Max Level</label>
                <p className="text-white font-medium">
                  {user.schoolMaxLevel ?? 0}
                </p>
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
                  Member since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                </p>
                {user.role === "teacher" && (
                  <div>
                    <label className="text-gray-400 text-sm block">
                      Courses
                    </label>
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

            <div className="pt-6 border-t border-gray-700">
              <h3 className="text-lg font-medium text-white mb-3">Subscription</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  Status: <span className="text-white">{subscriptionStatus?.subscription_status || "none"}</span>
                </p>
                <p className="text-gray-300">
                  Plan: <span className="text-white">{subscriptionStatus?.plan_name || "-"}</span>
                </p>
                <p className="text-gray-300">
                  Ends:{" "}
                  <span className="text-white">
                    {subscriptionStatus?.ends_at
                      ? new Date(subscriptionStatus.ends_at).toLocaleString()
                      : "-"}
                  </span>
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <select
                  value={manualPlanCode}
                  onChange={(e) => setManualPlanCode(e.target.value)}
                  className="bg-gray-700 text-white rounded-md px-3 py-2"
                >
                  <option value="student_trimester">Student trimester</option>
                  <option value="library_trimester">Library trimester</option>
                </select>
                <input
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Manual reason (optional)"
                  className="bg-gray-700 text-white rounded-md px-3 py-2"
                />
                <button
                  onClick={handleManualGrant}
                  className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Grant / Extend Trimester
                </button>
              </div>
              <div className="mt-3 max-h-40 overflow-auto space-y-2">
                {history.map((row) => (
                  <div key={row.id} className="bg-gray-700 rounded-md p-2">
                    <p className="text-white text-xs">
                      {row.plan?.name || row.plan?.code || "Plan"} · {row.status}
                    </p>
                    <p className="text-gray-300 text-xs">
                      {row.starts_at ? new Date(row.starts_at).toLocaleDateString() : "-"} -{" "}
                      {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : "-"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default UserViewModal;
