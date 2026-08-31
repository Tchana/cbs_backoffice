import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Image as ImageIcon,
  BookOpen,
  GraduationCap,
  User,
  Plus,
  FileText,
  Layers,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState, useRef } from "react";
import RichTextEditor from "../common/RichTextEditor";
import OverviewVideosEditor from "./OverviewVideosEditor";
import LessonResourcesEditor from "./LessonResourcesEditor";

const emptyLesson = () => ({
  id: crypto.randomUUID(),
  title: "",
  description: "",
  resources: [],
});

const CourseRegistrationModal = ({
  onClose,
  onRegister,
  editValues,
  handleInputChange,
  setEditValues,
  allTeachers,
  title = "Create New Course",
  submitLabel = "Create Course",
  isEdit = false,
  isSubmitting = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(
    editValues.coverImageUrl || editValues.coverImage || null
  );
  const [activeStep, setActiveStep] = useState(1);
  const [teacherSearch, setTeacherSearch] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    if (editValues.coverImage instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(editValues.coverImage);
    } else if (editValues.coverImageUrl) {
      setPreviewUrl(editValues.coverImageUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [editValues.coverImage, editValues.coverImageUrl]);

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setEditValues({ ...editValues, coverImage: file });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = () => onRegister();

  const steps = [
    { id: 1, title: "Basic", icon: BookOpen },
    { id: 2, title: "Description", icon: FileText },
    { id: 3, title: "Overview", icon: GraduationCap },
    { id: 4, title: "Lessons", icon: Layers },
    { id: 5, title: "Teacher", icon: User },
  ];

  const lessons = editValues.lessons || [];
  const overviewVideos = editValues.overviewVideos || [];

  const updateLessons = (nextLessons) => {
    setEditValues({ ...editValues, lessons: nextLessons });
  };

  const updateOverviewVideos = (nextVideos) => {
    setEditValues({ ...editValues, overviewVideos: nextVideos });
  };

  const filteredTeachers = (allTeachers || []).filter((teacher) => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return true;
    const name = `${teacher.firstName ?? ""} ${teacher.lastName ?? ""}`.toLowerCase();
    const email = (teacher.email ?? "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

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
                value={editValues.title ?? ""}
                onChange={(e) => handleInputChange(e, "title")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Course Cover Image{isEdit ? " (optional)" : ""}
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
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewUrl(null);
                        setEditValues({
                          ...editValues,
                          coverImage: null,
                          coverImageUrl: null,
                        });
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
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
                value={editValues.description ?? ""}
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
                Learning Objectives (rich text)
              </label>
              <RichTextEditor
                value={editValues.learningObjectives ?? ""}
                onChange={(html) =>
                  setEditValues({ ...editValues, learningObjectives: html })
                }
                ariaLabel="Learning objectives"
                placeholder="What will students achieve after completing this course?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Overview Videos (external links)
              </label>
              <OverviewVideosEditor
                videos={overviewVideos}
                onChange={updateOverviewVideos}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Add lessons now or skip and add them later from the course detail view.
            </p>
            {lessons.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No lessons added yet.</p>
            ) : (
              lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="rounded-lg border border-gray-600 bg-gray-700/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      Lesson {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateLessons(lessons.filter((l) => l.id !== lesson.id))
                      }
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Lesson title"
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-md"
                    value={lesson.title}
                    onChange={(e) =>
                      updateLessons(
                        lessons.map((l) =>
                          l.id === lesson.id ? { ...l, title: e.target.value } : l
                        )
                      )
                    }
                  />
                  <textarea
                    placeholder="Lesson description (optional)"
                    className="w-full px-3 py-2 bg-gray-600 text-white rounded-md"
                    rows={2}
                    value={lesson.description ?? ""}
                    onChange={(e) =>
                      updateLessons(
                        lessons.map((l) =>
                          l.id === lesson.id
                            ? { ...l, description: e.target.value }
                            : l
                        )
                      )
                    }
                  />
                  <LessonResourcesEditor
                    resources={lesson.resources || []}
                    onChange={(resources) =>
                      updateLessons(
                        lessons.map((l) =>
                          l.id === lesson.id ? { ...l, resources } : l
                        )
                      )
                    }
                  />
                </div>
              ))
            )}
            <button
              type="button"
              onClick={() => updateLessons([...lessons, emptyLesson()])}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
            >
              <Plus size={16} />
              Add lesson
            </button>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search teacher by name or email
              </label>
              <input
                type="text"
                placeholder="Type to search..."
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border border-gray-600 p-2">
              {filteredTeachers.length === 0 ? (
                <p className="text-sm text-gray-400 p-2">No teachers found.</p>
              ) : (
                filteredTeachers.map((teacher) => {
                  const selected = editValues.teacherId === teacher.id;
                  return (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() =>
                        setEditValues({
                          ...editValues,
                          teacherId: teacher.id,
                          teacherFirstName: teacher.firstName,
                          teacherLastName: teacher.lastName,
                          teacherEmail: teacher.email,
                        })
                      }
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selected
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                      }`}
                    >
                      <p className="font-medium">
                        {teacher.firstName} {teacher.lastName}
                      </p>
                      <p className="text-xs opacity-80">{teacher.email}</p>
                    </button>
                  );
                })
              )}
            </div>
            {editValues.teacherId ? (
              <p className="text-sm text-green-400">
                Selected: {editValues.teacherFirstName} {editValues.teacherLastName}
                {editValues.teacherEmail ? ` (${editValues.teacherEmail})` : ""}
              </p>
            ) : (
              <p className="text-sm text-amber-400">Please select a teacher.</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-gray-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden"
        >
          <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{title}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Step {activeStep} of {steps.length}
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-8 overflow-x-auto">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center shrink-0">
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
                        className={`w-8 sm:w-12 h-0.5 mx-1 ${
                          activeStep > step.id ? "bg-indigo-500" : "bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mb-8">{renderStepContent()}</div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                {activeStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(activeStep - 1)}
                    className="px-6 py-2 text-gray-300 hover:text-white"
                  >
                    Back
                  </button>
                )}
              </div>
              <div className="flex space-x-3">
                {activeStep < steps.length ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep(activeStep + 1)}
                    className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <Plus size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !editValues.teacherId}
                    className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : submitLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 text-gray-300 hover:text-white"
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
