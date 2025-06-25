import { motion } from "framer-motion";

const LoadingSpinner = ({ fullScreen = false }) => {
  const containerClasses = fullScreen
    ? "flex items-center justify-center min-h-[calc(100vh-4rem)]"
    : "flex items-center justify-center py-8";

  return (
    <div className={containerClasses}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-50"
      />
    </div>
  );
};

export default LoadingSpinner;
