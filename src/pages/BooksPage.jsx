import { useState, useEffect } from "react";
import { BookOpen, Globe, Lock } from "lucide-react";
import { motion } from "framer-motion";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import BookList from "../components/books/BooksList";
import { GetBooks } from "../services/BookManagement";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useApiLoader } from "../contexts/ApiLoaderContext";

const BooksPage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [bookStats, setBookStats] = useState({
    totalBooks: 0,
    publicBooks: 0,
    subscriberBooks: 0,
    categories: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const updateBookStats = (books) => {
    const list = Array.isArray(books) ? books : [];
    const categories = new Set(
      list.map((b) => b.category).filter((c) => c && String(c).trim())
    );
    setBookStats({
      totalBooks: list.length,
      publicBooks: list.filter((b) => (b.accessTier || "public") === "public").length,
      subscriberBooks: list.filter((b) => b.accessTier === "subscriber").length,
      categories: categories.size,
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const books = await runWithLoader(() => GetBooks());
        updateBookStats(books);
      } catch (error) {
        console.error("Error fetching books:", error);
        updateBookStats([]);
      } finally {
        setIsLoading(false);
      }
    };
    load().catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto relative z-10">
        <Header title="Books" />
        <LoadingSpinner fullScreen />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Books" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StatCard
            name="Total Books"
            icon={BookOpen}
            value={bookStats.totalBooks.toLocaleString()}
            color="#D97706"
          />
          <StatCard
            name="Public"
            icon={Globe}
            value={bookStats.publicBooks.toLocaleString()}
            color="#10B981"
          />
          <StatCard
            name="Subscriber only"
            icon={Lock}
            value={bookStats.subscriberBooks.toLocaleString()}
            color="#F59E0B"
          />
          <StatCard
            name="Categories"
            icon={BookOpen}
            value={bookStats.categories.toLocaleString()}
            color="#6366F1"
          />
        </motion.div>

        <BookList updateBookStats={updateBookStats} />
      </main>
    </div>
  );
};

export default BooksPage;
