import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GetUsers } from "../../services/UsersManagement";
import { Edit, Search, Trash2, Check, Plus, X, Eye } from "lucide-react";
import { editUser, deleteUser } from "../../services/UsersManagement";
import { signup } from "../../services/AuthenticationManagement";
import StudentRegistrationModal from "./StudentRegistrationModal";
import StudentViewModal from "./StudentViewModal";

const StudentTable = ({ updateUserStats }) => {
  const [usersList, setUsersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [registerUserId, setRegistrationUserId] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const editRowRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const usersPerPage = 10;
  const [viewingUser, setViewingUser] = useState(null);
  const userRole = JSON.parse(localStorage.getItem("role"));

  const fetchUsers = async () => {
    const users = await GetUsers();
    setUsersList(users.filter((user) => user.role === "student"));
    // Initialize filtered users with all users
    setFilteredUsers(users.filter((user) => user.role === "student"));
  };

  // ** Search Functionality **
  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    const filtered = usersList.filter(
      (user) =>
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
    );

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page after filtering
    setPageInput(""); // Reset page input when search changes
  };

  // Start registering
  const handleRegistrationClick = () => {
    setRegistrationUserId(true);
    setEditValues({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "student",
    });
  };

  // Close modal
  const handleCloseModal = () => {
    setRegistrationUserId(false);
    setEditValues({});
  };

  // Confirm Registration
  const handleConfirmRegistration = async () => {
    try {
      await signup(
        editValues.email,
        editValues.password,
        editValues.firstName,
        editValues.lastName,
        editValues.p_image || "",
        editValues.role
      );

      const updatedUsers = await GetUsers();
      setFilteredUsers(updatedUsers.filter((user) => user.role === "student"));
      updateUserStats(updatedUsers.filter((user) => user.role === "student"));
      setRegistrationUserId(false);
    } catch (error) {
      console.error("Error registering user:", error);
    }
  };

  // Start Editing
  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setEditValues({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
  };

  // Handle Input Changes
  const handleInputChange = (e, field) => {
    if (field === "pImage") {
      setEditValues({ ...editValues, [field]: e.target.files[0] });
    } else {
      setEditValues({ ...editValues, [field]: e.target.value });
    }
  };

  // Confirm Edits
  const handleConfirmEdit = async (userId) => {
    await editUser(
      userId,
      editValues.email,
      editValues.firstName,
      editValues.lastName,
      editValues.role
    );

    const updatedUsers = await GetUsers();
    setFilteredUsers(updatedUsers.filter((user) => user.role === "student")); // Update local filtered state
    updateUserStats(updatedUsers.filter((user) => user.role === "student")); // Update the stats
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
      const updatedUsers = await GetUsers();

      // Update both userData (full list) and filteredUsers (search results)
      usersList.length = 0; // Clear and update userData reference
      usersList.push(...updatedUsers.filter((user) => user.role === "student")); // Update userData to always stay current

      // Apply the current search filter on the updated user list
      const filtered = updatedUsers.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.role.toLowerCase().includes(searchTerm)
      );

      setFilteredUsers(filtered); // Update the displayed list
      updateUserStats(updatedUsers.filter((user) => user.role === "student")); // Update statistics
    } catch (error) {
      console.error("Error deleting user:", error);
    }

    setDeletingUserId(null); // Reset delete state
  };

  // Compute paginated users and total pages
  const currentUsers = searchTerm ? filteredUsers : usersList;
  const totalPages = Math.max(1, Math.ceil(currentUsers.length / usersPerPage));

  // Ensure current page is valid when data changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentUsers.length, totalPages]);

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const paginatedUsers = currentUsers.slice(indexOfFirstUser, indexOfLastUser);

  // Pagination Controls
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      setPageInput(""); // Reset page input when changing pages
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      setPageInput(""); // Reset page input when changing pages
    }
  };

  // Go to Page Functionality
  const handlePageInputChange = (e) => {
    const value = e.target.value;
    setPageInput(value);
  };

  const handleGoToPage = () => {
    const pageNumber = parseInt(pageInput, 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
    setPageInput(""); // Reset input after navigation
  };

  // Handle View User
  const handleViewUser = (user) => {
    setViewingUser(user);
  };

  // Close View Modal
  const handleCloseViewModal = () => {
    setViewingUser(null);
  };

  useEffect(() => {
    fetchUsers();
  }, []); // Remove searchTerm dependency as it's handled in handleSearch

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
        <button
          onClick={handleRegistrationClick}
          className="text-indigo-400 hover:text-indigo-300"
        >
          <Plus size={30} />
        </button>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {registerUserId && (
          <StudentRegistrationModal
            onClose={handleCloseModal}
            onRegister={handleConfirmRegistration}
            editValues={editValues}
            handleInputChange={handleInputChange}
            setEditValues={setEditValues}
          />
        )}
      </AnimatePresence>

      {/* View User Modal */}
      <AnimatePresence>
        {viewingUser && (
          <StudentViewModal user={viewingUser} onClose={handleCloseViewModal} />
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead>
            <tr>
              {["First Name", "Last Name", "Email", "Actions"].map(
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
                {["firstName", "lastName", "email"].map((field) => (
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
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleViewUser(user)}
                        className="text-gray-400 hover:text-gray-300"
                        aria-label="View user details"
                      >
                        <Eye size={18} />
                      </button>

                      {userRole === "admin" && (
                        <>
                          <button
                            onClick={() => handleEditClick(user)}
                            className="text-indigo-400 hover:text-indigo-300"
                            aria-label="Edit user"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="text-red-400 hover:text-red-300"
                            aria-label="Delete user"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
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

export default StudentTable;
