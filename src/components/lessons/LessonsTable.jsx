import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Search, Trash2, Check, Plus, X, Eye, RefreshCw } from "lucide-react";
import { GetUsers } from "../../services/UsersManagement";
import { editUser, deleteUser } from "../../services/UsersManagement";
import { CreateLesson } from "../../services/LessonManagement";
import { GetCourses } from "../../services/CourseManagement";

const LessonsTable = ({ updateLessonsStats }) => {
  const [lessonsList, setLessonsList] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [deletingLessonId, setDeletingLessonId] = useState(null);
  const [registerLessonId, setRegistrationLessonId] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [selectedValues, setSelectedValues] = useState({});
  const editRowRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const lessonsPerPage = 10;

  // Refresh data function
  const refreshData = async () => {
    await fetchLessons();
    updateLessonsStats(lessonsList);
  };

  // Fetch lessons from all courses
  const fetchLessons = async () => {
    try {
      const courses = await GetCourses();
      setAllCourses(courses);
      
      // Extract all lessons from all courses
      const allLessons = courses.flatMap(course => 
        course.lessons ? course.lessons.map(lesson => ({
          ...lesson,
          courseTitle: course.title,
          courseId: course.id
        })) : []
      );
      
      setLessonsList(allLessons);
      setFilteredLessons(allLessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  // Search functionality
  useEffect(() => {
    if (!searchTerm) {
      setFilteredLessons(lessonsList);
    } else {
      const filtered = lessonsList.filter(
        (lesson) =>
          lesson.title?.toLowerCase().includes(searchTerm) ||
          lesson.description?.toLowerCase().includes(searchTerm) ||
          lesson.courseTitle?.toLowerCase().includes(searchTerm)
      );
      setFilteredLessons(filtered);
    }
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, lessonsList]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  // Start registering
  const handleRegistrationClick = () => {
    setRegistrationLessonId(true);
    setSelectedValues({
      course: "Select a Course",
      title: "",
      description: "",
      file: "",
    });
  };

  // Close modal
  const handleCloseModal = () => {
    setRegistrationLessonId(false);
    setSelectedValues({});
  };

  // Confirm Registration
  const handleConfirmRegistration = async () => {
    try {
      if (selectedValues.course === "Select a Course") {
        throw new Error("Please select a course");
      }

      await CreateLesson(
        selectedValues.course,
        selectedValues.title,
        selectedValues.description,
        selectedValues.file || ""
      );

      // Refresh lessons data
      await fetchLessons();
      updateLessonsStats(lessonsList);
      setRegistrationLessonId(false);
    } catch (error) {
      console.error("Error Creating Lesson:", error);
    }
  };

  // Start Editing
  const handleEditClick = (lesson) => {
    setEditingLessonId(lesson.id);
    setSelectedValues({
      course: lesson.courseId,
      title: lesson.title,
      description: lesson.description,
      file: lesson.file,
    });
  };

  // Handle Input Changes
  const handleInputChange = (e, field) => {
    if (field === "file") {
      setSelectedValues({ ...selectedValues, [field]: e.target.files[0] });
    } else {
      setSelectedValues({ ...selectedValues, [field]: e.target.value });
    }
  };

  // Confirm Edits
  const handleConfirmEdit = async (lessonId) => {
    try {
      await editUser(
        lessonId,
        selectedValues.email,
        selectedValues.firstName,
        selectedValues.lastName,
        selectedValues.role
      );

      // Refresh lessons data
      await fetchLessons();
      updateLessonsStats(lessonsList);
      setEditingLessonId(null);
    } catch (error) {
      console.error("Error updating lesson:", error);
    }
  };

  // Start Deleting
  const handleDeleteClick = (lesson) => {
    setDeletingLessonId(lesson.id);
  };

  // Confirm Delete
  const handleConfirmDelete = async (lessonId) => {
    try {
      await deleteUser(lessonId);

      // Refresh lessons data
      await fetchLessons();
      updateLessonsStats(lessonsList);
    } catch (error) {
      console.error("Error deleting lesson:", error);
    }

    setDeletingLessonId(null);
  };

  // Compute paginated lessons
  const indexOfLastLesson = currentPage * lessonsPerPage;
  const indexOfFirstLesson = indexOfLastLesson - lessonsPerPage;
  const paginatedLessons = filteredLessons.slice(indexOfFirstLesson, indexOfLastLesson);

  // Pagination
  const totalPages = Math.ceil(filteredLessons.length / lessonsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Go to Page Functionality
  const handlePageInputChange = (e) => {
    setPageInput(e.target.value);
  };

  const handleGoToPage = () => {
    const pageNumber = parseInt(pageInput, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
    setPageInput("");
  };

  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Header with Search Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search in all fields..."
            className="bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={handleSearch}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
        {!registerLessonId && (
          <div className="flex gap-2">
            <button
              onClick={refreshData}
              className="text-green-400 hover:text-green-300"
              title="Refresh data"
            >
              <RefreshCw size={24} />
            </button>
            <button
              onClick={handleRegistrationClick}
              className="text-indigo-400 hover:text-indigo-300"
            >
              <Plus size={30} />
            </button>
          </div>
        )}
      </div>

      {/* Registration Form */}
      {registerLessonId && (
        <div className="bg-gray-700 p-4 rounded-md space-y-3 flex flex-col">
          <button
            className="absolute top-10 right-9 text-red-500 hover:text-red-700"
            onClick={handleCloseModal} // Cancel registration
          >
            <X size={24} />
          </button>

          <select
            value={selectedValues.course}
            onChange={(e) => {
              const selectedCourse = allCourses.find(
                (course) => course.title === e.target.value
              );
              setSelectedValues({
                ...selectedValues,
                course: selectedCourse.id,
              });
            }}
            className="block w-full p-2 rounded-md bg-gray-800 text-white"
          >
            {allCourses.map((course) => (
              <option key={course.id} value={`${course.title}`}>
                {`${course.title}`}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Lesson Title"
            className="block w-full mb-3 p-2 rounded-md bg-gray-800 text-white"
            onChange={(e) => handleInputChange(e, "title")}
          />
          <input
            type="text"
            placeholder="Description"
            className="block w-full mb-2 p-2 rounded-md bg-gray-800 text-white"
            onChange={(e) => handleInputChange(e, "description")}
          />

          <input
            type="file"
            placeholder="File"
            accept="*"
            className="block w-full mb-2 p-2 rounded-md bg-gray-800 text-white"
            onChange={(e) => handleInputChange(e, "file")}
          />

          <button
            onClick={handleConfirmRegistration}
            className="bg-green-500 px-4 py-2 rounded-md text-white"
          >
            Create Lesson
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              {["Title", "Description", "Course", "Actions"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700">
            {paginatedLessons.map((lesson) => (
              <motion.tr
                key={lesson.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                ref={editingLessonId === lesson.id ? editRowRef : null}
              >
                {["title", "description", "courseTitle"].map((field) => (
                  <td key={field} className="px-6 py-4 whitespace-nowrap">
                    {editingLessonId === lesson.id ? (
                      <input
                        type="text"
                        defaultValue={lesson[field]}
                        onChange={(e) => handleInputChange(e, field)}
                        className="bg-gray-700 text-white rounded-lg px-2 py-1 w-full outline-none"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-100">
                        {lesson[field]}
                      </div>
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-gray-300">
                  {editingLessonId === lesson.id ? (
                    <button
                      onClick={() => handleConfirmEdit(lesson.id)}
                      ref={confirmButtonRef}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check size={18} />
                    </button>
                  ) : deletingLessonId === lesson.id ? (
                    <button
                      onClick={() => handleConfirmDelete(lesson.id)}
                      ref={confirmButtonRef}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check size={18} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditClick(lesson)}
                        className="text-indigo-400 hover:text-indigo-300 mr-2"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(lesson)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-6">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className={`px-4 py-2 rounded-lg ${
            currentPage === 1
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-700 hover:bg-blue-600"
          } text-white`}
        >
          Previous
        </button>
        <span className="text-gray-300">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={`px-4 py-2 rounded-lg ${
            currentPage === totalPages
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-700 hover:bg-blue-600"
          } text-white`}
        >
          Next
        </button>
      </div>

      {/* Go to Page Functionality */}
      <div className="flex justify-center items-center mt-4">
        <span className="text-gray-300 mr-2">Go to page:</span>
        <input
          type="number"
          value={pageInput}
          onChange={handlePageInputChange}
          className="w-16 text-center bg-gray-700 text-white rounded-md p-1 outline-none"
          min="1"
          max={totalPages}
        />
        <button
          onClick={handleGoToPage}
          className="ml-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg"
        >
          Go
        </button>
      </div>
    </motion.div>
  );
};

export default LessonsTable;
