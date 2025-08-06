import React from "react";
import { motion } from "framer-motion";
import { Mic, Square } from "lucide-react";
import "../App.css"; // Import the CSS that contains the loader animation

const VoiceRecordButton = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  loading,
}) => {
  // Debug logging to see the states
  console.log("VoiceRecordButton state:", { isRecording, loading });

  const handleClick = () => {
    if (loading) return; // Prevent clicks while processing

    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={loading}
      className={`
        relative w-20 h-20 rounded-full flex items-center justify-center
        transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2
        ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 focus:ring-red-300 shadow-lg shadow-red-500/25"
            : loading
            ? "bg-blue-500 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 focus:ring-blue-300 shadow-lg shadow-blue-500/25"
        }
      `}
      whileTap={!loading ? { scale: 0.95 } : {}}
      whileHover={!loading ? { scale: 1.05 } : {}}
      animate={{
        scale: isRecording ? [1, 1.1, 1] : 1,
      }}
      transition={{
        scale: {
          duration: 1,
          repeat: isRecording ? Infinity : 0,
          ease: "easeInOut",
        },
      }}
    >
      {loading ? (
        // Custom CSS loader - sized properly to fit inside the circle
        <span 
          className="loader" 
          style={{ 
            fontSize: '20px', // Much smaller than the default 45px
            width: '20px',
            height: '20px'
          }}
        ></span>
      ) : isRecording ? (
        <Square className="w-8 h-8 text-white" fill="currentColor" />
      ) : (
        <Mic className="w-8 h-8 text-white" />
      )}

      {/* Pulse ring for recording state */}
      {isRecording && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-300"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.7, 0, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.button>
  );
};

export default VoiceRecordButton;
