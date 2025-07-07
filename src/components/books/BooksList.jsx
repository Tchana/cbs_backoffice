import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, RefreshCw } from "lucide-react";
import { GetBooks, AddBook } from "../../services/BookManagement";
import BookRegistrationModal from "./BookRegistrationModal";

const BookList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [bookData, setBookData] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [editValues, setEditValues] = useState({
    title: "",
    category: "",
    author: "",
    language: "",
    bookCover: null,
    book: null,
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const books = await GetBooks();
      setBookData(books);
      setFilteredBooks(books);
    } catch (err) {
      console.error("Error fetching books:", err);
      setError("Failed to load books. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = bookData.filter(
      (book) =>
        book.title.toLowerCase().includes(term) ||
        book.category.toLowerCase().includes(term)
    );
    setFilteredBooks(filtered);
  };

  const handleInputChange = (e, field) => {
    if (field === "bookCover" || field === "book") {
      setEditValues({ ...editValues, [field]: e.target.files[0] });
    } else {
      setEditValues({ ...editValues, [field]: e.target.value });
    }
  };

  const handleRegistrationClick = () => {
    setIsRegistering(true);
    setEditValues({
      title: "",
      category: "",
      author: "",
      language: "",
      bookCover: null,
      book: null,
    });
  };

  const handleCloseModal = () => {
    setIsRegistering(false);
    setEditValues({
      title: "",
      category: "",
      author: "",
      language: "",
      bookCover: null,
      book: null,
    });
  };

  const handleConfirmRegistration = async () => {
    try {
      // const formData = new FormData();
      // formData.append("title", editValues.title);
      // formData.append("category", editValues.category);
      // formData.append("author", editValues.author);
      // formData.append("language", editValues.language);
      // if (editValues.bookCover) {
      //   formData.append("bookCover", editValues.bookCover);
      // }
      // if (editValues.book) {
      //   formData.append("book", editValues.book);
      // }

      await AddBook(
        editValues.title,
        editValues.author,
        editValues.book,
        editValues.category,
        editValues.bookCover,
        editValues.description,
        editValues.language
      );
      await refreshData(); // Refresh the book list
      handleCloseModal();
    } catch (error) {
      console.error("Error adding book:", error);
      setError("Failed to add book. Please try again.");
    }
  };

  const openBook = (bookUrl) => {
    window.open(bookUrl, "_self");
  };

  if (isLoading) {
    return (
      <motion.div
        className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="text-white text-xl">Loading books...</div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="text-red-500 text-center">
          <p className="text-xl mb-2">Error</p>
          <p>{error}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Books</h2>
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search books..."
              className="bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>
          <button
            onClick={refreshData}
            className="text-green-400 hover:text-green-300"
            title="Refresh data"
          >
            <RefreshCw size={24} />
          </button>
          <button
            onClick={handleRegistrationClick}
            className="text-indigo-400 hover:text-indigo-300"
            title="Add Book"
          >
            <Plus size={30} />
          </button>
        </div>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {isRegistering && (
          <BookRegistrationModal
            onClose={handleCloseModal}
            onRegister={handleConfirmRegistration}
            editValues={editValues}
            handleInputChange={handleInputChange}
          />
        )}
      </AnimatePresence>

      <div className="overflow-x-auto p-4">
        {filteredBooks.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📚</div>
              <p className="text-gray-400 text-lg">No books found. Click the + button to add a new book.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <motion.div
                key={book.uuid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col"
              >
                {/* Book Cover */}
                <div className="h-48 overflow-hidden flex items-center justify-center bg-gray-800">
                  <img
                    src={book.bookCover || "/default-order.png"}
                    alt={book.title}
                    className="h-full object-contain"
                  />
                </div>
                {/* Book Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{book.title}</h3>
                  <div className="flex flex-col gap-1 text-gray-400 text-sm mb-3">
                    <span>Author: {book.author || '-'}</span>
                    <span>Category: {book.category}</span>
                    <span>Language: {book.language}</span>
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={() => openBook(book.book)}
                      className="text-indigo-400 hover:text-indigo-300 mt-3 mx-auto flex justify-center"
                    >
                      View Book
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BookList;
