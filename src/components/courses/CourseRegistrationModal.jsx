import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Image as ImageIcon,
  BookOpen,
  GraduationCap,
  User,
  Plus,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState, useRef } from "react";

const CourseRegistrationModal = ({
  onClose,
  onRegister,
  editValues,
  handleInputChange,
  setEditValues,
  allTeachers,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(editValues.coverImage || null);
  const [activeStep, setActiveStep] = useState(1);
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
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        // Update editValues with the file
        setEditValues({ ...editValues, coverImage: file });
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

  const handleSubmit = () => {
    // Pass individual values to onRegister
    onRegister(
      editValues.coverImage,
      editValues.teacherFirstName,
      editValues.teacherLastName,
      editValues.title,
      editValues.description,
      editValues.level
    );
  };

  const steps = [
    {
      id: 1,
      title: "Basic Information",
      icon: BookOpen,
    },
    {
      id: 2,
      title: "Course Details",
      icon: GraduationCap,
    },
    {
      id: 3,
      title: "Teacher Assignment",
      icon: User,
    },
  ];

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Course Title
              </label>
              <input
                type="text"
                placeholder="Enter a descriptive title for your course"
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
                onChange={(e) => handleInputChange(e, "title")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Course Level
              </label>
              <select
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => handleInputChange(e, "level")}
                required
              >
                <option value="">Select course level</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Course Cover Image
              </label>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
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
                  id="courseCover"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileInputChange}
                />

                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Course cover preview"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewUrl(null);
                        setEditValues({ ...editValues, coverImage: null });
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-200"
                      aria-label="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <div className="text-gray-400">
                      <p className="text-sm font-medium">
                        Drag and drop your course cover image here
                      </p>
                      <p className="text-xs mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Course Description
              </label>
              <textarea
                placeholder="Describe what students will learn in this course..."
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[200px] placeholder-gray-400"
                onChange={(e) => handleInputChange(e, "description")}
                required
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assign Teacher
              </label>
              <select
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => {
                  const selectedTeacher = allTeachers.find(
                    (teacher) =>
                      `${teacher.firstName} ${teacher.lastName}` ===
                      e.target.value
                  );
                  handleInputChange(
                    e,
                    "teacher",
                    selectedTeacher.firstName,
                    selectedTeacher.lastName
                  );
                }}
                required
              >
                <option value="">Select a teacher for this course</option>
                {allTeachers.map((teacher) => (
                  <option
                    key={teacher.id}
                    value={`${teacher.firstName} ${teacher.lastName}`}
                  >
                    {`${teacher.firstName} ${teacher.lastName}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
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
          className="relative bg-gray-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden"
        >
          {/* Fixed Header */}
          <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Create New Course
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Step {activeStep} of {steps.length}
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors duration-200"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
            <div className="p-6">
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full ${
                        activeStep >= step.id
                          ? "bg-indigo-500 text-white"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      <step.icon size={16} />
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`w-16 h-0.5 mx-2 ${
                          activeStep > step.id ? "bg-indigo-500" : "bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="mb-8">{renderStepContent()}</div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex space-x-3">
                {activeStep > 1 && (
                  <button
                    onClick={() => setActiveStep(activeStep - 1)}
                    className="px-6 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    Back
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                {activeStep < steps.length ? (
                  <button
                    onClick={() => setActiveStep(activeStep + 1)}
                    className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <Plus size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
                  >
                    Create Course
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Cancel
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

export default CourseRegistrationModal;
