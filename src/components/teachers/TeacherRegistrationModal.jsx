import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Image as ImageIcon,
  User,
  Mail,
  BookOpen,
  KeyRound,
  Upload,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import LoadingSpinner from "../common/LoadingSpinner";

const inputClass =
  "w-full rounded-lg border border-gray-600 bg-gray-800 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const FormField = ({ label, htmlFor, hint, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300">
      {label}
    </label>
    {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
    <div className="mt-2">{children}</div>
  </div>
);

const SectionCard = ({ icon: Icon, title, description, children }) => (
  <section className="rounded-xl border border-gray-700/80 bg-gray-900/50 p-5 sm:p-6">
    <div className="mb-5 flex items-start gap-3">
      {Icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
          <Icon size={20} />
        </div>
      ) : null}
      <div>
        <h3 className="text-base font-semibold text-gray-100">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-gray-400">{description}</p>
        ) : null}
      </div>
    </div>
    {children}
  </section>
);

const TeacherRegistrationModal = ({
  onClose,
  onRegister,
  editValues,
  handleInputChange,
  setEditValues,
  title = "Register teacher",
  submitLabel = "Create teacher",
  isEdit = false,
  isSubmitting = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(
    editValues.p_image || editValues.pImage || null
  );
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreviewUrl(editValues.p_image || editValues.pImage || null);
  }, [editValues.p_image, editValues.pImage]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFileSelect(file);
  };

  const handleFileSelect = (file) => {
    if (!file?.type.startsWith("image/")) return;
    setEditValues({ ...editValues, p_image: file });
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    setPreviewUrl(null);
    setEditValues({ ...editValues, p_image: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const subtitle = isEdit
    ? "Update this teacher’s profile and ministry information."
    : "Add a new teacher account. Students will see this profile in the mobile app.";

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="teacher-modal-title"
          className="relative flex w-[min(96vw,56rem)] max-h-[min(94vh,960px)] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-2xl shadow-black/40"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-gray-700 bg-gradient-to-r from-gray-800 via-gray-800 to-indigo-950/30 px-6 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Teachers
                </p>
                <h2
                  id="teacher-modal-title"
                  className="mt-1 text-xl font-semibold text-white sm:text-2xl"
                >
                  {title}
                </h2>
                <p className="mt-1.5 max-w-xl text-sm text-gray-400">{subtitle}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-7">
              {/* Photo */}
              <SectionCard
                icon={ImageIcon}
                title="Profile photo"
                description="Shown on teacher cards and the mobile teacher profile."
              >
                <div
                  className={`flex flex-col items-center gap-5 rounded-xl border border-dashed p-6 transition-colors sm:flex-row sm:items-center sm:gap-8 ${
                    isDragging
                      ? "border-indigo-400 bg-indigo-500/10"
                      : "border-gray-600 bg-gray-800/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />

                  <div className="relative shrink-0">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt=""
                        className="h-28 w-28 rounded-full object-cover ring-2 ring-indigo-500/80 ring-offset-2 ring-offset-gray-900"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-700 text-gray-500">
                        <User size={40} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm text-gray-300">
                      Upload a clear portrait. Square images work best.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">PNG or JPG, max 5 MB</p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                      >
                        <Upload size={16} />
                        {previewUrl ? "Change photo" : "Upload photo"}
                      </button>
                      {previewUrl ? (
                        <button
                          type="button"
                          onClick={clearPhoto}
                          className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Identity + contact */}
              <div className="grid gap-5 lg:grid-cols-2">
                <SectionCard
                  icon={User}
                  title="Identity"
                  description="Legal name as it should appear in the app."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="First name" htmlFor="firstName">
                      <input
                        id="firstName"
                        type="text"
                        value={editValues.firstName}
                        onChange={(e) => handleInputChange(e, "firstName")}
                        className={inputClass}
                        required
                      />
                    </FormField>
                    <FormField label="Last name" htmlFor="lastName">
                      <input
                        id="lastName"
                        type="text"
                        value={editValues.lastName}
                        onChange={(e) => handleInputChange(e, "lastName")}
                        className={inputClass}
                        required
                      />
                    </FormField>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={Mail}
                  title="Contact"
                  description="Used for login and WhatsApp contact from the app."
                >
                  <div className="space-y-4">
                    <FormField label="Email" htmlFor="email">
                      <input
                        id="email"
                        type="email"
                        value={editValues.email}
                        onChange={(e) => handleInputChange(e, "email")}
                        className={inputClass}
                        placeholder="teacher@example.com"
                        required
                      />
                    </FormField>
                    <FormField
                      label="Phone (WhatsApp)"
                      htmlFor="phone"
                      hint="Include country code, e.g. +237..."
                    >
                      <input
                        id="phone"
                        type="tel"
                        value={editValues.phone || ""}
                        onChange={(e) => handleInputChange(e, "phone")}
                        className={inputClass}
                        placeholder="+237 6 12 34 56 78"
                      />
                    </FormField>
                  </div>
                </SectionCard>
              </div>

              {/* Ministry */}
              <SectionCard
                icon={BookOpen}
                title="Ministry profile"
                description="Visible to students on the teacher detail page in the mobile app."
              >
                <div className="space-y-4">
                  <FormField label="Vocation" htmlFor="vocation">
                    <input
                      id="vocation"
                      type="text"
                      value={editValues.vocation || ""}
                      onChange={(e) => handleInputChange(e, "vocation")}
                      className={inputClass}
                      placeholder="Pastor, Evangelist, Bible teacher..."
                    />
                  </FormField>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <FormField label="Testimony" htmlFor="testimony">
                      <textarea
                        id="testimony"
                        rows={5}
                        value={editValues.testimony || ""}
                        onChange={(e) => handleInputChange(e, "testimony")}
                        className={`${inputClass} min-h-[120px] resize-y`}
                        placeholder="How they came to faith and their calling..."
                      />
                    </FormField>
                    <FormField label="Journey (Parcours)" htmlFor="journey">
                      <textarea
                        id="journey"
                        rows={5}
                        value={editValues.journey || ""}
                        onChange={(e) => handleInputChange(e, "journey")}
                        className={`${inputClass} min-h-[120px] resize-y`}
                        placeholder="Training, ministry experience, education..."
                      />
                    </FormField>
                  </div>
                </div>
              </SectionCard>

              {/* Account */}
              {!isEdit && (
                <SectionCard
                  icon={KeyRound}
                  title="Account access"
                  description="Credentials for the teacher to sign in to the backoffice."
                >
                  <div className="max-w-md">
                    <FormField
                      label="Password"
                      htmlFor="password"
                      hint="Minimum 6 characters recommended."
                    >
                      <input
                        id="password"
                        type="password"
                        value={editValues.password}
                        onChange={(e) => handleInputChange(e, "password")}
                        className={inputClass}
                        required
                      />
                    </FormField>
                  </div>
                </SectionCard>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-700 bg-gray-800/95 px-4 py-4 backdrop-blur sm:px-8">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden text-xs text-gray-500 sm:block">
                Fields marked in the form are saved to the teacher profile.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onRegister}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 hover:bg-indigo-500 disabled:opacity-60"
                >
                  {isSubmitting && <LoadingSpinner inline size="sm" />}
                  {isSubmitting ? "Saving..." : submitLabel}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default TeacherRegistrationModal;
