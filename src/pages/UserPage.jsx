import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { UsersIcon } from "lucide-react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import UsersTable from "../components/users/UserTable";
import { GetUsers } from "../services/UsersManagement";
import { isAdmin } from "../lib/auth";
import { useApiLoader } from "../contexts/ApiLoaderContext";

const UsersPage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    teachers: 0,
    students: 0,
    admins: 0,
  });

  // Function to update stats whenever users change
  const updateUserStats = (users) => {
    setUserStats({
      totalUsers: users.length,
      teachers: users.filter((user) => user.role === "teacher").length,
      students: users.filter((user) => user.role === "student").length,
      admins: users.filter((user) => user.role === "admin").length,
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

  if (!isAdmin()) return <Navigate to="/course" replace />;

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Users" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <UsersTable updateUserStats={updateUserStats} />

        {/* USER CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"></div>
      </main>
    </div>
  );
};

export default UsersPage;
