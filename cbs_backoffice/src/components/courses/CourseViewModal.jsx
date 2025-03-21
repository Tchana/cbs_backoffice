import { motion } from "framer-motion";
import { X, BookOpen, Users, GraduationCap, Clock } from "lucide-react";

const CourseViewModal = ({ course, onClose }) => {
  if (!course) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md relative"
      >
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

        <div className="space-y-4">
          {/* Course Title */}
          <div className="flex items-center space-x-3 mb-6">
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
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex items-center space-x-2 mb-4">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-medium text-white">Course Content</h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">
                Total Lessons: {course.lessons?.length || 0}
              </p>
              {course.lessons && course.lessons.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {course.lessons.map((lesson, index) => (
                    <div
                      key={lesson.id}
                      className="bg-gray-700 rounded-lg p-3 flex items-center space-x-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">{lesson.title}</p>
                        <p className="text-gray-400 text-sm">
                          Duration: {lesson.duration || "N/A"}
                        </p>
                      </div>
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
          <div className="mt-6 pt-6 border-t border-gray-700">
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
                          {new Date(enrollment.createdAt).toLocaleDateString()}
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
      </motion.div>
    </div>
  );
};

export default CourseViewModal;
