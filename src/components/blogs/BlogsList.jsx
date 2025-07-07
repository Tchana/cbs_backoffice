import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, RefreshCw, Calendar, User, Eye, Edit, Trash2 } from "lucide-react";
import { GetBlogs, AddBlog, DeleteBlog, EditBlog } from "../../services/BlogManagement";
import BlogRegistrationModal from "./BlogRegistrationModal";
import BlogViewModal from "./BlogViewModal";

const BlogsList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [blogData, setBlogData] = useState([]);
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [viewingBlog, setViewingBlog] = useState(null);
  const [editingBlog, setEditingBlog] = useState(null);
  const [editValues, setEditValues] = useState({
    title: "",
    author: "",
    content: "",
    image: null,
  });

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setIsLoading(true);
      const blogs = await GetBlogs();
      setBlogData(blogs);
      setFilteredBlogs(blogs);
    } catch (err) {
      console.error("Error fetching blogs:", err);
      setError("Failed to load blogs. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = blogData.filter(
      (blog) =>
        blog.title.toLowerCase().includes(term) ||
        blog.author.toLowerCase().includes(term) ||
        blog.content.toLowerCase().includes(term)
    );
    setFilteredBlogs(filtered);
  };

  const handleInputChange = (e, field) => {
    if (field === "image") {
      setEditValues({ ...editValues, [field]: e.target.files[0] });
    } else {
      setEditValues({ ...editValues, [field]: e.target.value });
    }
  };

  const handleRegistrationClick = () => {
    setIsRegistering(true);
    setEditValues({
      title: "",
      author: "",
      content: "",
      image: null,
    });
  };

  const handleCloseModal = () => {
    setIsRegistering(false);
    setViewingBlog(null);
    setEditingBlog(null);
    setEditValues({
      title: "",
      author: "",
      content: "",
      image: null,
    });
  };

  const handleConfirmRegistration = async () => {
    try {
      await AddBlog(
        editValues.title,
        editValues.author,
        editValues.content,
        editValues.image
      );
      await fetchBlogs();
      handleCloseModal();
    } catch (error) {
      console.error("Error adding blog:", error);
      setError("Failed to add blog. Please try again.");
    }
  };

  const handleViewBlog = (blog) => {
    setViewingBlog(blog);
  };

  const handleEditBlog = (blog) => {
    setEditingBlog(blog);
    setEditValues({
      title: blog.title,
      author: blog.author,
      content: blog.content,
      image: null,
    });
    setIsRegistering(true);
  };

  const handleDeleteBlog = async (blogId) => {
    try {
      await DeleteBlog(blogId);
      await fetchBlogs();
      setViewingBlog(null);
    } catch (error) {
      console.error("Error deleting blog:", error);
      setError("Failed to delete blog. Please try again.");
    }
  };

  const handleConfirmEdit = async () => {
    try {
      await EditBlog(
        editingBlog.id,
        editValues.title,
        editValues.author,
        editValues.content,
        editValues.image
      );
      await fetchBlogs();
      handleCloseModal();
    } catch (error) {
      console.error("Error editing blog:", error);
      setError("Failed to edit blog. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <motion.div
        className="bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="text-white text-xl">Loading blogs...</div>
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
        <h2 className="text-xl font-semibold text-gray-100">Blog Posts</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search blogs..."
              className="bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchBlogs}
              className="text-green-400 hover:text-green-300"
              title="Refresh data"
            >
              <RefreshCw size={24} />
            </button>
            <button
              onClick={handleRegistrationClick}
              className="text-indigo-400 hover:text-indigo-300"
            >
              <Plus size={30} />
            </button>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {isRegistering && (
          <BlogRegistrationModal
            onClose={handleCloseModal}
            onRegister={editingBlog ? handleConfirmEdit : handleConfirmRegistration}
            editValues={editValues}
            handleInputChange={handleInputChange}
          />
        )}
      </AnimatePresence>

      {/* View Blog Modal */}
      <AnimatePresence>
        {viewingBlog && (
          <BlogViewModal
            blog={viewingBlog}
            onClose={() => setViewingBlog(null)}
            onEdit={handleEditBlog}
            onDelete={handleDeleteBlog}
          />
        )}
      </AnimatePresence>

      <div className="overflow-x-auto p-4">
        {filteredBlogs.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <p className="text-gray-400 text-lg">No blog posts found</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                {/* Blog Image */}
                <div className="h-48 overflow-hidden">
                  <img
                    src={blog.image || "/default-blog.png"}
                    alt={blog.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Blog Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                    {blog.title}
                  </h3>
                  
                  {/* Meta Information */}
                  <div className="flex items-center space-x-4 text-gray-400 text-sm mb-3">
                    <div className="flex items-center space-x-1">
                      <User size={14} />
                      <span>{blog.author}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{formatDate(blog.created_at)}</span>
                    </div>
                  </div>

                  {/* Blog Preview */}
                  <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                    {truncateText(blog.content)}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleViewBlog(blog)}
                      className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Eye size={16} />
                      <span>Read More</span>
                    </button>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditBlog(blog)}
                        className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900 rounded-lg transition-colors"
                        title="Edit blog"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteBlog(blog.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900 rounded-lg transition-colors"
                        title="Delete blog"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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

export default BlogsList; 