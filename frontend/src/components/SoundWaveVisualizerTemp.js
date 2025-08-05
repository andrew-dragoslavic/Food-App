import React from "react";

const SoundWaveVisualizerTemp = ({ isRecording }) => {
  if (!isRecording) return null;

  return (
    <div className="flex items-center justify-center">
      <div className="text-blue-500">🎵 Recording...</div>
    </div>
  );
};

export default SoundWaveVisualizerTemp;
