import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { isAdmin } from "../../lib/auth";
import {
  getAccessBlockingMode,
  setUserResourceAccess,
} from "../../services/SettingsManagement";
import { getUserAccessStatus } from "../../services/PaymentManagement";
import UserPaymentsPanel from "./UserPaymentsPanel";

const DetailField = ({ label, value, className = "" }) => (
  <div className={className}>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-medium text-gray-100 break-words">{value ?? "—"}</p>
  </div>
);

const SectionCard = ({ title, children }) => (
  <section className="rounded-xl border border-gray-700/80 bg-gray-900/40 p-5">
    <h3 className="mb-4 text-base font-semibold text-gray-100">{title}</h3>
    {children}
  </section>
);

const ACCESS_BADGE_STYLES = {
  default: "border-gray-600 bg-gray-900 text-gray-300",
  granted: "border-green-700 bg-green-900/40 text-green-300",
  denied: "border-red-700 bg-red-900/40 text-red-300",
};

const EFFECTIVE_STATE_LABELS = {
  allowed: "Allowed",
  allowed_manual: "Allowed (manual grant)",
  allowed_override: "Allowed (admin override)",
  blocked: "Blocked",
  blocked_manual: "Blocked (manual)",
  blocked_fees: "Blocked (fees owed)",
};

const EFFECTIVE_STATE_STYLES = {
  allowed: "border-green-700 bg-green-900/40 text-green-300",
  allowed_manual: "border-green-700 bg-green-900/40 text-green-300",
  allowed_override: "border-blue-700 bg-blue-900/40 text-blue-300",
  blocked: "border-red-700 bg-red-900/40 text-red-300",
  blocked_manual: "border-red-700 bg-red-900/40 text-red-300",
  blocked_fees: "border-amber-700 bg-amber-900/40 text-amber-300",
};

const getAccessOptions = (blockingMode, role) => {
  const isLibraryUser = role === "library_user";

  if (blockingMode === "manual") {
    return [
      {
        value: "default",
        label: "Default",
        description: isLibraryUser
          ? "Library access allowed. Use Denied to block this account manually."
          : "Course and library access allowed. Use Denied to block this account manually.",
      },
      {
        value: "granted",
        label: "Granted",
        description: "Explicitly allow access (same as default in manual mode).",
      },
      {
        value: "denied",
        label: "Denied",
        description: isLibraryUser
          ? "Manually block library access."
          : "Manually block course and library access.",
      },
    ];
  }

  return [
    {
      value: "default",
      label: "Automatic",
      description: isLibraryUser
        ? "Library access follows library fee payment status."
        : "Course access follows school fee payment status. Library access is included with school fees.",
    },
    {
      value: "granted",
      label: "Granted (override)",
      description: "Always allow access even if fees are outstanding. Admin manual override.",
    },
    {
      value: "denied",
      label: "Denied (override)",
      description: "Always block access regardless of payment status.",
    },
  ];
};

const UserViewModal = ({ user, onClose, onAccessUpdated }) => {
  const [resourceAccess, setResourceAccess] = useState(user?.resourceAccess || "default");
  const [blockingMode, setBlockingMode] = useState("manual");
  const [accessStatus, setAccessStatus] = useState(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessError, setAccessError] = useState("");

  const isStudentLike = user?.role === "student" || user?.role === "library_user";
  const showAccessControls = isAdmin() && isStudentLike;
  const accessOptions = useMemo(
    () => getAccessOptions(blockingMode, user?.role),
    [blockingMode, user?.role]
  );

  const refreshAccessStatus = async () => {
    if (!user?.id) return;
    try {
      const status = await getUserAccessStatus(user.id);
      setAccessStatus(status);
    } catch {
      setAccessStatus(null);
    }
  };

  useEffect(() => {
    setResourceAccess(user?.resourceAccess || "default");
  }, [user]);

  useEffect(() => {
    if (!user?.id || !showAccessControls) return;

    getAccessBlockingMode()
      .then((mode) => setBlockingMode(mode))
      .catch(() => setBlockingMode("manual"));

    refreshAccessStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, showAccessControls]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!user) return null;

  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
  const effectiveState = accessStatus?.effective_state;

  const handleAccessChange = async (nextAccess) => {
    if (nextAccess === resourceAccess) return;

    setSavingAccess(true);
    setAccessError("");
    try {
      await setUserResourceAccess(user.id, nextAccess);
      setResourceAccess(nextAccess);
      onAccessUpdated?.({ ...user, resourceAccess: nextAccess });
      await refreshAccessStatus();
    } catch (err) {
      setAccessError(err?.message || "Failed to update access.");
    } finally {
      setSavingAccess(false);
    }
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
          aria-labelledby="user-details-title"
          initial={{ opacity: 0, scale: 0.97, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative flex w-full max-w-3xl max-h-[min(92vh,920px)] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-gray-700 bg-gray-800/95 px-6 py-5 sm:px-8">
            <div className="flex items-start gap-4 sm:gap-5">
              {user.pImage ? (
                <img
                  src={user.pImage}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-full border-2 border-indigo-500/80 object-cover sm:h-20 sm:w-20"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-indigo-500/80 bg-indigo-600 text-xl font-semibold text-white sm:h-20 sm:w-20 sm:text-2xl">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">
                  User profile
                </p>
                <h2
                  id="user-details-title"
                  className="mt-1 truncate text-xl font-semibold text-white sm:text-2xl"
                >
                  {fullName}
                </h2>
                <p className="mt-1 truncate text-sm text-gray-400">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-gray-600 bg-gray-900 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-200">
                    {user.role || "—"}
                  </span>
                  {showAccessControls && (
                    <>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                          ACCESS_BADGE_STYLES[resourceAccess] || ACCESS_BADGE_STYLES.default
                        }`}
                      >
                        Setting: {resourceAccess}
                      </span>
                      {effectiveState && (
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            EFFECTIVE_STATE_STYLES[effectiveState] || EFFECTIVE_STATE_STYLES.allowed
                          }`}
                        >
                          {EFFECTIVE_STATE_LABELS[effectiveState] || effectiveState}
                        </span>
                      )}
                    </>
                  )}
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

          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 sm:py-7 space-y-5">
            <SectionCard title="Account details">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <DetailField label="First name" value={user.firstName} />
                <DetailField label="Last name" value={user.lastName} />
                <DetailField label="Email" value={user.email} className="sm:col-span-2" />
                <DetailField label="Phone" value={user.phone || "—"} />
                <DetailField
                  label="Member since"
                  value={
                    user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"
                  }
                />
              </div>
            </SectionCard>

            {showAccessControls && (
              <SectionCard title="Resource access">
                <p className="mb-4 text-sm text-gray-400">
                  {blockingMode === "manual"
                    ? user.role === "library_user"
                      ? "Manual blocking mode: library users have access by default. Deny access manually, or grant to explicitly confirm access."
                      : "Manual blocking mode: students have course and library access by default. Deny access manually, or grant to explicitly confirm access."
                    : user.role === "library_user"
                    ? "Automatic blocking mode: library access follows library fee payment status. You can still override per account."
                    : "Automatic blocking mode: course access follows school fee payment status. Library access is included with school fees and is not blocked separately."}
                </p>

                {accessStatus && (
                  <div className="mb-4 space-y-1 text-sm text-gray-300">
                    <p>
                      Outstanding fees:{" "}
                      <span
                        className={
                          accessStatus.total_owed > 0 ? "text-amber-300" : "text-green-300"
                        }
                      >
                        {Number(accessStatus.total_owed || 0).toLocaleString()} XAF
                      </span>
                    </p>
                    {user.role === "student" && (
                      <p className="text-xs text-gray-500">
                        Library access is included — only outstanding school fees affect course
                        blocking.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {accessOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        resourceAccess === option.value
                          ? "border-indigo-500 bg-indigo-900/20"
                          : "border-gray-700 hover:border-gray-600"
                      } ${savingAccess ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <input
                        type="radio"
                        name="resourceAccess"
                        value={option.value}
                        checked={resourceAccess === option.value}
                        onChange={() => handleAccessChange(option.value)}
                        className="mt-1"
                        disabled={savingAccess}
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-100">
                          {option.label}
                        </span>
                        <span className="block text-xs text-gray-400">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>

                {accessError && (
                  <p className="mt-3 text-sm text-red-400">{accessError}</p>
                )}
              </SectionCard>
            )}

            {showAccessControls && (
              <SectionCard title="Payments">
                <UserPaymentsPanel
                  user={user}
                  onPaymentRecorded={refreshAccessStatus}
                />
              </SectionCard>
            )}
          </div>

          <div className="shrink-0 border-t border-gray-700 bg-gray-900/50 px-6 py-4 sm:px-8">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-600 bg-gray-800 px-5 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
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

export default UserViewModal;
