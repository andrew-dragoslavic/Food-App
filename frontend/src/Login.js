import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn, Loader2 } from "lucide-react";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful!");
    } catch (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-dark-900/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-dark-700/20">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-dark-50 mb-2">Welcome Back</h2>
          <p className="text-dark-300">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full pl-10 pr-4 py-3 border border-dark-600 bg-dark-800/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-dark-100 placeholder-dark-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-dark-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-4 py-3 border border-dark-600 bg-dark-800/50 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 text-dark-100 placeholder-dark-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`
              w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200
              ${
                loading
                  ? "bg-dark-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }
              text-white shadow-lg
            `}
          >
            <div className="flex items-center justify-center gap-2">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="h-5 w-5" />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </div>
          </button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-900/50 border border-red-700/50 rounded-xl"
            >
              <p className="text-red-200 text-sm">{error}</p>
            </motion.div>
          )}
        </form>
      </div>
    </motion.div>
  );
}

export default Login;
