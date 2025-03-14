import { useState, useEffect, useRef } from "react";
import { motion, useInstantLayoutTransition } from "framer-motion";
import { Users } from "../../services/UsersManagement";
import { Edit, Search, Trash2, Check, Plus, X } from "lucide-react";
import { editUser, deleteUser } from "../../services/UsersManagement";
import { CreateLesson } from "../../services/LessonManagement";
import { GetCourses } from "../../services/CourseManagement";

const LessonsTable = async ({ updateLessonsStats }) => {
  const userData = await Users();
  const allCourses = await GetCourses();

  const courseDropDown = [{ title: "Select a Course", id: 0 }, ...allCourses];

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredLessons] = useState(userData);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState(""); // For "Go to Page"
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [registerUserId, setRegistrationLessonId] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedValues, setSelectedValues] = useState({});
  const editRowRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const usersPerPage = 5;

  // ** Search Functionality **
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = userData.filter(
      (user) =>
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
    );

    setFilteredLessons(filtered);
    setCurrentPage(1); // Reset to first page after filtering
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

  // Confirm Registration
  const handleConfirmRegistration = async () => {
    try {
      if (selectedValues.course === "Select a Course") {
        throw Error("Please select a course");
      }

      await CreateLesson(
        selectedValues.course,
        selectedValues.title,
        selectedValues.description,
        selectedValues.file || ""
      );

      const updatedUsers = await Users(); // Pay attention to not forget to get the lessons after the update is been made in the lesson list
      setFilteredLessons(updatedUsers);
      updateLessonsStats(updatedUsers);
      setRegistrationLessonId(false);
    } catch (error) {
      console.error("Error Creating Lesson:", error);
    }
  };

  // Start Editing
  const handleEditClick = (lesson) => {
    setEditingUserId(lesson.id);
    setSelectedValues({
      course: lesson.course,
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
  const handleConfirmEdit = async (userId) => {
    await editUser(
      userId,
      selectedValues.email,
      selectedValues.firstName,
      selectedValues.lastName,
      selectedValues.role
    );

    const updatedUsers = await Users();
    setFilteredLessons(updatedUsers); // Update local filtered state
    updateLessonsStats(updatedUsers); // Update the stats
    setEditingUserId(null);
  };

  //Start Deleting
  const handleDeleteClick = (user) => {
    setDeletingUserId(user.id);
  };

  // Confirm Delete
  const handleConfirmDelete = async (userId) => {
    try {
      await deleteUser(userId); // API call to delete user

      // Fetch the latest list of users from the API
      const updatedUsers = await Users();

      // Update both userData (full list) and filteredUsers (search results)
      userData.length = 0; // Clear and update userData reference
      userData.push(...updatedUsers); // Update userData to always stay current

      // Apply the current search filter on the updated user list
      const filtered = updatedUsers.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.role.toLowerCase().includes(searchTerm)
      );

      setFilteredLessons(filtered); // Update the displayed list
      updateLessonsStats(updatedUsers); // Update statistics
    } catch (error) {
      console.error("Error deleting user:", error);
    }

    setDeletingUserId(null); // Reset delete state
  };

  // Compute paginated users
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const paginatedUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Pagination Controls
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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
        {!registerUserId && (
          <button
            onClick={handleRegistrationClick}
            className="text-indigo-400 hover:text-indigo-300"
          >
            <Plus size={30} />
          </button>
        )}
      </div>

      {/* Registration Form */}
      {registerUserId && (
        <div className="bg-gray-700 p-4 rounded-md space-y-3 flex flex-col">
          <button
            className="absolute top-10 right-9 text-red-500 hover:text-red-700"
            onClick={() => setRegistrationLessonId(false)} // Cancel registration
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
            {courseDropDown.map((course) => (
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
              {["First Name", "Last Name", "Email", "Role", "Actions"].map(
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
            {paginatedUsers.map((user) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                ref={editingUserId === user.id ? editRowRef : null}
              >
                {["firstName", "lastName", "email", "role"].map((field) => (
                  <td key={field} className="px-6 py-4 whitespace-nowrap">
                    {editingUserId === user.id ? (
                      <input
                        type="text"
                        defaultValue={user[field]}
                        onChange={(e) => handleInputChange(e, field)}
                        className="bg-gray-700 text-white rounded-lg px-2 py-1 w-full outline-none"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-100">
                        {user[field]}
                      </div>
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-gray-300">
                  {editingUserId === user.id ? (
                    <button
                      onClick={() => handleConfirmEdit(user.id)}
                      ref={confirmButtonRef}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check size={18} />
                    </button>
                  ) : deletingUserId === user.id ? (
                    <button
                      onClick={() => handleConfirmDelete(user.id)}
                      ref={confirmButtonRef}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Check size={18} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditClick(user)}
                        className="text-indigo-400 hover:text-indigo-300 mr-2"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
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
