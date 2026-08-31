import {
  BarChart2,
  Book,
  BookCopyIcon,
  BookOpen,
  Menu,
  Settings,
  TrendingUp,
  Users,
  UserCircle,
  DoorOpen,
  FileText,
  BookOpenCheck
  ,
  Bell
  ,
  MessageSquare
  ,
  ChevronDown,
  Wallet
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { isAdmin } from "../../lib/auth";

const ADMIN_SIDEBAR_ITEMS = [
  { name: "Overview", icon: BarChart2, color: "#6366f1", href: "/overview" },
  { name: "Admin", icon: Users, color: "#EC4899", href: "/admin" },
  { name: "Users", icon: Users, color: "#EC48FC", href: "/users" },
  { name: "Teachers", icon: Users, color: "#EC8899", href: "/teachers" },
  { name: "Courses", icon: BookCopyIcon, color: "#8B5CF6", href: "/course" },
  { name: "Lessons", icon: BookOpenCheck, color: "#8B5CF6", href: "/lessons" },
  { name: "Books", icon: Book, color: "#F59E0B", href: "/books" },
  { name: "Blogs", icon: FileText, color: "#10B981", href: "/blogs" },
  { name: "Announcements", icon: Bell, color: "#F59E0B", href: "/announcements" },
  { name: "Forum", icon: MessageSquare, color: "#06B6D4", href: "/forum" },
  { name: "Finance", icon: Wallet, color: "#10B981", href: "/finance" },
  {
    name: "Account Info",
    icon: UserCircle,
    color: "#6366f1",
    href: "/account-info",
  },
];

const TEACHER_SIDEBAR_ITEMS = [
  { name: "Users", icon: Users, color: "#EC48FC", href: "/users" },
  { name: "Teachers", icon: Users, color: "#EC8899", href: "/teachers" },
  { name: "Courses", icon: BookCopyIcon, color: "#8B5CF6", href: "/course" },
  { name: "Lessons", icon: BookOpenCheck, color: "#8B5CF6", href: "/lessons" },
  { name: "Books", icon: Book, color: "#F59E0B", href: "/books" },
  { name: "Blogs", icon: FileText, color: "#10B981", href: "/blogs" },
  { name: "Announcements", icon: Bell, color: "#F59E0B", href: "/announcements" },
  { name: "Forum", icon: MessageSquare, color: "#06B6D4", href: "/forum" },
  {
    name: "Account Info",
    icon: UserCircle,
    color: "#6366f1",
    href: "/account-info",
  },
];

const Sidebar = () => {
  const sidebarItems = isAdmin() ? ADMIN_SIDEBAR_ITEMS : TEACHER_SIDEBAR_ITEMS;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const navRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const updateScrollIndicator = () => {
    const navEl = navRef.current;
    if (!navEl) return;
    const hasMoreBelow =
      navEl.scrollTop + navEl.clientHeight < navEl.scrollHeight - 2;
    setCanScrollDown(hasMoreBelow);
  };

  useEffect(() => {
    updateScrollIndicator();
    const onResize = () => updateScrollIndicator();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isSidebarOpen]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleNavScroll = () => {
    updateScrollIndicator();
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 700);
  };

  return (
    <motion.div
      className={`relative z-10 transition-all duration-300 ease-in-out flex-shrink-0 ${
        isSidebarOpen ? "w-64" : "w-20"
      }`}
      animate={{ width: isSidebarOpen ? 256 : 80 }}
    >
      <div className="h-screen bg-primary-500 bg-opacity-50 backdrop-blur-md p-4 flex flex-col border-r border-primary-900 overflow-hidden">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-full hover:bg-gray-700 transition-colors max-w-fit"
        >
          <Menu size={24} />
        </motion.button>

        <div className="mt-8 flex-grow min-h-0 relative">
          <nav
            ref={navRef}
            onScroll={handleNavScroll}
            className={`h-full -mr-4 pr-4 overflow-y-auto scrollbar-auto-hide ${
              isScrolling ? "scrollbar-visible" : ""
            }`}
          >
            {sidebarItems.map((item) => (
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
          {canScrollDown && (
            <div className="pointer-events-none absolute bottom-0 right-0 left-0 h-10 bg-gradient-to-t from-gray-900/60 to-transparent flex items-end justify-center pb-1">
              <ChevronDown size={14} className="text-gray-400 animate-bounce" />
            </div>
          )}
        </div>
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
