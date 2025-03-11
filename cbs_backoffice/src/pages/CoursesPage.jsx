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
        <div className='flex-1 overflow-auto relative z-10'>
            <Header title='Courses' />

            <main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
                {/* STATS */}
                <motion.div
                    className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                >
                    {courseStats.totalCourses > 0 && (
                        <StatCard 
                            name='Total Courses' 
                            icon={BookIcon} 
                            value={courseStats.totalCourses.toLocaleString()} 
                            color='#6366F1' 
                        />
                    )}
                </motion.div>

                <CoursesTable updateCourseStats={updateCourseStats} />

            </main>
        </div>
    );
};

export default CoursesPage;
