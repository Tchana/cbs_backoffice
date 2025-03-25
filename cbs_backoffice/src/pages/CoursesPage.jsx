import { useState, useEffect } from "react";
import { BookIcon } from "lucide-react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import CoursesTable from "../components/courses/CoursesTable";
import { GetCourses } from "../services/CourseManagement";

const CoursesPage = () => {
  const [courseStats, setCourseStats] = useState({ totalCourses: 0 });

  // Function to update stats
  const updateCourseStats = (courses) => {
    setCourseStats({ totalCourses: courses.length });
  };

  // Fetch courses initially
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const courses = await GetCourses();
        updateCourseStats(courses);
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Courses" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">

        <CoursesTable updateCourseStats={updateCourseStats} />
      </main>
    </div>
  );
};

export default CoursesPage;
