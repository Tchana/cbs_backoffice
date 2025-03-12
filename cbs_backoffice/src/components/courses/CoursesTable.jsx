import { useState, useEffect, useRef } from "react";
import { motion, useInstantLayoutTransition } from "framer-motion";
import { Edit, Search, Trash2, Check, Plus, X } from "lucide-react";
import { editUser, Users } from "../../services/UsersManagement";
import {
  GetCourses,
  CreateCourse,
  deleteCourse,
  editCourse,
} from "../../services/CourseManagement";

export const courseData = await GetCourses();
const allTeachers = (await Users()).filter((user) => user.role === "teacher");

const CoursesTable = ({ updateCourseStats }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCourses, setFilteredCourses] = useState(courseData);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState(""); // For "Go to Page"
  const [deletingCourseId, setDeletingCourseId] = useState(null);
  const [registerCourseId, setRegistrationUserId] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const editRowRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const usersPerPage = 5;

  // ** Search Functionality **
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = courseData.filter(
      (course) =>
        course.title.toLowerCase().includes(term) ||
        course.level.toLowerCase().includes(term) ||
        `${course.teacher.firstName.toLowerCase()} ${course.teacher.lastName.toLowerCase()}`.includes(
          term
        )
    );

    setFilteredCourses(filtered);
    setCurrentPage(1); // Reset to first page after filtering
  };
  // Start registering
  const handleCourseCreationClick = () => {
    setRegistrationUserId(true);
    setEditValues({
      title: "",
      description: "",
      level: "",
      teacherFirstName: "",
      teacherLastName: "",
    });
  };

  // Confirm Registration
  const handleConfirmRegistration = async () => {
    try {
      await CreateCourse(
        editValues.teacherFirstName,
        editValues.teacherLastName,
        editValues.title,
        editValues.description,
        editValues.level
      );

      const updatedCourses = await GetCourses();
      setFilteredCourses(updatedCourses);
      updateCourseStats(updatedCourses);
      setRegistrationUserId(false);
    } catch (error) {
      console.error("Error creating course:", error);
    }
  };

  // Start Editing
  const handleEditClick = (course) => {
    setEditingCourseId(course.id);
    setEditValues({
      title: course.title,
      description: course.description,
      level: course.level,
      teacherFirstName: course.teacher.firstName,
      teacherLastName: course.teacher.lastName,
    });
  };

  // Handle Input Changes
  const handleInputChange = (e, field, firstName = "", lastName = "") => {
    if (field === "teacher") {
      setEditValues((prev) => ({
        ...prev,
        teacherFirstName: firstName,
        teacherLastName: lastName,
      }));
    } else {
      setEditValues({ ...editValues, [field]: e.target.value });
    }
  };

  // Confirm Edits
  const handleConfirmEdit = async (courseId) => {
    await editCourse(
      courseId,
      editValues.title,
      editValues.description,
      editValues.level,
      editValues.teacherFirstName,
      editValues.teacherLastName
    );

    const updatedCourses = await GetCourses();
    setFilteredCourses(updatedCourses); // Update local filtered state
    updateCourseStats(updatedCourses); // Update the stats
    setEditingCourseId(null);
  };

  //Start Deleting
  const handleDeleteClick = (course) => {
    setDeletingCourseId(course.id);
  };

  // Confirm Delete
  const handleConfirmDelete = async (userId) => {
    try {
      await deleteCourse(userId);

      // Fetch the latest list of users from the API
      const updatedCourses = await GetCourses();

      // Update both userData (full list) and filteredUsers (search results)
      courseData.length = 0; // Clear and update userData reference
      courseData.push(...updatedCourses); // Update userData to always stay current

      // Apply the current search filter on the updated user list
      const filtered = updatedCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchTerm) ||
          course.description.toLowerCase().includes(searchTerm) ||
          course.teacher.toLowerCase().includes(searchTerm) ||
          course.level.toLowerCase().includes(searchTerm)
      );

      setFilteredCourses(filtered); // Update the displayed list
      updateCourseStats(updatedCourses); // Update statistics
    } catch (error) {
      console.error("Error deleting user:", error);
    }

    setDeletingCourseId(null); // Reset delete state
  };

  // Compute paginated users
  const indexOfLastCourse = currentPage * usersPerPage;
  const indexOfFirstCourse = indexOfLastCourse - usersPerPage;
  const paginatedCourse = filteredCourses.slice(
    indexOfFirstCourse,
    indexOfLastCourse
  );

  // Pagination Controls
  const totalPages = Math.ceil(filteredCourses.length / usersPerPage);

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

  // get the various teachers

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
        {!registerCourseId && (
          <button
            onClick={handleCourseCreationClick}
            className="text-indigo-400 hover:text-indigo-300"
          >
            <Plus size={30} />
          </button>
        )}
      </div>

      {/* Registration Form */}
      {registerCourseId && (
        <div className="bg-gray-700 p-4 rounded-md">
          <button
            className="absolute top-10 right-9 text-red-500 hover:text-red-700"
            onClick={() => setRegistrationUserId(false)} // Cancel registration
          >
            <X size={24} />
          </button>
          <input
            type="text"
            placeholder="Title"
            className="block w-full mb-2 p-2 rounded-md bg-gray-800 text-white"
            onChange={(e) => handleInputChange(e, "title")}
          />
          <input
            type="text"
            placeholder="Description"
            className="block w-full mb-2 p-2 rounded-md bg-gray-800 text-white"
            onChange={(e) => handleInputChange(e, "description")}
          />
          <input
            type="text"
            placeholder="Teacher's Name"
            className="block w-full mb-2 p-2 rounded-md bg-gray-800 text-white"
            onChange={(e) => handleInputChange(e, "teacherFirstName")}
          />

          <input
            type="text"
            placeholder="Level"
            className="block w-full mb-2 p-2 rounded-md bg-gray-800 text-white"
            onChange={(e) => handleInputChange(e, "level")}
          />

          <button
            onClick={handleConfirmRegistration}
            className="bg-green-500 px-4 py-2 rounded-md text-white"
          >
            Register
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              {[
                "Title",
                "Description",
                "Level",
                "Teacher's Name",
                "N° of Lessons",
                "Action",
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
                ref={editingCourseId === course.id ? editRowRef : null}
              >
                {["title", "description", "level", "teacher"].map((field) => (
                  <td key={field} className="px-6 py-4 whitespace-nowrap">
                    {editingCourseId === course.id ? (
                      field === "teacher" ? (
                        <select
                          value={`${editValues.teacherFirstName} ${editValues.teacherLastName}`}
                          onChange={(e) => {
                            const selectedTeacher = allTeachers.find(
                              (t) =>
                                `${t.firstName} ${t.lastName}` ===
                                e.target.value
                            );
                            handleInputChange(
                              e,
                              "teacher",
                              selectedTeacher.firstName,
                              selectedTeacher.lastName
                            );
                          }}
                          className="block w-full p-2 rounded-md bg-gray-800 text-white"
                        >
                          {allTeachers.map((teacher) => (
                            <option
                              key={teacher.id}
                              value={`${teacher.firstName} ${teacher.lastName}`}
                            >
                              {`${teacher.firstName} ${teacher.lastName}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          defaultValue={course[field]}
                          onChange={(e) => handleInputChange(e, field)}
                          className="bg-gray-700 text-white rounded-lg px-2 py-1 w-full outline-none"
                        />
                      )
                    ) : field === "teacher" ? (
                      <div className="text-sm font-medium text-gray-100">{`${course["teacher"].firstName} ${course["teacher"].lastName}`}</div>
                    ) : (
                      <div className="text-sm font-medium text-gray-100">
                        {course[field]}
                      </div>
                    )}
                  </td>
                ))}
                <td>
                  <div className="text-sm font-medium text-gray-100">
                    {course.lessons.length}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">
                  {editingCourseId === course.id ? (
                    <button
                      onClick={() => handleConfirmEdit(course.id)}
                      ref={confirmButtonRef}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check size={18} />
                    </button>
                  ) : deletingCourseId === course.id ? (
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
                        onClick={() => handleEditClick(course)}
                        className="text-indigo-400 hover:text-indigo-300 mr-2"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(course)}
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

export default CoursesTable;
