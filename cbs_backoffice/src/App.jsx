import { useState, useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";

import Sidebar from "./components/common/Sidebar";

import OverviewPage from "./pages/OverviewPage";
import CoursesPage from "./pages/CoursesPage";
import UsersPage from "./pages/UserPage";
import BooksPage from "./pages/BooksPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./components/authentication/LoginSignup";

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Ensure auth is set in localStorage and retrieve its value
    const authStatus = JSON.parse(localStorage.getItem("auth") || "false");
    setIsAuthenticated(authStatus);

    // Redirect to login if not authenticated
    if (!authStatus) {
      navigate("/login");
    }
  }, []);

  return isAuthenticated ? (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
        <div className="absolute inset-0 backdrop-blur-sm" />
      </div>

      <Sidebar />
      <Routes>
        
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/course" element={<CoursesPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </div>
  ) : (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
    </Routes>
  );
}

export default App;
