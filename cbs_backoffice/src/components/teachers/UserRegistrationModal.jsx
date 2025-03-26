import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const UserRegistrationModal = ({
  onClose,
  onRegister,
  editValues,
  handleInputChange,
  setEditValues,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(editValues.p_image || null);
  const fileInputRef = useRef(null);

  // Prevent body scroll when modal is open
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
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith("image/")) {
      setEditValues({ ...editValues, p_image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
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
          <button
            className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition-colors duration-200"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>

          <h2 className="text-xl font-semibold text-white mb-6">
            Register User
          </h2>

          <div className="space-y-4">
            {/* Profile Picture Upload */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
                isDragging
                  ? "border-indigo-500 bg-indigo-500 bg-opacity-10"
                  : "border-gray-600 hover:border-indigo-500"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                id="p_image"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileInputChange}
              />

              {previewUrl ? (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    className="w-32 h-32 mx-auto rounded-full object-cover border-2 border-indigo-500"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewUrl(null);
                      setEditValues({ ...editValues, p_image: null });
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors duration-200"
                    aria-label="Remove image"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="text-gray-400">
                    <p className="text-sm">
                      Drag and drop your profile picture here, or click to
                      select
                    </p>
                    <p className="text-xs mt-1">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  value={editValues.firstName}
                  onChange={(e) => handleInputChange(e, "firstName")}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  value={editValues.lastName}
                  onChange={(e) => handleInputChange(e, "lastName")}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Email</label>
                <input
                  type="email"
                  id="email"
                  value={editValues.email}
                  onChange={(e) => handleInputChange(e, "email")}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Password</label>
                <input
                  type="password"
                  id="password"
                  value={editValues.password}
                  onChange={(e) => handleInputChange(e, "password")}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Role</label>
                <select
                  id="role"
                  value={editValues.role}
                  onChange={(e) => handleInputChange(e, "role")}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Register Button */}
            <button
              onClick={onRegister}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-2 mt-6 hover:bg-indigo-700 transition-colors duration-200"
            >
              Register
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default UserRegistrationModal;
