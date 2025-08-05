import React from "react";
import { motion } from "framer-motion";

const TranscriptDisplay = ({ transcript, isProcessing }) => {
  if (!transcript && !isProcessing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-dark-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-dark-600/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-2 w-2 bg-primary-500 rounded-full animate-pulse" />
          <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wide">
            {isProcessing ? "Processing..." : "Your Order"}
          </h3>
        </div>

        {isProcessing ? (
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div
                className="h-2 w-2 bg-primary-500 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="h-2 w-2 bg-primary-500 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="h-2 w-2 bg-primary-500 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-dark-400 text-sm">
              Analyzing your voice...
            </span>
          </div>
        ) : (
          <p className="text-dark-100 text-lg leading-relaxed font-medium">
            "{transcript}"
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default TranscriptDisplay;
