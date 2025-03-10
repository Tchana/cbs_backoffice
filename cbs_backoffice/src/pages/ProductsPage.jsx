import { useState, useEffect } from "react";
import { UsersIcon } from "lucide-react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import UsersTable from "../components/users/UserTable";
import UsersRatioChart from "../components/users/UserDemographicsChart"; 
import { Users } from "../services/apiservice"; // Ensure this fetches the latest users list

const courePage = () => {
    const [courseStats, setCourseStats] = useState({
        totalCourses: 0,
        teachers: 0,
        students: 0,
        admins: 0,
    });

    // Function to update stats whenever users change
    const updateUserStats = (users) => {
        setCourseStats({
            totalCourses: users.length,
            teachers: users.filter(user => user.role === "teacher").length,
            students: users.filter(user => user.role === "student").length,
            admins: users.filter(user => user.role === "admin").length,
        });
    };

    // Fetch users initially
    useEffect(() => {
        const fetchUsers = async () => {
            const users = await Users();
            updateUserStats(users);
        };
        fetchUsers();
    }, []);

    return (
        <div className='flex-1 overflow-auto relative z-10'>
            <Header title='Users' />

            <main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
                {/* STATS */}
                <motion.div
                    className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                >
                    {courseStats.totalCourses === 0 ? null : (
                        <StatCard name='Total Users' icon={UsersIcon} value={courseStats.totalCourses.toLocaleString()} color='#6366F1' />
                    )}
                    {courseStats.teachers === 0 ? null : (
                        <StatCard name='Teachers' icon={UsersIcon} value={courseStats.teachers.toLocaleString()} color='#6366F1' />
                    )}
                    {courseStats.students === 0 ? null : (
                        <StatCard name='Students' icon={UsersIcon} value={courseStats.students.toLocaleString()} color='#6366F1' />
                    )}
                    {courseStats.admins === 0 ? null : (
                        <StatCard name='Admin' icon={UsersIcon} value={courseStats.admins.toLocaleString()} color='#6366F1' />
                    )}
                </motion.div>

                <UsersTable updateUserStats={updateUserStats} />

                {/* USER CHARTS */}
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8'>
                    <UsersRatioChart users={courseStats} /> {/* Include UsersRatioChart here */}
                </div>
            </main>
        </div>
    );
};

export default courePage;
