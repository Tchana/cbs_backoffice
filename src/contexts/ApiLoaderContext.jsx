import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ApiLoaderContext = createContext(null);

export function ApiLoaderProvider({ children }) {
  const [count, setCount] = useState(0);

  const startRequest = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  const endRequest = useCallback(() => {
    setCount((c) => Math.max(0, c - 1));
  }, []);

  const runWithLoader = useCallback(
    async (fn) => {
      startRequest();
      try {
        return await fn();
      } finally {
        endRequest();
      }
    },
    [startRequest, endRequest]
  );

  return (
    <ApiLoaderContext.Provider value={{ startRequest, endRequest, runWithLoader, isLoading: count > 0 }}>
      {children}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="rounded-full h-12 w-12 border-2 border-indigo-500 border-t-transparent animate-spin"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </ApiLoaderContext.Provider>
  );
}

export function useApiLoader() {
  const ctx = useContext(ApiLoaderContext);
  if (!ctx) {
    throw new Error("useApiLoader must be used within ApiLoaderProvider");
  }
  return ctx;
}
