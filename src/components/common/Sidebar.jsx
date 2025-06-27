import {
  BarChart2,
  Book,
  BookCopyIcon,
  BookOpen,
  Menu,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  UserCircle,
  DoorOpen
} from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

const userRole = JSON.parse(localStorage.getItem("role"));
const SIDEBAR_ITEMS = [];
if (userRole === "admin") {
  SIDEBAR_ITEMS.push(
    { name: "Overview", icon: BarChart2, color: "#6366f1", href: "/overview" },
    { name: "Users", icon: Users, color: "#EC4899", href: "/users" },
    { name: "Students", icon: Users, color: "#EC48FC", href: "/students" },
    { name: "Teachers", icon: Users, color: "#EC8899", href: "/teachers" },
    { name: "Courses", icon: BookCopyIcon, color: "#8B5CF6", href: "/course" },
    { name: "Books", icon: Book, color: "#F59E0B", href: "/books" },
    {
      name: "Account Info",
      icon: UserCircle,
      color: "#6366f1",
      href: "/account-info",
    }
  );
} else {
  SIDEBAR_ITEMS.push(
    { name: "Students", icon: Users, color: "#EC48FC", href: "/students" },
    { name: "Teachers", icon: Users, color: "#EC8899", href: "/teachers" },
    { name: "Courses", icon: BookCopyIcon, color: "#8B5CF6", href: "/course" },
    { name: "Books", icon: Book, color: "#F59E0B", href: "/books" },
    {
      name: "Account Info",
      icon: UserCircle,
      color: "#6366f1",
      href: "/account-info",
    }
  );
}

const Sidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <motion.div
      className={`relative z-10 transition-all duration-300 ease-in-out flex-shrink-0 ${
        isSidebarOpen ? "w-64" : "w-20"
      }`}
      animate={{ width: isSidebarOpen ? 256 : 80 }}
    >
      <div className="h-full bg-primary-500 bg-opacity-50 backdrop-blur-md p-4 flex flex-col border-r border-primary-900">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-full hover:bg-gray-700 transition-colors max-w-fit"
        >
          <Menu size={24} />
        </motion.button>

        <nav className="mt-8 flex-grow">
          {SIDEBAR_ITEMS.map((item) => (
            <Link key={item.href} to={item.href}>
              <motion.div className="flex items-center p-4 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors mb-2">
                <item.icon
                  size={20}
                  style={{ color: item.color, minWidth: "20px" }}
                />
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      className="ml-4 whitespace-nowrap"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, delay: 0.3 }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          ))}
        </nav>
        {/* Logout Button */}
        <div className="p-4">
          <motion.div
            className="flex items-center p-4 text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors mb-2 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
          >
            <DoorOpen size={20} style={{ color: '#EF4444', minWidth: '20px' }} />
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  className="ml-4 whitespace-nowrap"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, delay: 0.3 }}
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
export default Sidebar;
