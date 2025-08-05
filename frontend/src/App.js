import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, Sparkles } from "lucide-react";
import Login from "./Login";
import Register from "./Register";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Components
import LoadingScreen from "./components/LoadingScreen";
import VoiceRecordButton from "./components/VoiceRecordButton";
import SoundWaveVisualizer from "./components/SoundWaveVisualizer";
import TranscriptDisplay from "./components/TranscriptDisplay";
import ErrorMessage from "./components/ErrorMessage";
import MenuResolution from "./components/MenuResolutionSimple";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [showAuthForm, setShowAuthForm] = useState("login"); // "login" or "register"
  const [menuResolution, setMenuResolution] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("Logged out successfully!");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const startRecording = async () => {
    setTranscript("");
    setVoiceError("");
    setIsProcessing(false);
    setMenuResolution(null); // Clear previous menu resolution results

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setStream(audioStream);

      // Set up audio context for visualization
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const source = context.createMediaStreamSource(audioStream);
      const analyserNode = context.createAnalyser();

      analyserNode.fftSize = 256;
      source.connect(analyserNode);

      setAudioContext(context);
      setAnalyser(analyserNode);

      const recorder = new MediaRecorder(audioStream);
      const audioChunks = [];

      recorder.ondataavailable = (event) => audioChunks.push(event.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, {
          type: "audio/webm;codecs=opus",
        });
        processAudio(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      setVoiceError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      if (audioContext) {
        audioContext.close();
        setAudioContext(null);
        setAnalyser(null);
      }
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append("audio", audioBlob);

    try {
      const response = await fetch("/api/speech/transcribe", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      setTranscript(result.text);

      // If we have a transcript, process it for menu resolution
      if (result.text) {
        await processMenuResolution(result.text);
      }
    } catch (error) {
      setVoiceError("Speech processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processMenuResolution = async (transcript) => {
    try {
      const response = await fetch("/api/process-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });
      const menuResult = await response.json();
      setMenuResolution(menuResult);
    } catch (error) {
      console.error("Menu resolution failed:", error);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-50 via-dark-100 to-dark-200 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/5 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 p-6"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-dark-600/20 rounded-xl backdrop-blur-sm border border-dark-300/20">
                <Sparkles className="h-6 w-6 text-dark-800" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-800">
                  Voice Food Ordering
                </h1>
                <p className="text-dark-600 text-sm">
                  AI-powered food discovery
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-dark-600/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-dark-300/20">
                <User className="h-4 w-4 text-dark-700" />
                <span className="text-dark-800 text-sm font-medium">
                  {user.email?.split("@")[0]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-dark-600/20 backdrop-blur-sm rounded-xl hover:bg-dark-600/30 transition-colors text-dark-700 border border-dark-300/20"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="relative z-10 p-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold text-dark-800 mb-4">
                What would you like to eat?
              </h2>
              <p className="text-dark-600 text-lg max-w-2xl mx-auto">
                Speak naturally and let our AI help you discover and order
                delicious food from your favorite restaurants.
              </p>
            </motion.div>

            {/* Voice Interface */}
            <div className="space-y-8">
              {/* Record Button with Sound Wave Visualizer Above */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-6"
              >
                {/* Sound Wave Visualizer - only shows when recording */}
                <SoundWaveVisualizer
                  isRecording={isRecording}
                  audioContext={audioContext}
                  analyser={analyser}
                />

                <VoiceRecordButton
                  isRecording={isRecording}
                  onStartRecording={startRecording}
                  onStopRecording={stopRecording}
                  loading={isProcessing}
                />

                <div className="text-center">
                  <p className="text-dark-700 font-medium mb-2">
                    {isRecording
                      ? "🎤 Listening... speak your order now"
                      : isProcessing
                      ? "🤖 Processing your request..."
                      : "👆 Tap to start voice ordering"}
                  </p>
                  <p className="text-dark-500 text-sm">
                    Try saying: "I want pizza from Joe's" or "Find me sushi
                    nearby"
                  </p>

                  {/* Test button - remove in production */}
                  <button
                    onClick={() => {
                      setMenuResolution({
                        clarification_needed: [
                          {
                            clarification_question:
                              "What kind of soda would you like?",
                            requested_item: "soda",
                            possible_matches: [
                              {
                                menu_item: "Coca-Cola® Zero Sugar",
                                price: "$2.29",
                              },
                              { menu_item: "Coke®", price: "$2.29" },
                              { price: "$2.29", menu_item: "Diet Coke®" },
                              { menu_item: "Dr Pepper®", price: "$2.29" },
                              { menu_item: "Fanta® Orange", price: "$2.29" },
                              { menu_item: "Sprite®", price: "$2.29" },
                            ],
                            quantity: 2,
                          },
                        ],
                        confident_matches: [
                          { menu_item: "Big Mac", price: "$5.99", quantity: 1 },
                        ],
                        not_found: [
                          { requested_item: "unicorn burger", quantity: 1 },
                        ],
                      });
                    }}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Test Menu Resolution
                  </button>
                </div>
              </motion.div>

              {/* Transcript Display */}
              <AnimatePresence>
                {(transcript || isProcessing) && (
                  <TranscriptDisplay
                    transcript={transcript}
                    isProcessing={isProcessing}
                  />
                )}
              </AnimatePresence>

              {/* Menu Resolution Results */}
              <AnimatePresence>
                {menuResolution && (
                  <MenuResolution
                    menuResolution={menuResolution}
                    onClarificationResponse={(item, option) => {
                      // Handle clarification response
                      console.log(
                        "Selected option:",
                        option,
                        "for item:",
                        item
                      );
                      // You can implement the logic to update the order here
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Error Message */}
              <AnimatePresence>
                {voiceError && (
                  <ErrorMessage
                    error={voiceError}
                    onDismiss={() => setVoiceError("")}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Auth screens
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-50 via-dark-100 to-dark-200 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-dark-600/20 rounded-2xl backdrop-blur-sm border border-dark-300/20">
                <Sparkles className="h-12 w-12 text-dark-700" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-dark-800 mb-4">
              Voice Food Ordering
            </h1>
            <p className="text-dark-600 text-lg">
              Experience the future of food delivery with AI-powered voice
              commands
            </p>
          </motion.div>

          {/* Auth Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex bg-dark-600/20 backdrop-blur-sm rounded-2xl p-1 border border-dark-300/20"
          >
            <button
              onClick={() => setShowAuthForm("login")}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                showAuthForm === "login"
                  ? "bg-dark-800 text-dark-50 shadow-lg"
                  : "text-dark-600 hover:bg-dark-600/10"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setShowAuthForm("register")}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                showAuthForm === "register"
                  ? "bg-dark-800 text-dark-50 shadow-lg"
                  : "text-dark-600 hover:bg-dark-600/10"
              }`}
            >
              Sign Up
            </button>
          </motion.div>

          {/* Auth Forms */}
          <AnimatePresence mode="wait">
            {showAuthForm === "login" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Login />
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Register />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
