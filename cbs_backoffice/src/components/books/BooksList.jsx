import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Eye } from "lucide-react";
import { GetBooks } from "../../services/BookManagement";

const orderData = await GetBooks();

const OrdersGrid = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOrders, setFilteredOrders] = useState(orderData);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = orderData.filter(
      (order) =>
        order.title.toLowerCase().includes(term) ||
        order.category.toLowerCase().includes(term)
    );
    setFilteredOrders(filtered);
  };

  const openBook = (bookUrl) => {
    window.open(bookUrl, "_self");
  };

  return (
    <motion.div
      className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">Book List</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search books..."
            className="bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={handleSearch}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>
      <div className="overflow-x-auto p-4">
        {filteredOrders.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <img
              src="/default-image.png"
              alt="No Books"
              className="w-48 h-48 opacity-50"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredOrders.map((book) => (
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

export default OrdersGrid;
