import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useState, useEffect } from "react";

const COLORS = ["#8884d8", "#82ca9d", "#ff7f50"]; // Colors for Teachers, Students, Admins

const UsersRatioChart = ({ users }) => {
	// State for user statistics
	const [userStats, setUserStats] = useState([
		{ name: "Teachers", value: 0 },
		{ name: "Students", value: 0 },
		{ name: "Admins", value: 0 }
	]);

	// Update state whenever the `users` prop changes
	useEffect(() => {
		setUserStats([
			{ name: "Teachers", value: users.teachers || 0 },
			{ name: "Students", value: users.students || 0 },
			{ name: "Admins", value: users.admins || 0 }
		]);
	}, [users]); // Runs only when `users` changes

	// **Filter out zero values**
	const filteredStats = userStats.filter(entry => entry.value > 0);
	
	// Compute total users for percentage calculation
	const totalUsers = filteredStats.reduce((sum, entry) => sum + entry.value, 0);

	return (
		<motion.div
			className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 lg:col-span-2"
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.5 }}
		>
			<h2 className="text-xl font-semibold text-gray-100 mb-4">User Role Distribution</h2>
			<div style={{ width: "100%", height: 300 }}>
				<ResponsiveContainer>
					<PieChart>
						<Pie
							data={filteredStats} // Use the filtered data
							cx="50%"
							cy="50%"
							outerRadius={100}
							fill="#8884d8"
							dataKey="value"
							label={({ name, value }) => 
								`${name} ${totalUsers > 0 ? ((value / totalUsers) * 100).toFixed(0) : 0}%`
							}
						>
							{filteredStats.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
							))}
						</Pie>
						<Tooltip
							contentStyle={{
								backgroundColor: "rgba(31, 41, 55, 0.8)",
								borderColor: "#4B5563",
							}}
							itemStyle={{ color: "#E5E7EB" }}
						/>
						<Legend />
					</PieChart>
				</ResponsiveContainer>
			</div>
		</motion.div>
	);
};

export default UsersRatioChart;
