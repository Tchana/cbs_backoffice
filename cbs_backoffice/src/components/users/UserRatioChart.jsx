import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import PropTypes from "prop-types";

const COLORS = ["#8884d8", "#82ca9d", "#ff7f50"]; // Colors for Teachers, Students, Admins

const UserRatioChart = ({ teachers, students }) => {
  // Create data array for the chart
  const userStats = [
    { name: "Teachers", value: teachers || 0 },
    { name: "Students", value: students || 0 },
  ].filter((entry) => entry.value > 0); // Filter out zero values

  // Compute total users for percentage calculation
  const totalUsers = userStats.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 lg:col-span-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h2 className="text-xl font-semibold text-gray-100 mb-4">
        User Role Distribution
      </h2>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={userStats}
              cx="50%"
              cy="50%"
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              label={({ name, value }) =>
                `${name} ${
                  totalUsers > 0 ? ((value / totalUsers) * 100).toFixed(0) : 0
                }%`
              }
            >
              {userStats.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
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

UserRatioChart.propTypes = {
  teachers: PropTypes.number.isRequired,
  students: PropTypes.number.isRequired,
};

export default UserRatioChart;
