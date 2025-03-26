import { useState, useEffect } from "react";
import { Route, Routes, useNavigate, Navigate } from "react-router-dom";

import Sidebar from "./components/common/Sidebar";

import OverviewPage from "./pages/OverviewPage";
import CoursesPage from "./pages/CoursesPage";
import UsersPage from "./pages/UserPage";
import StudentPage from "./pages/StudentPage";
import TeacherPage from "./pages/TeacherPage";
import BooksPage from "./pages/BooksPage";
import AuthPage from "./components/authentication/LoginSignup";
import AccountInfoPage from "./pages/AccountInfoPage";

// Layout component for authenticated routes
const AuthenticatedLayout = () => (
  <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden">
    <div className="fixed inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
      <div className="absolute inset-0 backdrop-blur-sm" />
    </div>
    <Sidebar />
    <div className="flex-1 overflow-auto relative z-10">
      <Routes>
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/students" element={<StudentPage />} />
        <Route path="/teachers" element={<TeacherPage />} />
        <Route path="/course" element={<CoursesPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/account-info" element={<AccountInfoPage />} />
      </Routes>
    </div>
  </div>
);

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const authToken = localStorage.getItem("authToken");
      const authStatus = localStorage.getItem("auth") === "true";

      setIsAuthenticated(authStatus && !!authToken);
      setIsLoading(false);

      if (!authStatus || !authToken) {
        localStorage.removeItem("authToken");
        localStorage.setItem("auth", "false");
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !isAuthenticated ? <AuthPage /> : <Navigate to="/overview" replace />
        }
      />

      {/* Protected Routes */}
      {isAuthenticated ? (
        <>
          <Route path="/*" element={<AuthenticatedLayout />} />
          <Route path="/" element={<Navigate to="/overview" replace />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default App;
