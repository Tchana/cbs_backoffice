import { useState, useEffect } from "react";
import { UsersIcon } from "lucide-react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import TeacherTable from "../components/teachers/TeacherTable";
import { GetUsers } from "../services/UsersManagement"; // Ensure this fetches the latest users list

const TeacherPage = () => {
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
      const users = await GetUsers();
      updateUserStats(users);
    };
    fetchUsers();
  }, []);

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Teachers" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <TeacherTable updateUserStats={updateUserStats} />

        {/* USER CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8"></div>
      </main>
    </div>
  );
};

export default TeacherPage;
