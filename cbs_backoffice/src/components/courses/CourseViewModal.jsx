import { motion } from "framer-motion";
import {
  X,
  BookOpen,
  Users,
  GraduationCap,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { CreateLesson } from "../../services/LessonManagement";
import { useState } from "react";

const CourseViewModal = ({ course, onClose }) => {
  if (!course) return null;

  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonFile, setLessonFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLessonId, setExpandedLessonId] = useState(null);

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await CreateLesson(course.id, lessonTitle, lessonDescription, lessonFile);
      // Reset form
      setLessonTitle("");
      setLessonDescription("");
      setLessonFile(null);
      setIsCreatingLesson(false);
      // You might want to refresh the course data here
    } catch (error) {
      console.error("Error creating lesson:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLessonExpansion = (lessonId) => {
    setExpandedLessonId(expandedLessonId === lessonId ? null : lessonId);
  };

  const handleFileOpen = (fileUrl) => {
    window.open(fileUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-gray-800 rounded-lg w-full max-w-md relative max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <button
            className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition-colors duration-200"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>

          <h2 className="text-xl font-semibold text-white mb-6">
            Course Details
          </h2>

          <div className="space-y-6">
            {/* Course Title */}
            <div className="flex items-center space-x-3">
              <BookOpen className="w-8 h-8 text-indigo-500" />
              <h3 className="text-lg font-medium text-white">{course.title}</h3>
            </div>

            {/* Course Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm">Level</label>
                <p className="text-white font-medium capitalize">
                  {course.level}
                </p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Teacher</label>
                <p className="text-white font-medium">
                  {`${course.teacher.firstName} ${course.teacher.lastName}`}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Description</label>
                <p className="text-white font-medium">{course.description}</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Status</label>
                <p className="text-green-400 font-medium">Active</p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Created At</label>
                <p className="text-white font-medium">
                  {new Date(course.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Lessons Section */}
            <div className="pt-6 border-t border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-medium text-white">
                    Course Content
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreatingLesson(!isCreatingLesson)}
                  className="flex items-center space-x-2 px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-200"
                >
                  <Plus size={16} />
                  <span>Add Lesson</span>
                </button>
              </div>

              {isCreatingLesson && (
                <form
                  onSubmit={handleCreateLesson}
                  className="mb-6 space-y-4 bg-gray-700 p-4 rounded-lg relative"
                >
                  <button
                    type="button"
                    onClick={() => setIsCreatingLesson(false)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors duration-200"
                    aria-label="Close form"
                  >
                    <X size={18} />
                  </button>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Lesson Title
                    </label>
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={lessonDescription}
                      onChange={(e) => setLessonDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows="3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Lesson File
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setLessonFile(e.target.files[0])}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsCreatingLesson(false)}
                      className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-200 disabled:opacity-50"
                    >
                      {isLoading ? "Creating..." : "Create Lesson"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                <p className="text-gray-400 text-sm">
                  Total Lessons: {course.lessons?.length || 0}
                </p>
                {course.lessons && course.lessons.length > 0 ? (
                  <div className="space-y-2">
                    {course.lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="bg-gray-700 rounded-lg overflow-hidden"
                      >
                        <div
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-600 transition-colors duration-200"
                          onClick={() => toggleLessonExpansion(lesson.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {lesson.title}
                              </p>
                              <p className="text-gray-400 text-sm">
                                Duration: {lesson.duration || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {lesson.file && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileOpen(lesson.file);
                                }}
                                className="p-1 text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
                                title="Open lesson file"
                              >
                                <FileText size={18} />
                              </button>
                            )}
                            {expandedLessonId === lesson.id ? (
                              <ChevronUp size={20} className="text-gray-400" />
                            ) : (
                              <ChevronDown
                                size={20}
                                className="text-gray-400"
                              />
                            )}
                          </div>
                        </div>

                        {expandedLessonId === lesson.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-gray-600"
                          >
                            <div className="p-4">
                              <h4 className="text-sm font-medium text-gray-300 mb-2">
                                Description
                              </h4>
                              <p className="text-gray-400 text-sm whitespace-pre-wrap">
                                {lesson.description ||
                                  "No description available"}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    No lessons added yet
                  </p>
                )}
              </div>
            </div>

            {/* Enrollments Section */}
            <div className="pt-6 border-t border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-medium text-white">Enrollments</h3>
              </div>
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">
                  Total Students: {course.enrollments?.length || 0}
                </p>
                {course.enrollments && course.enrollments.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {course.enrollments.slice(0, 3).map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="bg-gray-700 rounded-lg p-3 flex items-center space-x-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                          {enrollment.student.firstName[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {`${enrollment.student.firstName} ${enrollment.student.lastName}`}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Enrolled:{" "}
                            {new Date(
                              enrollment.createdAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {course.enrollments.length > 3 && (
                      <p className="text-gray-400 text-sm text-center">
                        +{course.enrollments.length - 3} more students
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    No students enrolled yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CourseViewModal;
