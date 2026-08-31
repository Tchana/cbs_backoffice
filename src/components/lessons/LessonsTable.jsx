import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Search, Trash2, Check, Plus, Eye, RefreshCw } from "lucide-react";
import { CreateLesson, EditLesson, DeleteLesson } from "../../services/LessonManagement";
import { GetCourses } from "../../services/CourseManagement";
import { useApiLoader } from "../../contexts/ApiLoaderContext";
import LessonViewModal from "./LessonViewModal";
import LessonFormModal from "./LessonFormModal";

const TRUNCATED_COLUMN = "max-w-[200px]";

const LessonsTable = ({ updateLessonsStats }) => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [lessonsList, setLessonsList] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [deletingLessonId, setDeletingLessonId] = useState(null);
  const [registerLessonId, setRegistrationLessonId] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [viewingLesson, setViewingLesson] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const confirmButtonRef = useRef(null);
  const lessonsPerPage = 10;

  const refreshData = async () => {
    const newLessons = await fetchLessons();
    if (typeof updateLessonsStats === "function") updateLessonsStats(newLessons);
  };

  const fetchLessons = async () => {
    try {
      const courses = await runWithLoader(() => GetCourses());
      setAllCourses(courses ?? []);
      const allLessons = (courses ?? []).flatMap((course) =>
        (course.lessons ?? []).map((lesson) => ({
          ...lesson,
          courseTitle: course.title,
          courseId: course.id,
        }))
      );
      setLessonsList(allLessons);
      setFilteredLessons(allLessons);
      return allLessons;
    } catch (error) {
      console.error("Error fetching lessons:", error);
      return [];
    }
  };

  useEffect(() => {
    fetchLessons();
  }, []);

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
    setCurrentPage(1);
  }, [searchTerm, lessonsList]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const handleRegistrationClick = () => {
    setRegistrationLessonId(true);
    setFormValues({
      course: "",
      title: "",
      description: "",
      resources: [],
    });
  };

  const handleCloseModal = () => {
    setRegistrationLessonId(false);
    setEditingLessonId(null);
    setIsSaving(false);
    setFormValues({});
  };

  const handleConfirmRegistration = async () => {
    if (!formValues.course) {
      alert("Please select a course.");
      return;
    }
    try {
      setIsSaving(true);
      await runWithLoader(() =>
        CreateLesson(
          formValues.course,
          formValues.title,
          formValues.description,
          formValues.resources || []
        )
      );
      const newLessons = await fetchLessons();
      if (typeof updateLessonsStats === "function") updateLessonsStats(newLessons);
      handleCloseModal();
    } catch (error) {
      console.error("Error Creating Lesson:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (lesson) => {
    setEditingLessonId(lesson.id);
    setFormValues({
      course: lesson.courseId,
      courseTitle: lesson.courseTitle,
      title: lesson.title ?? "",
      description: lesson.description ?? "",
      resources: (lesson.resources || []).map((r) => ({
        id: r.id || crypto.randomUUID(),
        resourceType: r.resourceType || r.resource_type,
        title: r.title || "",
        url: r.url || "",
        sourceKind: r.sourceKind || r.source_kind || "external",
        file: null,
      })),
    });
  };

  const handleInputChange = (e, field) => {
    if (field === "course") {
      setFormValues((prev) => ({ ...prev, course: e.target.value }));
    } else if (field === "resources") {
      setFormValues((prev) => ({ ...prev, resources: e.target.value }));
    } else {
      setFormValues((prev) => ({ ...prev, [field]: e.target.value }));
    }
  };

  const handleConfirmEdit = async () => {
    if (!editingLessonId) return;
    try {
      setIsSaving(true);
      await runWithLoader(() =>
        EditLesson(
          editingLessonId,
          formValues.title,
          formValues.description,
          formValues.resources || []
        )
      );
      const newLessons = await fetchLessons();
      if (typeof updateLessonsStats === "function") updateLessonsStats(newLessons);
      handleCloseModal();
    } catch (error) {
      console.error("Error updating lesson:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (lesson) => {
    setDeletingLessonId(lesson.id);
  };

  const handleConfirmDelete = async (lessonId) => {
    try {
      await runWithLoader(() => DeleteLesson(lessonId));
      const newLessons = await fetchLessons();
      if (typeof updateLessonsStats === "function") updateLessonsStats(newLessons);
    } catch (error) {
      console.error("Error deleting lesson:", error);
    }

    setDeletingLessonId(null);
  };

  const indexOfLastLesson = currentPage * lessonsPerPage;
  const indexOfFirstLesson = indexOfLastLesson - lessonsPerPage;
  const paginatedLessons = filteredLessons.slice(indexOfFirstLesson, indexOfLastLesson);

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

  const handleViewLesson = (lesson) => {
    setViewingLesson(lesson);
  };

  const handleCloseViewModal = () => {
    setViewingLesson(null);
  };

  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
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
      </div>

      <AnimatePresence>
        {(registerLessonId || editingLessonId) && (
          <LessonFormModal
            onClose={handleCloseModal}
            onSubmit={
              editingLessonId ? handleConfirmEdit : handleConfirmRegistration
            }
            formValues={formValues}
            setFormValues={setFormValues}
            handleInputChange={handleInputChange}
            allCourses={allCourses}
            title={editingLessonId ? "Edit lesson" : "Create lesson"}
            submitLabel={editingLessonId ? "Save changes" : "Create lesson"}
            isEdit={Boolean(editingLessonId)}
            isSubmitting={isSaving}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingLesson && (
          <LessonViewModal lesson={viewingLesson} onClose={handleCloseViewModal} />
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              {[
                { label: "Title", className: TRUNCATED_COLUMN },
                { label: "Description", className: TRUNCATED_COLUMN },
                { label: "Course", className: "" },
                { label: "Actions", className: "" },
              ].map(({ label, className }) => (
                <th
                  key={label}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${className}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700">
            {paginatedLessons.map((lesson) => (
              <motion.tr
                key={lesson.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {["title", "description", "courseTitle"].map((field) => {
                  const isTruncated = field === "title" || field === "description";
                  return (
                    <td
                      key={field}
                      className={`px-6 py-4 ${isTruncated ? `${TRUNCATED_COLUMN} truncate` : "whitespace-nowrap"}`}
                    >
                      <div
                        className={`text-sm font-medium text-gray-100 ${isTruncated ? "truncate" : ""}`}
                        title={isTruncated ? lesson[field] : undefined}
                      >
                        {lesson[field]}
                      </div>
                    </td>
                  );
                })}
                <td className="px-6 py-4 text-sm text-gray-300">
                  {deletingLessonId === lesson.id ? (
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
                        onClick={() => handleViewLesson(lesson)}
                        className="text-blue-400 hover:text-blue-300 mr-2"
                        title="View lesson details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleEditClick(lesson)}
                        className="text-indigo-400 hover:text-indigo-300 mr-2"
                        title="Edit lesson"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(lesson)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete lesson"
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
