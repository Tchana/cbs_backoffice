import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Mail, Phone, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import RichTextDisplay from "../common/RichTextDisplay";

const DetailField = ({ label, value, className = "", rich = false }) => (
  <div className={className}>
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <div className="mt-1">
      {rich ? (
        <RichTextDisplay value={value} emptyLabel="—" />
      ) : (
        <p className="text-sm font-medium text-gray-100 break-words whitespace-pre-wrap">
          {(value ?? "").trim() || "—"}
        </p>
      )}
    </div>
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

const TeacherViewModal = ({ user, onClose }) => {
  if (!user) return null;

  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "T";
  const fullName =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Teacher";
  const courseCount = user.courses?.length || 0;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

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
          aria-labelledby="teacher-details-title"
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
                  className="h-16 w-16 shrink-0 rounded-full border-2 border-amber-500/70 object-cover sm:h-20 sm:w-20"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-amber-500/70 bg-amber-600/90 text-xl font-semibold text-white sm:h-20 sm:w-20 sm:text-2xl">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
                  Teacher profile
                </p>
                <h2
                  id="teacher-details-title"
                  className="mt-1 truncate text-xl font-semibold text-white sm:text-2xl"
                >
                  {fullName}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-gray-400">
                  <Mail size={14} className="shrink-0" />
                  {user.email || "—"}
                </p>
                {user.phone ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-400">
                    <Phone size={14} className="shrink-0" />
                    {user.phone}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-gray-600 bg-gray-900 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-200">
                    {user.role || "teacher"}
                  </span>
                  <span className="rounded-full border border-emerald-800 bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    Active
                  </span>
                  <span className="rounded-full border border-gray-600 bg-gray-900 px-2.5 py-0.5 text-xs font-medium text-gray-200">
                    {courseCount} course{courseCount === 1 ? "" : "s"}
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
            <div className="space-y-6">
              <SectionCard title="Contact" description="Primary contact details">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailField label="First name" value={user.firstName} />
                  <DetailField label="Last name" value={user.lastName} />
                  <DetailField label="Email" value={user.email} className="sm:col-span-2" />
                  <DetailField label="Phone" value={user.phone} className="sm:col-span-2" />
                </div>
              </SectionCard>

              <SectionCard
                title="Ministry profile"
                description="Vocation, testimony, and journey"
              >
                <div className="space-y-5">
                  <DetailField
                    label="Vocation"
                    value={(user.vocation || "").trim() || "—"}
                  />
                  <DetailField
                    label="Testimony"
                    value={(user.testimony || "").trim()}
                    rich
                  />
                  <DetailField
                    label="Journey (Parcours)"
                    value={(user.journey || "").trim()}
                    rich
                  />
                </div>
              </SectionCard>

              <SectionCard title="Activity" description="Account and teaching activity">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <DetailField
                    label="Member since"
                    value={
                      user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"
                    }
                  />
                  <DetailField label="Role" value={user.role} />
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Courses
                    </p>
                    <div className="mt-2 flex items-start gap-3 rounded-lg border border-gray-700/80 bg-gray-800/60 p-4">
                      <div className="rounded-lg bg-indigo-900/50 p-2 text-indigo-300">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-100">
                          {courseCount} active course{courseCount === 1 ? "" : "s"}
                        </p>
                        {courseCount > 0 && Array.isArray(user.courses) ? (
                          <ul className="mt-2 space-y-1 text-sm text-gray-400">
                            {user.courses.slice(0, 8).map((c, i) => (
                              <li key={c?.id ?? i} className="truncate">
                                • {c?.title || c?.name || `Course ${i + 1}`}
                              </li>
                            ))}
                            {courseCount > 8 ? (
                              <li className="text-gray-500">
                                + {courseCount - 8} more…
                              </li>
                            ) : null}
                          </ul>
                        ) : (
                          <p className="mt-1 text-sm text-gray-500">No courses assigned yet.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-700 bg-gray-800/95 px-6 py-4 sm:px-8">
            <div className="flex justify-end">
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

export default TeacherViewModal;
