import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Globe,
  Lock,
  ExternalLink,
} from "lucide-react";
import {
  GetBooks,
  AddBook,
  EditBook,
  DeleteBook,
  GetBookCategories,
} from "../../services/BookManagement";
import BookRegistrationModal from "./BookRegistrationModal";
import BookViewModal from "./BookViewModal";
import LoadingSpinner from "../common/LoadingSpinner";

import { isAdmin } from "../../lib/auth";
import { useApiLoader } from "../../contexts/ApiLoaderContext";

/** Portrait ratio used in the mobile app (100×140). */
const COVER_ASPECT = "aspect-[5/7]";

const accessBadge = (tier) => {
  if (tier === "subscriber") {
    return {
      label: "Subscriber",
      className: "border-amber-800/70 bg-amber-900/35 text-amber-300",
      Icon: Lock,
    };
  }
  return {
    label: "Public",
    className: "border-emerald-800/70 bg-emerald-900/35 text-emerald-300",
    Icon: Globe,
  };
};

const BookCover = ({ src, title, className = "" }) => (
  <div
    className={`${COVER_ASPECT} overflow-hidden rounded-lg border border-gray-600/80 bg-gray-900 shadow-md ${className}`}
  >
    {src ? (
      <img
        src={src}
        alt={title ? `${title} cover` : "Book cover"}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-gray-800 to-gray-900 text-amber-500/60">
        <BookOpen size={28} strokeWidth={1.5} />
        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          No cover
        </span>
      </div>
    )}
  </div>
);

const BookList = ({ updateBookStats }) => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [bookData, setBookData] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoryLoadError, setCategoryLoadError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [viewingBook, setViewingBook] = useState(null);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editValues, setEditValues] = useState({
    title: "",
    category: "",
    author: "",
    language: "",
    description: "",
    bookCover: null,
    bookCoverUrl: null,
    book: null,
    accessTier: "public",
  });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    refreshData();
    loadCategoryOptions();
  }, []);

  useEffect(() => {
    let list = bookData;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (book) =>
          book.title?.toLowerCase().includes(term) ||
          book.author?.toLowerCase().includes(term) ||
          book.category?.toLowerCase().includes(term) ||
          book.language?.toLowerCase().includes(term)
      );
    }
    if (categoryFilter) {
      list = list.filter((book) => book.category === categoryFilter);
    }
    setFilteredBooks(list);
  }, [searchTerm, categoryFilter, bookData]);

  const loadCategoryOptions = async () => {
    try {
      setCategoryLoadError("");
      const categories = await GetBookCategories();
      setCategoryOptions(categories);
    } catch (err) {
      console.error("Error loading book categories:", err);
      setCategoryOptions([]);
      setCategoryLoadError("Failed to load categories from Supabase.");
    }
  };

  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const books = await runWithLoader(() => GetBooks());
      setBookData(books);
      setFilteredBooks(books);
      if (typeof updateBookStats === "function") updateBookStats(books);
    } catch (err) {
      console.error("Error fetching books:", err);
      setError("Failed to load books. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e, field) => {
    if (field === "bookCover" || field === "book") {
      setEditValues((prev) => ({ ...prev, [field]: e.target.files[0] }));
      setFormError("");
    } else {
      setEditValues((prev) => ({ ...prev, [field]: e.target.value }));
    }
  };

  const resetForm = () => ({
    title: "",
    category: "",
    author: "",
    language: "",
    description: "",
    bookCover: null,
    bookCoverUrl: null,
    book: null,
    accessTier: "public",
  });

  const handleRegistrationClick = async () => {
    await loadCategoryOptions();
    setEditingBook(null);
    setFormError("");
    setIsRegistering(true);
    setEditValues(resetForm());
  };

  const openEditForm = async (book) => {
    await loadCategoryOptions();
    setFormError("");
    setEditingBook(book);
    setIsRegistering(false);
    setEditValues({
      title: book.title ?? "",
      category: book.category ?? "",
      author: book.author ?? "",
      language: book.language ?? "",
      description: book.description ?? "",
      bookCover: null,
      bookCoverUrl: book.bookCover || null,
      book: null,
      accessTier: book.accessTier || "public",
    });
  };

  const handleEditClick = async (book) => {
    setViewingBook(null);
    await openEditForm(book);
  };

  const handleCloseModal = () => {
    setIsRegistering(false);
    setEditingBook(null);
    setFormError("");
    setEditValues(resetForm());
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
    const missingCover = !(editValues.bookCover instanceof File);
    const missingBook = !(editValues.book instanceof File);
    if (missingCover || missingBook) {
      const parts = [];
      if (missingCover) parts.push("book cover");
      if (missingBook) parts.push("book file");
      setFormError(`Please upload ${parts.join(" and ")} before creating the book.`);
      return;
    }

    try {
      setFormError("");
      await runWithLoader(() =>
        AddBook(
          editValues.title,
          editValues.author,
          editValues.book,
          editValues.category,
          editValues.bookCover,
          editValues.description,
          editValues.language,
          editValues.accessTier
        )
      );
      await refreshData();
      handleCloseModal();
    } catch (err) {
      console.error("Error adding book:", err);
      setFormError(err.message || "Failed to add book. Please try again.");
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
          editValues.language,
          editValues.accessTier
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
    if (bookUrl) window.open(bookUrl, "_blank", "noopener,noreferrer");
  };

  if (isLoading) {
    return (
      <motion.div
        className="bg-gray-800/50 backdrop-blur-md shadow-lg rounded-xl p-12 border border-gray-700 flex items-center justify-center min-h-[320px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <LoadingSpinner />
      </motion.div>
    );
  }

  if (error && bookData.length === 0) {
    return (
      <motion.div
        className="bg-gray-800/50 backdrop-blur-md shadow-lg rounded-xl p-8 border border-gray-700 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-red-400 text-lg mb-2">Could not load books</p>
        <p className="text-gray-400 mb-4">{error}</p>
        <button
          type="button"
          onClick={refreshData}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
        >
          Try again
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="bg-gray-800/50 backdrop-blur-md shadow-lg rounded-xl border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-gray-700 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="Search title, author, category…"
              className="w-full rounded-lg bg-gray-700 py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/60 sm:max-w-[180px]"
          >
            <option value="">All categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="mr-1 hidden text-sm text-gray-400 lg:inline">
            {filteredBooks.length} book{filteredBooks.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={refreshData}
            className="rounded-lg p-2 text-green-400 transition-colors hover:bg-gray-700 hover:text-green-300"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          {isAdmin() && (
            <button
              type="button"
              onClick={handleRegistrationClick}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
              title="Add book"
            >
              <Plus size={18} />
              Add book
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(isRegistering || editingBook) && (
          <BookRegistrationModal
            onClose={handleCloseModal}
            onRegister={editingBook ? handleConfirmEdit : handleConfirmRegistration}
            editValues={editValues}
            handleInputChange={handleInputChange}
            categoryOptions={categoryOptions}
            categoryLoadError={categoryLoadError}
            title={editingBook ? "Edit book" : "Add new book"}
            submitLabel={editingBook ? "Save changes" : "Add book"}
            isEdit={Boolean(editingBook)}
            formError={formError}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingBook && (
          <BookViewModal
            book={viewingBook}
            onClose={() => setViewingBook(null)}
            onEdit={isAdmin() ? handleEditClick : undefined}
            canEdit={isAdmin()}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookToDelete && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
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
              className="relative z-[100000] w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl"
              initial={{ scale: 0.97, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 8 }}
            >
              <p className="text-gray-200 mb-1 font-medium">Delete this book?</p>
              <p className="text-sm text-gray-400 mb-5">This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBookToDelete(null)}
                  disabled={isDeleting}
                  className="rounded-lg px-4 py-2 text-sm text-gray-300 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-5 sm:p-6">
        {filteredBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-14 items-center justify-center rounded-lg border border-dashed border-gray-600 bg-gray-900/50">
              <BookOpen className="text-gray-500" size={32} />
            </div>
            <p className="text-lg font-medium text-gray-300">No books found</p>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              {searchTerm || categoryFilter
                ? "Try adjusting your search or category filter."
                : "Add your first book to build the library."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {filteredBooks.map((book, index) => {
              const access = accessBadge(book.accessTier);
              const AccessIcon = access.Icon;

              return (
                <motion.article
                  key={book.uuid}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-700/80 bg-gray-900/40 transition-colors hover:border-gray-600 hover:bg-gray-900/60"
                >
                  <button
                    type="button"
                    onClick={() => setViewingBook(book)}
                    className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 rounded-t-xl"
                  >
                    <div className="p-3 pb-0">
                      <BookCover src={book.bookCover} title={book.title} />
                    </div>
                    <div className="flex flex-1 flex-col p-3 pt-3">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-amber-100">
                        {book.title}
                      </h3>
                      <p className="mt-1 truncate text-xs text-gray-400">
                        {book.author?.trim() || "Unknown author"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {book.category ? (
                          <span className="truncate rounded-md border border-gray-600/80 bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                            {book.category}
                          </span>
                        ) : null}
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${access.className}`}
                        >
                          <AccessIcon size={10} />
                          {access.label}
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="mt-auto flex items-center justify-between gap-1 border-t border-gray-700/60 px-2 py-2">
                    <button
                      type="button"
                      onClick={() => openBook(book.book)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-indigo-400 transition-colors hover:bg-gray-800 hover:text-indigo-300"
                      title="Open book file"
                    >
                      <ExternalLink size={14} />
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingBook(book)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
                      title="View details"
                    >
                      <Eye size={16} />
                    </button>
                    {isAdmin() && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditClick(book)}
                          className="rounded-lg p-1.5 text-indigo-400 transition-colors hover:bg-gray-800 hover:text-indigo-300"
                          title="Edit book"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(book)}
                          className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-gray-800 hover:text-red-300"
                          title="Delete book"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BookList;
