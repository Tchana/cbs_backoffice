import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {
  CreateManualSubscription,
  GetUserSubscriptionHistory,
  GetUserSubscriptionStatus,
  SetUserSubscriptionAccessState,
} from "../../services/UsersManagement";
import { useApiLoader } from "../../contexts/ApiLoaderContext";

const accessBadgeClass = (state) => {
  const s = (state || "none").toLowerCase();
  if (s === "full") return "bg-emerald-900/50 text-emerald-300 border-emerald-800";
  if (s === "suspended") return "bg-red-900/50 text-red-300 border-red-800";
  if (s === "downgraded") return "bg-amber-900/50 text-amber-300 border-amber-800";
  return "bg-gray-800 text-gray-400 border-gray-700";
};

const DetailField = ({ label, value, className = "" }) => (
  <div className={className}>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-1 text-sm font-medium text-gray-100 break-words">{value ?? "—"}</p>
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

const inputClass =
  "w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const UserViewModal = ({ user, onClose }) => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [manualPlanCode, setManualPlanCode] = useState("student_trimester");
  const [manualReason, setManualReason] = useState("");
  if (!user) return null;
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";

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

  const reloadSubscription = async () => {
    const [status, rows] = await Promise.all([
      runWithLoader(() => GetUserSubscriptionStatus(user.id)),
      runWithLoader(() => GetUserSubscriptionHistory(user.id)),
    ]);
    setSubscriptionStatus(status);
    setHistory(rows || []);
  };

  const handleManualGrant = async () => {
    await runWithLoader(() =>
      CreateManualSubscription({
        userId: user.id,
        planCode: manualPlanCode,
        reason: manualReason,
      })
    );
    await reloadSubscription();
    setManualReason("");
  };

  const handleSuspendAccess = async () => {
    const subscriptionId = subscriptionStatus?.subscription_id;
    if (!subscriptionId) return;
    const note = window.prompt("Optional note for suspending access", "") ?? "";
    await runWithLoader(() =>
      SetUserSubscriptionAccessState({
        subscriptionId,
        accessState: "suspended",
        note,
      })
    );
    await reloadSubscription();
  };

  const handleRestoreAccess = async () => {
    const subscriptionId = subscriptionStatus?.subscription_id;
    if (!subscriptionId) return;
    const note = window.prompt("Optional note for restoring access", "") ?? "";
    await runWithLoader(() =>
      SetUserSubscriptionAccessState({
        subscriptionId,
        accessState: "full",
        note,
      })
    );
    await reloadSubscription();
  };

  const accessState = subscriptionStatus?.access_state || "none";
  const isSuspended = accessState === "suspended";

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
          className="relative flex w-full max-w-4xl max-h-[min(90vh,880px)] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
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
                  <span className="rounded-full border border-gray-600 bg-gray-900 px-2.5 py-0.5 text-xs font-medium text-gray-200">
                    {user.subscriptionType || "none"}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${accessBadgeClass(accessState)}`}
                  >
                    {accessState}
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

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 sm:py-7">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
              {/* Left column */}
              <div className="space-y-6">
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
                    <DetailField
                      label="School max level"
                      value={String(user.schoolMaxLevel ?? 0)}
                    />
                    <DetailField label="Account status" value="Active" />
                  </div>
                </SectionCard>

                <SectionCard title="Activity">
                  {user.role === "teacher" && (
                    <p className="text-sm text-gray-300">
                      <span className="text-white font-medium">
                        {user.courses?.length || 0}
                      </span>{" "}
                      active courses
                    </p>
                  )}
                  {user.role === "student" && (
                    <p className="text-sm text-gray-300">
                      School access level:{" "}
                      <span className="text-white font-medium">
                        {user.schoolMaxLevel ?? 0}
                      </span>
                    </p>
                  )}
                  {user.role !== "teacher" && user.role !== "student" && (
                    <p className="text-sm text-gray-400">No activity summary for this role.</p>
                  )}
                </SectionCard>
              </div>

              {/* Right column — subscription */}
              <div className="space-y-6">
                <SectionCard
                  title="Current subscription"
                  description="Live status from the user's active subscription window."
                >
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailField
                      label="Status"
                      value={subscriptionStatus?.subscription_status || "none"}
                    />
                    <DetailField
                      label="Plan"
                      value={subscriptionStatus?.plan_name || "—"}
                    />
                    <DetailField
                      label="Ends"
                      value={
                        subscriptionStatus?.ends_at
                          ? new Date(subscriptionStatus.ends_at).toLocaleString()
                          : "—"
                      }
                      className="sm:col-span-2"
                    />
                  </dl>

                  {subscriptionStatus?.subscription_id ? (
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-700/80 pt-5">
                      {isSuspended ? (
                        <button
                          type="button"
                          onClick={handleRestoreAccess}
                          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
                        >
                          Restore access
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSuspendAccess}
                          className="rounded-lg bg-red-900/80 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-800"
                        >
                          Suspend access
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-gray-400">
                      No active subscription record. Grant access below.
                    </p>
                  )}
                </SectionCard>

                <SectionCard
                  title="Grant access manually"
                  description="Creates or extends a trimester without mobile-money payment."
                >
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">
                        Plan
                      </label>
                      <select
                        value={manualPlanCode}
                        onChange={(e) => setManualPlanCode(e.target.value)}
                        className={inputClass}
                      >
                        <option value="student_trimester">
                          Student — courses + library
                        </option>
                        <option value="library_trimester">Library only</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">
                        Note (optional)
                      </label>
                      <input
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                        placeholder="e.g. Paid in cash at office"
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleManualGrant}
                      className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                      Grant / extend trimester
                    </button>
                  </div>
                </SectionCard>

                <SectionCard title="Subscription history">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-400">No subscription history yet.</p>
                  ) : (
                    <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
                      {history.map((row) => (
                        <li
                          key={row.id}
                          className="rounded-lg border border-gray-700/80 bg-gray-800/80 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-100">
                              {row.plan?.name || row.plan?.code || "Plan"}
                            </p>
                            <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-gray-300">
                              {row.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            {row.starts_at
                              ? new Date(row.starts_at).toLocaleDateString()
                              : "—"}{" "}
                            →{" "}
                            {row.ends_at
                              ? new Date(row.ends_at).toLocaleDateString()
                              : "—"}
                          </p>
                          {row.access_state ? (
                            <p className="mt-1 text-xs text-gray-500">
                              Access: {row.access_state}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>
              </div>
            </div>
          </div>

          {/* Footer */}
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
