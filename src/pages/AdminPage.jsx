import { useEffect, useState } from "react";
import Header from "../components/common/Header";
import UsersTable from "../components/users/UserTable";
import { GetUsers } from "../services/UsersManagement";
import { useApiLoader } from "../contexts/ApiLoaderContext";

const AdminPage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    admins: 0,
  });

  const updateUserStats = (users) => {
    setUserStats({
      totalUsers: users.length,
      admins: users.filter((user) => user.role === "admin").length,
    });
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const users = await runWithLoader(() => GetUsers());
      const admins = users.filter((user) => user.role === "admin");
      updateUserStats(admins);
    };
    fetchUsers();
  }, []);

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Admin" />
      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <div className="mb-4 text-sm text-gray-300">
          Showing {userStats.totalUsers} system admins
        </div>
        <UsersTable updateUserStats={updateUserStats} activeTab="admin" />
      </main>
    </div>
  );
};

export default AdminPage;
