import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Search, Trash2, Check, Plus, Eye, RefreshCw } from "lucide-react";
import { GetUsers } from "../../services/UsersManagement";
import {
  GetCourses,
  CreateCourse,
  deleteCourse,
  editCourse,
  setCourseActive,
} from "../../services/CourseManagement";
import CourseRegistrationModal from "./CourseRegistrationModal";
import CourseViewModal from "./CourseViewModal";

import { isAdmin } from "../../lib/auth";
import { useApiLoader } from "../../contexts/ApiLoaderContext";

const CoursesTable = ({ updateCourseStats }) => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [allTeachers, setAllTeachers] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCourses, setFilteredCourses] = useState(courseList);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState(""); // For "Go to Page"
  const [deletingCourseId, setDeletingCourseId] = useState(null);
  const [registerCourseId, setRegistrationUserId] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [popUpState, setPopUpState] = useState(false);
  const confirmButtonRef = useRef(null);
  const coursesPerPage = 10;
  const [viewingCourse, setViewingCourse] = useState(null);

  // Refresh data function
  const refreshData = async () => {
    try {
      const courses = await runWithLoader(() => GetCourses());
      setCourseList(courses ?? []);
      setFilteredCourses(courses ?? []);
      updateCourseStats(courses ?? []);
    } catch (err) {
      console.error("Error refreshing courses:", err);
      setCourseList([]);
      setFilteredCourses([]);
      updateCourseStats([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courses = await runWithLoader(() => GetCourses());
        setCourseList(courses ?? []);
        setFilteredCourses(courses ?? []);
      } catch (err) {
        console.error("Error fetching courses:", err);
        setCourseList([]);
        setFilteredCourses([]);
      }
    };
    fetchData().catch((err) => {
      console.error("CoursesTable fetchData failed", err);
      setCourseList([]);
      setFilteredCourses([]);
    });
  }, []);

  // ** Search Functionality **
  useEffect(() => {
    if (!searchTerm) {
      setFilteredCourses(courseList);
    } else {
      const filtered = courseList.filter(
        (course) => {
          const teacherName = course.teacher
            ? `${course.teacher.firstName ?? ""} ${course.teacher.lastName ?? ""}`.trim()
            : "";
          return (
            course.title?.toLowerCase().includes(searchTerm) ||
            course.description?.toLowerCase().includes(searchTerm) ||
            teacherName.toLowerCase().includes(searchTerm)
          );
        }
      );

      setFilteredCourses(filtered);
    }
  }, [searchTerm, courseList]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
    setCurrentPage(1); //Reset to first page after search
  };

  // Start registering
  const handleCourseCreationClick = () => {
    setRegistrationUserId(true);
    setEditValues({
      coverImage: null,
      title: "",
      description: "",
      learningObjectives: "",
      overviewVideos: [],
      lessons: [],
      teacherId: "",
      teacherFirstName: "",
      teacherLastName: "",
      teacherEmail: "",
    });
  };

  // Close modal
  const handleCloseModal = () => {
    setRegistrationUserId(false);
    setEditingCourseId(null);
    setIsSavingEdit(false);
    setEditValues({});
  };

  // Confirm Registration
  const handleConfirmRegistration = async () => {
    try {
      const updatedCourses = await runWithLoader(async () => {
        await CreateCourse({
          coverImage: editValues.coverImage,
          teacherId: editValues.teacherId,
          title: editValues.title,
          description: editValues.description,
          learningObjectives: editValues.learningObjectives,
          overviewVideos: editValues.overviewVideos,
          lessons: editValues.lessons,
        });
        return GetCourses();
      });
      setCourseList(updatedCourses ?? []);
      setFilteredCourses(updatedCourses ?? []);
      updateCourseStats(updatedCourses ?? []);
      setRegistrationUserId(false);
      setEditValues({});
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };

  // Start Editing
  const handleEditClick = (course) => {
    setEditingCourseId(course.id);
    setEditValues({
      title: course.title ?? "",
      description: course.description ?? "",
      learningObjectives: course.learningObjectives ?? "",
      overviewVideos: course.overviewVideos ?? [],
      lessons: [],
      teacherId: course.teacher_id ?? course.teacher?.id ?? "",
      teacherFirstName: course.teacher?.firstName ?? "",
      teacherLastName: course.teacher?.lastName ?? "",
      teacherEmail: course.teacher?.email ?? "",
      coverImage: null,
      coverImageUrl: course.course_cover_url || null,
    });
  };

  // Handle Input Changes
  const handleInputChange = (e, field) => {
    setEditValues({ ...editValues, [field]: e.target.value });
  };

  // Confirm Edits
  const handleConfirmEdit = async () => {
    if (!editingCourseId) return;
    try {
      setIsSavingEdit(true);
      const updatedCourses = await runWithLoader(async () => {
        await editCourse({
          id: editingCourseId,
          title: editValues.title,
          description: editValues.description,
          learningObjectives: editValues.learningObjectives,
          teacherId: editValues.teacherId,
          overviewVideos: editValues.overviewVideos,
        });
        return GetCourses();
      });
      setCourseList(updatedCourses ?? []);
      setFilteredCourses(updatedCourses ?? []);
      updateCourseStats(updatedCourses ?? []);
      setEditingCourseId(null);
      setEditValues({});
    } catch (error) {
      console.error("Error editing course:", error);
    } finally {
      setIsSavingEdit(false);
    }
  };

  //Start Deleting
  const handleDeleteClick = (course) => {
    setDeletingCourseId(course.id);
  };

  // Confirm Delete
  const handleConfirmDelete = async (userId) => {
    try {
      const updatedCourses = await runWithLoader(async () => {
        await deleteCourse(userId);
        return GetCourses();
      });

      setCourseList(updatedCourses ?? []);

      const filtered = (updatedCourses ?? []).filter(
        (course) => {
          const teacherName = course.teacher
            ? `${course.teacher.firstName ?? ""} ${course.teacher.lastName ?? ""}`.trim().toLowerCase()
            : "";
          return (
            course.title?.toLowerCase().includes(searchTerm) ||
            course.description?.toLowerCase().includes(searchTerm) ||
            teacherName.includes(searchTerm)
          );
        }
      );

      setFilteredCourses(filtered); // Update the displayed list
      updateCourseStats(updatedCourses); // Update statistics
    } catch (error) {
      console.error("Error deleting course:", error);
    }

    setDeletingCourseId(null); // Reset delete state
  };

  // Compute paginated users
  const indexOfLastCourse = currentPage * coursesPerPage;
  const indexOfFirstCourse = indexOfLastCourse - coursesPerPage;
  const paginatedCourse = searchTerm
    ? filteredCourses.slice(indexOfFirstCourse, indexOfLastCourse)
    : courseList.slice(indexOfFirstCourse, indexOfLastCourse);

  // Pagination Controls
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

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

  useEffect(() => {
    const fetchTeachers = async () => {
      const users = await GetUsers(); // Fetch all users
      const teachers = users.filter((user) => user.role === "teacher"); // Filter teachers
      setAllTeachers(teachers);
    };
    fetchTeachers();
  }, []); // Remove searchTerm dependency as it's not needed for fetching teachers

  // Handle View Course
  const handleViewCourse = (course) => {
    setViewingCourse(course);
  };

  // Close View Modal
  const handleCloseViewModal = () => {
    setViewingCourse(null);
  };

  const handleLessonChange = async () => {
    if (!viewingCourse?.id) return;
    try {
      const courses = await runWithLoader(() => GetCourses());
      setCourseList(courses ?? []);
      setFilteredCourses(courses ?? []);
      updateCourseStats(courses ?? []);
      const updated = (courses ?? []).find((c) => c.id === viewingCourse.id);
      if (updated) setViewingCourse(updated);
    } catch (err) {
      console.error("Error refreshing after lesson change:", err);
    }
  };

  const handleToggleCourseActive = async (course) => {
    try {
      const updatedCourses = await runWithLoader(async () => {
        await setCourseActive(course.id, !course.active);
        return GetCourses();
      });
      setCourseList(updatedCourses ?? []);
      setFilteredCourses(updatedCourses ?? []);
      updateCourseStats(updatedCourses ?? []);
      if (viewingCourse?.id === course.id) {
        const updated = (updatedCourses ?? []).find((c) => c.id === course.id);
        if (updated) setViewingCourse(updated);
      }
    } catch (error) {
      console.error("Error toggling course active:", error);
    }
  };

  return (
    <>
      {!popUpState && (
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
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={18}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={refreshData}
                className="text-green-400 hover:text-green-300"
                title="Refresh data"
              >
                <RefreshCw size={24} />
              </button>
              {isAdmin() && (
                <button
                  onClick={handleCourseCreationClick}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  <Plus size={30} />
                </button>
              )}
            </div>
          </div>

          {/* Registration / Edit Modal */}
          <AnimatePresence>
            {(registerCourseId || editingCourseId) && (
              <CourseRegistrationModal
                onClose={handleCloseModal}
                onRegister={
                  editingCourseId ? handleConfirmEdit : handleConfirmRegistration
                }
                editValues={editValues}
                handleInputChange={handleInputChange}
                setEditValues={setEditValues}
                allTeachers={allTeachers}
                title={editingCourseId ? "Edit course" : "Create New Course"}
                submitLabel={editingCourseId ? "Save changes" : "Create Course"}
                isEdit={Boolean(editingCourseId)}
                isSubmitting={isSavingEdit}
              />
            )}
          </AnimatePresence>

          {/* View Course Modal */}
          <AnimatePresence>
            {viewingCourse && (
              <CourseViewModal
                course={viewingCourse}
                onClose={handleCloseViewModal}
                onLessonChange={handleLessonChange}
              />
            )}
          </AnimatePresence>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  {[
                    "Title",
                    "Status",
                    "Teacher's Name",
                    "N° of Lessons",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-700">
                {paginatedCourse.map((course) => (
                  <motion.tr
                    key={course.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {["title", "active", "teacher"].map(
                      (field) => (
                        <td key={field} className="px-6 py-4 whitespace-nowrap">
                          {field === "teacher" ? (
                            <div className="text-sm font-medium text-gray-100">
                              {course.teacher
                                ? `${course.teacher.firstName ?? ""} ${course.teacher.lastName ?? ""}`.trim() || "—"
                                : "—"}
                            </div>
                          ) : field === "active" ? (
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                course.active
                                  ? "bg-green-900 text-green-300"
                                  : "bg-gray-700 text-gray-300"
                              }`}
                            >
                              {course.active ? "Active" : "Inactive"}
                            </span>
                          ) : (
                            <div className="text-sm font-medium text-gray-100">
                              {course[field]}
                            </div>
                          )}
                        </td>
                      )
                    )}
                    <td>
                      <div className="text-sm font-medium text-gray-100">
                        {course.lessons?.length ?? 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {deletingCourseId === course.id ? (
                        <button
                          onClick={() => handleConfirmDelete(course.id)}
                          ref={confirmButtonRef}
                          className="text-green-400 hover:text-green-300"
                        >
                          <Check size={18} />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleViewCourse(course)}
                            className="text-gray-400 hover:text-gray-300 mr-2"
                            aria-label="View course details"
                          >
                            <Eye size={18} />
                          </button>
                          {isAdmin() && (
                            <>
                              <button
                                onClick={() => handleEditClick(course)}
                                className="text-indigo-400 hover:text-indigo-300 mr-2"
                                aria-label="Edit course"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(course)}
                                className="text-red-400 hover:text-red-300"
                                aria-label="Delete course"
                              >
                                <Trash2 size={18} />
                              </button>
                              <button
                                onClick={() => handleToggleCourseActive(course)}
                                className="ml-2 text-yellow-400 hover:text-yellow-300 text-xs"
                                aria-label="Toggle course active status"
                                title={
                                  course.active
                                    ? "Set inactive (hide from students)"
                                    : "Set active (show to students)"
                                }
                              >
                                {course.active ? "Deactivate" : "Activate"}
                              </button>
                            </>
                          )}
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
      )}
    </>
  );
};

export default CoursesTable;
