import { useState, useEffect } from "react";
import { Route, Routes, Navigate } from "react-router-dom";

import { supabase } from "./lib/supabase";
import Sidebar from "./components/common/Sidebar";
import OverviewPage from "./pages/OverviewPage";
import CoursesPage from "./pages/CoursesPage";
import UsersPage from "./pages/UserPage";
import StudentPage from "./pages/StudentPage";
import TeacherPage from "./pages/TeacherPage";
import BooksPage from "./pages/BooksPage";
import BlogsPage from "./pages/BlogsPage";
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
        <Route path="/blogs" element={<BlogsPage />} />
        <Route path="/account-info" element={<AccountInfoPage />} />
      </Routes>
    </div>
  </div>
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          localStorage.removeItem("authToken");
          localStorage.setItem("auth", "false");
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        localStorage.setItem("authToken", session.access_token);
        localStorage.setItem("auth", "true");

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role) {
          localStorage.setItem("role", JSON.stringify(profile.role));
        }

        setIsAuthenticated(true);
      } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem("authToken");
        localStorage.setItem("auth", "false");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    let subscription;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!session) {
            localStorage.removeItem("authToken");
            localStorage.setItem("auth", "false");
            setIsAuthenticated(false);
          } else {
            localStorage.setItem("authToken", session.access_token);
            localStorage.setItem("auth", "true");
            setIsAuthenticated(true);
          }
        }
      );
      subscription = data.subscription;
    } catch (_) {
      subscription = null;
    }

    return () => subscription?.unsubscribe();
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
