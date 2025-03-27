import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus } from "lucide-react";
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
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
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
      await fetchBooks(); // Refresh the book list
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
        <h2 className="text-xl font-semibold text-gray-100">Book List</h2>
        <div className="flex items-center space-x-4">
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
            onClick={handleRegistrationClick}
            className="text-indigo-400 hover:text-indigo-300"
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
            <img
              src="/default-image.png"
              alt="No Books"
              className="w-48 h-48 opacity-50"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredBooks.map((book) => (
              <motion.div
                key={book.uuid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="p-4 shadow-md"
              >
                <div className="flex justify-center">
                  <img
                    src={book.bookCover || "/default-order.png"}
                    alt={book.title}
                    className="w-24 h-24 rounded-md bg-transparent"
                  />
                </div>
                <div className="mt-4 text-center justify-center">
                  <h3 className="text-gray-100 text-sm font-medium">
                    {book.title}
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Category: {book.category}
                  </p>
                  {book.author && (
                    <p className="text-gray-400 text-xs">
                      Author: {book.author}
                    </p>
                  )}
                  <p className="text-gray-300 text-sm font-semibold mt-2">
                    Language: {book.language}
                  </p>
                  <button
                    onClick={() => openBook(book.book)}
                    className="text-indigo-400 hover:text-indigo-300 mt-3 mx-auto flex justify-center"
                  >
                    View Book
                  </button>
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
