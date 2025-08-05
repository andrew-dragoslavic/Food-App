import React from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

const ErrorMessage = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ErrorMessage;
