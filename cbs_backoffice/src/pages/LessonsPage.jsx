import { useState, useEffect } from "react";
import { BookOpenText, BookOpenTextIcon } from "lucide-react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import LessonsTable from "../components/lessons/LessonsTable";
import { GetCourses } from "../services/CourseManagement";
import LoadingSpinner from "../components/common/LoadingSpinner";

const LessonsPage = () => {
  const [LessonsStats, setLessonsStats] = useState({ totalLessons: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Function to update stats
  const updateLessonsStats = (lessons) => {
    setLessonsStats({ totalLessons: lessons.length });
  };

  // Fetch courses initially
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const lessons = await GetCourses();
        updateLessonsStats(lessons);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessons();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto relative z-10">
        <Header title="Lessons" />
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Lessons" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        {/* STATS */}
        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          {LessonsStats.totalLessons > 0 && (
            <StatCard
              name="Total Lessons"
              icon={BookOpenText}
              value={LessonsStats.totalLessons.toLocaleString()}
              color="#6366F1"
            />
          )}
        </motion.div>

        <LessonsTable updateLessonsStats={LessonsStats} />
      </main>
    </div>
  );
};

export default LessonsPage;
