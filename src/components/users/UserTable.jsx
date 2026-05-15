import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GetUsers } from "../../services/UsersManagement";
import { Edit, Search, Trash2, Check, Plus, X, Eye, RefreshCw } from "lucide-react";
import { editUser, deleteUser } from "../../services/UsersManagement";
import { createUserAsAdmin } from "../../services/AuthenticationManagement";
import UserRegistrationModal from "./UserRegistrationModal";
import UserViewModal from "./UserViewModal";
import { useApiLoader } from "../../contexts/ApiLoaderContext";

const UsersTable = ({ updateUserStats, activeTab = "both" }) => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [usersList, setUsersList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [registerUserId, setRegistrationUserId] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const confirmButtonRef = useRef(null);
  const usersPerPage = 10;
  const [viewingUser, setViewingUser] = useState(null);

  const matchesActiveTab = (user) => {
    if (activeTab === "admin") return user.role === "admin";
    if (activeTab === "student") return user.role === "student";
    if (activeTab === "library_user") return user.role === "library_user";
    return user.role === "student" || user.role === "library_user";
  };

  // Refresh data function
  const refreshData = async () => {
    const users = await runWithLoader(() => GetUsers());
    const tabUsers = users.filter(matchesActiveTab);
    setUsersList(tabUsers);
    setFilteredUsers(tabUsers);
    updateUserStats(tabUsers);
  };

  const fetchUsers = async () => {
    const users = await runWithLoader(() => GetUsers());
    const tabUsers = users.filter(matchesActiveTab);
    setUsersList(tabUsers);
    setFilteredUsers(tabUsers);
    updateUserStats(tabUsers);
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
    const defaultRole = activeTab === "admin"
      ? "admin"
      : activeTab === "library_user"
      ? "library_user"
      : "student";
    const defaultSubscription =
      defaultRole === "library_user"
        ? "library_user"
        : defaultRole === "student"
        ? "student"
        : "none";
    setRegistrationUserId(true);
    setEditValues({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: defaultRole,
      subscriptionType: defaultSubscription,
      schoolMaxLevel: defaultRole === "student" ? 1 : 0,
    });
  };

  // Close modal
  const handleCloseModal = () => {
    setRegistrationUserId(false);
    setEditingUserId(null);
    setEditError("");
    setIsSavingEdit(false);
    setEditValues({});
  };

  // Confirm Registration
  const handleConfirmRegistration = async () => {
    try {
      const created = await runWithLoader(() =>
        createUserAsAdmin(
          editValues.email,
          editValues.password,
          editValues.firstName,
          editValues.lastName,
          editValues.role ||
            (activeTab === "admin"
              ? "admin"
              : activeTab === "library_user"
              ? "library_user"
              : "student"),
          editValues.p_image || null
        )
      );

      if (created?.id) {
        await runWithLoader(() =>
          editUser(
            created.id,
            undefined,
            undefined,
            undefined,
            editValues.role,
            undefined,
            undefined,
            editValues.subscriptionType,
            editValues.schoolMaxLevel
          )
        );
      }

      const updatedUsers = await runWithLoader(() => GetUsers());
      const tabUsers = updatedUsers.filter(matchesActiveTab);
      setUsersList(tabUsers); // Update the main users list
      setFilteredUsers(tabUsers);
      updateUserStats(tabUsers);
      setRegistrationUserId(false);
    } catch (error) {
      console.error("Error registering user:", error);
    }
  };

  // Start Editing
  const handleEditClick = (user) => {
    setEditError("");
    setEditingUserId(user.id);
    setEditValues({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      pImage: user.pImage || null,
      role: user.role,
      subscriptionType: user.subscriptionType || "none",
      schoolMaxLevel: user.schoolMaxLevel ?? 0,
    });
  };

  // Handle Input Changes
  const handleInputChange = (e, field) => {
    if (field === "pImage") {
      setEditValues({ ...editValues, [field]: e.target.files[0] });
    } else {
      const value = e.target.value;
      if (field === "role") {
        let nextSubscription = editValues.subscriptionType || "none";
        let nextSchoolMaxLevel = Number(editValues.schoolMaxLevel ?? 0);
        if (value === "student") {
          nextSubscription = "student";
          if (!Number.isFinite(nextSchoolMaxLevel) || nextSchoolMaxLevel < 1) {
            nextSchoolMaxLevel = 1;
          }
        } else if (value === "library_user") {
          nextSubscription = "library_user";
          nextSchoolMaxLevel = 0;
        } else {
          nextSubscription = "none";
          nextSchoolMaxLevel = 0;
        }
        setEditValues({
          ...editValues,
          role: value,
          subscriptionType: nextSubscription,
          schoolMaxLevel: nextSchoolMaxLevel,
        });
        return;
      }
      if (field === "subscriptionType") {
        let nextRole = editValues.role || "student";
        let nextSchoolMaxLevel = Number(editValues.schoolMaxLevel ?? 0);
        if (value === "student") {
          nextRole = "student";
          if (!Number.isFinite(nextSchoolMaxLevel) || nextSchoolMaxLevel < 1) {
            nextSchoolMaxLevel = 1;
          }
        } else if (value === "library_user") {
          nextRole = "library_user";
          nextSchoolMaxLevel = 0;
        } else if (value === "none") {
          if (nextRole === "student" || nextRole === "library_user") {
            nextRole = "teacher";
          }
          nextSchoolMaxLevel = 0;
        }
        setEditValues({
          ...editValues,
          subscriptionType: value,
          role: nextRole,
          schoolMaxLevel: nextSchoolMaxLevel,
        });
        return;
      }
      setEditValues({ ...editValues, [field]: value });
    }
  };

  // Confirm Edits
  const handleConfirmEdit = async () => {
    if (!editingUserId) return;
    try {
      setEditError("");
      setIsSavingEdit(true);
      const updatedUsers = await runWithLoader(async () => {
        await editUser(
          editingUserId,
          editValues.email,
          editValues.firstName,
          editValues.lastName,
          editValues.role || "admin",
          undefined,
          editValues.p_image || null,
          editValues.subscriptionType,
          editValues.schoolMaxLevel
        );
        return GetUsers();
      });
      const tabUsers = (updatedUsers ?? []).filter(matchesActiveTab);
      setUsersList(tabUsers);
      setFilteredUsers(tabUsers);
      updateUserStats(tabUsers);
      handleCloseModal();
    } catch (error) {
      console.error("Error editing user:", error);
      setEditError(error.message || "Failed to save changes.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  //Start Deleting
  const handleDeleteClick = (user) => {
    setDeletingUserId(user.id);
  };

  // Confirm Delete
  const handleConfirmDelete = async (userId) => {
    try {
      const updatedUsers = await runWithLoader(async () => {
        await deleteUser(userId);
        return GetUsers();
      });
      const tabUsers = (updatedUsers ?? []).filter(matchesActiveTab);
      setUsersList(tabUsers);
      const filtered = tabUsers.filter(
        (user) =>
          user.firstName.toLowerCase().includes(searchTerm) ||
          user.lastName.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.role.toLowerCase().includes(searchTerm)
      );
      setFilteredUsers(filtered);
      updateUserStats(tabUsers);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
    setDeletingUserId(null);
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
  }, [activeTab]); // Reload when tab changes

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

      {/* Registration / Edit Modal */}
      <AnimatePresence>
        {(registerUserId || editingUserId) && (
          <UserRegistrationModal
            onClose={handleCloseModal}
            onRegister={editingUserId ? handleConfirmEdit : handleConfirmRegistration}
            editValues={editValues}
            handleInputChange={handleInputChange}
            setEditValues={setEditValues}
            title={editingUserId ? "Edit User" : "Register User"}
            submitLabel={editingUserId ? "Save Changes" : "Register"}
            isEdit={Boolean(editingUserId)}
            errorMessage={editError}
            isSubmitting={isSavingEdit}
          />
        )}
      </AnimatePresence>

      {/* View User Modal */}
      <AnimatePresence>
        {viewingUser && (
          <UserViewModal user={viewingUser} onClose={handleCloseViewModal} />
        )}
      </AnimatePresence>

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
              >
                {["firstName", "lastName", "email", "role"].map((field) => (
                  <td key={field} className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-100">
                      {user[field]}
                    </div>
                  </td>
                ))}
                <td className="px-6 py-4 text-sm text-gray-300">
                  {deletingUserId === user.id ? (
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
                        onClick={() => handleViewUser(user)}
                        className="text-gray-400 hover:text-gray-300 mr-2"
                      >
                        <Eye size={18} />
                      </button>
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

export default UsersTable;
