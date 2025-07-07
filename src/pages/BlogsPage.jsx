import { useState } from "react";
import { GetBlogs } from "../services/BlogManagement";
import Header from "../components/common/Header";
import BlogsList from "../components/blogs/BlogsList";
import { useEffect } from "react";

const BlogsPage = () => {
  const [blogStats, setBlogStats] = useState({ totalBlogs: 0 });

  const updateBlogStats = (blogs) => {
    setBlogStats({ totalBlogs: blogs.length });
  };

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const blogs = await GetBlogs();
        updateBlogStats(blogs);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      }
    };
    fetchBlogs();
  }, []);

  return (
    <div className="flex-1 relative z-10 overflow-auto">
      <Header title={"Blogs"} />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        <BlogsList />
      </main>
    </div>
  );
};

export default BlogsPage; 