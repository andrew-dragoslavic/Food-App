import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Check } from "lucide-react";

const OrderAnimation = ({ isVisible, onComplete }) => {
  const [stage, setStage] = useState("drop"); // "drop" -> "success"

  useEffect(() => {
    if (!isVisible) return;

    // Reset stage when animation starts
    setStage("drop");

    // Transition to success stage after bag drops
    const timer1 = setTimeout(() => setStage("success"), 1200);

    // Complete animation and cleanup
    const timer2 = setTimeout(() => {
      onComplete();
      setStage("drop");
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="relative flex flex-col items-center">
        {/* Circle Container */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-32 h-32 rounded-full border-4 border-green-500/50 bg-green-500/10 backdrop-blur-sm flex items-center justify-center"
          >
            <AnimatePresence mode="wait">
              {stage === "drop" && (
                <motion.div
                  key="bag"
                  initial={{ y: -200, scale: 0.5, rotate: -180 }}
                  animate={{ y: 0, scale: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    duration: 1,
                  }}
                  className="text-green-400"
                >
                  <ShoppingBag className="w-12 h-12" />
                </motion.div>
              )}

              {stage === "success" && (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                  className="text-green-400"
                >
                  <Check className="w-12 h-12" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Circle Pulse Effect */}
          {stage === "success" && (
            <motion.div
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1, repeat: 2 }}
              className="absolute inset-0 rounded-full border-2 border-green-400"
            />
          )}
        </div>

        {/* Text Messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <AnimatePresence mode="wait">
            {stage === "drop" && (
              <motion.p
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-white text-lg font-medium"
              >
                Processing your order...
              </motion.p>
            )}

            {stage === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <h3 className="text-2xl font-bold text-white">
                  Order Placed! 🎉
                </h3>
                <p className="text-green-200">
                  Your delicious meal is on its way!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default OrderAnimation;
