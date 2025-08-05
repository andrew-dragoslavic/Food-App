import React from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

const VoiceRecordButton = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  disabled = false,
  loading = false,
}) => {
  const handleClick = () => {
    if (disabled || loading) return;

    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative group h-20 w-20 rounded-full transition-all duration-300 ease-in-out
        ${
          isRecording
            ? "bg-gradient-to-r from-red-600 to-red-700 shadow-lg animate-pulse-slow"
            : "bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-lg hover:scale-105"
        }
        ${
          disabled || loading
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer"
        }
        focus:outline-none focus:ring-4 focus:ring-primary-400/50
        shadow-xl border border-dark-300/20
      `}
    >
      <div className="absolute inset-0 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors duration-300" />

      {loading ? (
        <Loader2 className="h-8 w-8 text-white animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      ) : isRecording ? (
        <MicOff className="h-8 w-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      ) : (
        <Mic className="h-8 w-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      )}

      {isRecording && (
        <div className="absolute -inset-2 rounded-full border-2 border-red-400 animate-ping opacity-75" />
      )}
    </button>
  );
};

export default VoiceRecordButton;
