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

        <BookList />
      </main>
    </div>
  );
};
export default BooksPage;
