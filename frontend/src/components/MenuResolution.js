import React from "react";
import { motion } from "framer-motion";
import { CheckCircle, HelpCircle, XCircle, ShoppingCart } from "lucide-react";

const MenuResolution = ({ menuResolution, onClarificationResponse }) => {
  if (!menuResolution) return null;

  const {
    confident_matches = [],
    clarification_needed = [],
    not_found = [],
  } = menuResolution;

  const hasResults =
    confident_matches.length > 0 ||
    clarification_needed.length > 0 ||
    not_found.length > 0;

  if (!hasResults) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto space-y-6"
    >
      {/* Confident Matches */}
      {confident_matches.length > 0 && (
        <div className="bg-dark-800/90 backdrop-blur-sm rounded-2xl p-6 border border-dark-600/20">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold text-dark-100">
              Items Added to Cart
            </h3>
          </div>
          <div className="space-y-3">
            {confident_matches.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm font-medium">
                    {item.quantity}x
                  </span>
                  <span className="text-dark-100 font-medium">
                    {item.menu_item}
                  </span>
                </div>
                <span className="text-dark-300 font-semibold">
                  {item.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clarification Needed */}
      {clarification_needed.length > 0 && (
        <div className="bg-dark-800/90 backdrop-blur-sm rounded-2xl p-6 border border-dark-600/20">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-dark-100">
              Need More Details
            </h3>
          </div>
          <div className="space-y-6">
            {clarification_needed.map((item, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-sm font-medium">
                    {item.quantity}x
                  </span>
                  <p className="text-dark-200 font-medium">
                    {item.clarification_question}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.possible_matches.map((option, optionIndex) => (
                    <button
                      key={optionIndex}
                      onClick={() =>
                        onClarificationResponse &&
                        onClarificationResponse(item, option)
                      }
                      className="flex items-center justify-between p-3 bg-dark-700/50 hover:bg-dark-600/50 rounded-lg transition-colors text-left"
                    >
                      <span className="text-dark-100">{option.menu_item}</span>
                      <span className="text-dark-300 font-medium">
                        {option.price}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not Found */}
      {not_found.length > 0 && (
        <div className="bg-dark-800/90 backdrop-blur-sm rounded-2xl p-6 border border-dark-600/20">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-dark-100">
              Items Not Available
            </h3>
          </div>
          <div className="space-y-2">
            {not_found.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-red-900/20 border border-red-700/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-sm font-medium">
                    {item.quantity}x
                  </span>
                  <span className="text-red-200">{item.requested_item}</span>
                </div>
                <span className="text-red-400 text-sm">Not available</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {(confident_matches.length > 0 || clarification_needed.length > 0) && (
        <div className="flex gap-3 justify-center">
          <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
            <ShoppingCart className="h-5 w-5" />
            Add to Cart
          </button>
          <button className="bg-dark-600 hover:bg-dark-500 text-dark-100 px-6 py-3 rounded-xl font-semibold transition-colors">
            Try Again
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default MenuResolution;
