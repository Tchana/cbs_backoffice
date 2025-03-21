import { CheckCircle, Clock, DollarSign, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { GetBooks } from "../services/BookManagement";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import BookList from "../components/books/BooksList";
import { useEffect } from "react";

const BooksPage = () => {
  const [bookStats, setBookStats] = useState({ totalBooks: 0 });

  const updateBookStats = (books) => {
    setBookStats({ totalBooks: books.length });
  };

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const books = await GetBooks();
        updateBookStats(books);
      } catch (error) {
        console.error("Error fetching books:", error);
      }
    };
    fetchBooks();
  }, []);

  return (
    <div className="flex-1 relative z-10 overflow-auto">
      <Header title={"Books"} />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <StatCard
            name="Total Books"
            icon={ShoppingBag}
            value={bookStats.totalBooks}
            color="#6366F1"
          />
        </motion.div>

        <BookList />
      </main>
    </div>
  );
};
export default BooksPage;
