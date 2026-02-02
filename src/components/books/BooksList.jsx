import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, RefreshCw, Edit, Trash2 } from "lucide-react";
import { GetBooks, AddBook, EditBook, DeleteBook } from "../../services/BookManagement";
import BookRegistrationModal from "./BookRegistrationModal";

import { isAdmin } from "../../lib/auth";
import { useApiLoader } from "../../contexts/ApiLoaderContext";

const BookList = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [searchTerm, setSearchTerm] = useState("");
  const [bookData, setBookData] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editValues, setEditValues] = useState({
    title: "",
    category: "",
    author: "",
    language: "",
    description: "",
    bookCover: null,
    book: null,
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      setIsLoading(true);
      const books = await runWithLoader(() => GetBooks());
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
    setEditingBook(null);
    setIsRegistering(true);
    setEditValues({
      title: "",
      category: "",
      author: "",
      language: "",
      description: "",
      bookCover: null,
      book: null,
    });
  };

  const handleEditClick = (book) => {
    setEditingBook(book);
    setEditValues({
      title: book.title ?? "",
      category: book.category ?? "",
      author: book.author ?? "",
      language: book.language ?? "",
      description: book.description ?? "",
      bookCover: null,
      book: null,
    });
  };

  const handleCloseModal = () => {
    setIsRegistering(false);
    setEditingBook(null);
    setEditValues({
      title: "",
      category: "",
      author: "",
      language: "",
      description: "",
      bookCover: null,
      book: null,
    });
  };

  const handleDeleteClick = (book) => {
    setBookToDelete(book.id);
  };

  const handleConfirmDelete = async () => {
    if (!bookToDelete) return;
    setIsDeleting(true);
    try {
      await runWithLoader(() => DeleteBook(bookToDelete));
      await refreshData();
      setBookToDelete(null);
    } catch (err) {
      console.error("Error deleting book:", err);
      setError("Failed to delete book. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmRegistration = async () => {
    try {
      await runWithLoader(() =>
        AddBook(
        editValues.title,
        editValues.author,
        editValues.book,
        editValues.category,
        editValues.bookCover,
        editValues.description,
        editValues.language
        )
      );
      await refreshData();
      handleCloseModal();
    } catch (err) {
      console.error("Error adding book:", err);
      setError("Failed to add book. Please try again.");
    }
  };

  const handleConfirmEdit = async () => {
    if (!editingBook) return;
    try {
      await runWithLoader(() =>
        EditBook(
        editingBook.id,
        editValues.title,
        editValues.author,
        editValues.category,
        editValues.bookCover,
        editValues.book,
        editValues.description,
        editValues.language
        )
      );
      await refreshData();
      handleCloseModal();
    } catch (err) {
      console.error("Error editing book:", err);
      setError("Failed to edit book. Please try again.");
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
          {isAdmin() && (
            <button
              onClick={handleRegistrationClick}
              className="text-indigo-400 hover:text-indigo-300"
              title="Add Book"
            >
              <Plus size={30} />
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(isRegistering || editingBook) && (
          <BookRegistrationModal
            onClose={handleCloseModal}
            onRegister={editingBook ? handleConfirmEdit : handleConfirmRegistration}
            editValues={editValues}
            handleInputChange={handleInputChange}
            title={editingBook ? "Edit Book" : "Add New Book"}
            submitLabel={editingBook ? "Save" : "Add Book"}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {bookToDelete && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isDeleting && setBookToDelete(null)}
              aria-hidden
            />
            <motion.div
              className="bg-gray-800 rounded-xl p-6 w-full max-w-sm relative z-[10000] border border-gray-700"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            >
              <p className="text-gray-200 mb-4">Delete this book? This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setBookToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-gray-300 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
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
                    <span>Author: {book.author || "-"}</span>
                    <span>Category: {book.category}</span>
                    <span>Language: {book.language}</span>
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    <button
                      onClick={() => openBook(book.book)}
                      className="text-indigo-400 hover:text-indigo-300 mt-3 mx-auto flex justify-center"
                    >
                      Read Book
                    </button>
                    {isAdmin() && (
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(book)}
                          className="p-2 text-indigo-400 hover:text-indigo-300 rounded-lg hover:bg-gray-600"
                          title="Edit book"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(book)}
                          className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-600"
                          title="Delete book"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
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
