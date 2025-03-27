import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, GraduationCap } from "lucide-react";
import { GetCourses } from "../services/CourseManagement";
import { GetUsers } from "../services/UsersManagement";
import { GetBooks } from "../services/BookManagement";
import UserRatioChart from "../components/users/UserRatioChart";
import StatCard from "../components/common/StatCard";
import Header from "../components/common/Header";
import LoadingSpinner from "../components/common/LoadingSpinner";

const OverviewPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalBooks: 0,
    userRatio: {
      teachers: 0,
      students: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch stats initially
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, courses, books] = await Promise.all([
          GetUsers(),
          GetCourses(),
          GetBooks(),
        ]);

        // Calculate user ratio
        const teachers = users.filter((user) => user.role === "teacher").length;
        const students = users.filter((user) => user.role === "student").length;
        const admins = users.filter((user) => user.role === "admin").length;
        setStats({
          totalUsers: users.length,
          totalCourses: courses.length,
          totalBooks: books.length,
          totalteachers: teachers,
          totalstudents: students,
          totaladmins: admins,
          userRatio: {
            teachers,
            students,
            admins,
          },
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto relative z-10">
        <Header title="Overview" />
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Overview" />
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Total Users */}
          <StatCard
            icon={Users}
            name="Total Users"
            value={stats.totalUsers}
            color="text-indigo-500"
          />
          <StatCard
            icon={Users}
            name="Total Teachers"
            value={stats.totalteachers}
            color="text-indigo-500"
          />
          <StatCard
            icon={Users}
            name="Total Students"
            value={stats.totalstudents}
            color="text-indigo-500"
          />
          <StatCard
            icon={Users}
            name="Total Admins"
            value={stats.totaladmins}
            color="text-indigo-500"
          />

          {/* Total Courses */}
          <StatCard
            icon={GraduationCap}
            name="Total Courses"
            value={stats.totalCourses}
            color="text-indigo-500"
          />

          {/* Total Books */}
          <StatCard
            icon={BookOpen}
            name="Total Books"
            value={stats.totalBooks}
            color="text-indigo-500"
          />
        </div>

        {/* User Ratio Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UserRatioChart
            teachers={stats.userRatio.teachers}
            students={stats.userRatio.students}
            admins={stats.userRatio.admins}
          />
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
