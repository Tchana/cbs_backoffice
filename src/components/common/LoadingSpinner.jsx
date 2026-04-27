import { motion } from "framer-motion";

const LoadingSpinner = ({ fullScreen = false, inline = false, size = "md" }) => {
  const sizeClasses =
    size === "sm"
      ? "h-4 w-4 border-2"
      : size === "lg"
      ? "h-16 w-16 border-4"
      : "h-12 w-12 border-t-2 border-b-2";
  const containerClasses = fullScreen
    ? "flex items-center justify-center min-h-[calc(100vh-4rem)]"
    : "flex items-center justify-center py-8";

  const spinner = (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`animate-spin rounded-full border-primary-50 ${
        size === "md" ? "border-t-2 border-b-2" : ""
      } ${sizeClasses} ${size !== "md" ? "border border-t-transparent" : ""}`}
    />
  );

  if (inline) return spinner;

  return (
    <div className={containerClasses}>
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
