import { useState, useEffect } from "react";
import Header from "../components/common/Header";
import UsersTable from "../components/users/UserTable";
import { GetUsers } from "../services/UsersManagement";
import { useApiLoader } from "../contexts/ApiLoaderContext";

const UsersPage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [activeTab, setActiveTab] = useState("both");
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    students: 0,
    libraryUsers: 0,
  });

  // Function to update stats whenever users change
  const updateUserStats = (users) => {
    setUserStats({
      totalUsers: users.length,
      students: users.filter((user) => user.role === "student").length,
      libraryUsers: users.filter((user) => user.role === "library_user").length,
    });
  };

  // Fetch users initially
  useEffect(() => {
    const fetchUsers = async () => {
      const users = await runWithLoader(() => GetUsers());
      updateUserStats(users);
    };
    fetchUsers();
  }, []);

  const TABS = [
    { key: "both", label: "Both" },
    { key: "student", label: "Students" },
    { key: "library_user", label: "Library Users" },
  ];

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Users" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700 text-gray-200 hover:bg-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-4 text-sm text-gray-300">
          Showing {userStats.totalUsers} users ({userStats.students} students,{" "}
          {userStats.libraryUsers} library users)
        </div>

        <UsersTable updateUserStats={updateUserStats} activeTab={activeTab} />
      </main>
    </div>
  );
};

export default UsersPage;
