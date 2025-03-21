import { motion } from "framer-motion";
import { X } from "lucide-react";

const CourseRegistrationModal = ({
  onClose,
  onRegister,
  editValues,
  handleInputChange,
  setEditValues,
  allTeachers,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md relative"
      >
        <button
          className="absolute top-4 right-4 text-red-500 hover:text-red-700"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-4">
          Create New Course
        </h2>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Title"
            className="block w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            onChange={(e) => handleInputChange(e, "title")}
          />
          <textarea
            placeholder="Description"
            className="block w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
            onChange={(e) => handleInputChange(e, "description")}
          />
          <input
            type="text"
            placeholder="Level"
            className="block w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            onChange={(e) => handleInputChange(e, "level")}
          />
          <select
            className="block w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            onChange={(e) => {
              const selectedTeacher = allTeachers.find(
                (t) => `${t.firstName} ${t.lastName}` === e.target.value
              );
              handleInputChange(
                e,
                "teacher",
                selectedTeacher.firstName,
                selectedTeacher.lastName
              );
            }}
          >
            <option value="">Select a Teacher</option>
            {allTeachers.map((teacher) => (
              <option
                key={teacher.id}
                value={`${teacher.firstName} ${teacher.lastName}`}
              >
                {`${teacher.firstName} ${teacher.lastName}`}
              </option>
            ))}
          </select>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={onRegister}
              className="px-4 py-2 rounded-md bg-green-500 text-white hover:bg-green-400"
            >
              Create Course
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CourseRegistrationModal;
