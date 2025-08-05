import React, { useEffect, useRef } from "react";

const SoundWaveVisualizer = ({ isRecording, audioContext, analyser }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isRecording || !audioContext || !analyser) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasContext = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 320 * dpr;
    canvas.height = 80 * dpr;
    canvas.style.width = "320px";
    canvas.style.height = "80px";
    canvasContext.scale(dpr, dpr);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas with transparent background
      canvasContext.clearRect(0, 0, canvas.width, canvas.height);

      // Drawing parameters
      const barCount = 32;
      const barWidth = 6;
      const barSpacing = 4;
      const maxBarHeight = 60;
      const baseBarHeight = 4;

      // Calculate starting position to center the bars
      const totalWidth = barCount * barWidth + (barCount - 1) * barSpacing;
      const startX = (320 - totalWidth) / 2;

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        // Get frequency data for this bar (distribute across frequency range)
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex];

        // Calculate bar height with some smoothing
        const normalizedValue = value / 255;
        const barHeight = baseBarHeight + normalizedValue * maxBarHeight;

        // Position
        const x = startX + i * (barWidth + barSpacing);
        const y = (80 - barHeight) / 2;

        // Create gradient
        const gradient = canvasContext.createLinearGradient(
          0,
          y,
          0,
          y + barHeight
        );
        gradient.addColorStop(0, "#3B82F6"); // Blue
        gradient.addColorStop(0.6, "#8B5CF6"); // Purple
        gradient.addColorStop(1, "#EC4899"); // Pink

        // Draw bar with simple rectangles to avoid browser compatibility issues
        canvasContext.fillStyle = gradient;
        canvasContext.fillRect(x, y, barWidth, barHeight);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isRecording, audioContext, analyser]);

  if (!isRecording) {
    return null;
  }

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{ width: "320px", height: "80px" }}
      />
    </div>
  );
};

export default SoundWaveVisualizer;
