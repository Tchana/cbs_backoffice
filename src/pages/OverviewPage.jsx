import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, BookOpen, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GetCourses } from "../services/CourseManagement";
import { GetUsers } from "../services/UsersManagement";
import { GetBooks } from "../services/BookManagement";
import UserRatioChart from "../components/users/UserRatioChart";
import StatCard from "../components/common/StatCard";
import Header from "../components/common/Header";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { isAdmin } from "../lib/auth";
import { useApiLoader } from "../contexts/ApiLoaderContext";

const OverviewPage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalBooks: 0,
    totalteachers: 0,
    totalstudents: 0,
    totaladmins: 0,
    userRatio: {
      teachers: 0,
      students: 0,
      admins: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Fetch stats initially
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [users, courses, books] = await runWithLoader(() =>
          Promise.all([GetUsers(), GetCourses(), GetBooks()])
        );

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
        setFetchError(null);
      } catch (error) {
        console.error("Error fetching stats:", error);
        setFetchError(error?.message || "Unable to load overview. You may not have permission.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats().catch((err) => {
      console.error("Overview fetchStats failed", err);
      setFetchError(err?.message || "Unable to load overview.");
      setIsLoading(false);
    });
  }, []);

  if (!isAdmin()) return <Navigate to="/course" replace />;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto relative z-10">
        <Header title="Overview" />
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex-1 overflow-auto relative z-10">
        <Header title="Overview" />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-4 text-amber-200">
            <p className="font-medium">Could not load overview</p>
            <p className="text-sm mt-1">{fetchError}</p>
            <p className="text-sm mt-2 text-amber-300/90">
              If you see a 403 error, ensure your user has a profile row in the database with role = &quot;admin&quot; (Table Editor → profiles).
            </p>
          </div>
        </div>
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
            onClick={() => navigate("/users")}
          />
          <StatCard
            icon={Users}
            name="Total Teachers"
            value={stats.totalteachers}
            color="text-indigo-500"
            onClick={() => navigate("/teachers")}
          />
          <StatCard
            icon={Users}
            name="Total Students"
            value={stats.totalstudents}
            color="text-indigo-500"
            onClick={() => navigate("/students")}
          />
          <StatCard
            icon={Users}
            name="Total Admins"
            value={stats.totaladmins}
            color="text-indigo-500"
            onClick={() => navigate("/users")}
          />

          {/* Total Courses */}
          <StatCard
            icon={GraduationCap}
            name="Total Courses"
            value={stats.totalCourses}
            color="text-indigo-500"
            onClick={() => navigate("/course")}
          />

          {/* Total Books */}
          <StatCard
            icon={BookOpen}
            name="Total Books"
            value={stats.totalBooks}
            color="text-indigo-500"
            onClick={() => navigate("/books")}
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
