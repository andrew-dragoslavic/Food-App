import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  HelpCircle,
  XCircle,
  Trash2,
  Minus,
  Plus,
} from "lucide-react";

const sectionBase =
  "backdrop-blur-sm rounded-2xl p-6 border shadow-sm transition-colors";

const MenuResolution = ({
  confidentItems = [],
  clarificationNeeded = [],
  notFound = [],
  onIncrement,
  onDecrement,
  onClarificationResponse,
}) => {
  const hasResults =
    confidentItems.length > 0 ||
    clarificationNeeded.length > 0 ||
    notFound.length > 0;

  if (!hasResults) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto space-y-8"
    >
      {/* CONFIDENT / REVIEW ITEMS (Green theme) */}
      {confidentItems.length > 0 && (
        <div
          className={`${sectionBase} bg-emerald-600/10 border-emerald-500/30`}
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-emerald-200">
              Ready Items
            </h3>
          </div>
          <div className="space-y-3">
            {confidentItems.map((item) => {
              const qty = item.quantity;
              const MinusOrTrash = qty === 1 ? Trash2 : Minus;
              const minusAria =
                qty === 1
                  ? `Remove ${item.itemName}`
                  : `Decrease quantity for ${item.itemName}`;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-100 font-medium">
                      {item.itemName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={minusAria}
                      onClick={() => onDecrement && onDecrement(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 transition"
                    >
                      <MinusOrTrash className="w-4 h-4" />
                    </button>
                    <span className="min-w-[2ch] text-center text-emerald-50 font-semibold">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase quantity for ${item.itemName}`}
                      onClick={() => onIncrement && onIncrement(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CLARIFICATION NEEDED (Yellow theme) */}
      {clarificationNeeded.length > 0 && (
        <div className={`${sectionBase} bg-amber-600/10 border-amber-500/30`}>
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-200">
              Need Clarification
            </h3>
          </div>
          <div className="space-y-6">
            {clarificationNeeded.map((item, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-sm font-medium">
                    {item.quantity || 1}x
                  </span>
                  <p className="text-amber-100 font-medium">
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
                      className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/20 transition-colors text-left"
                    >
                      <span className="text-amber-100">{option.menu_item}</span>
                      <span className="text-amber-300 font-medium">
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

      {/* NOT FOUND (Red theme) */}
      {notFound.length > 0 && (
        <div className={`${sectionBase} bg-rose-700/10 border-rose-600/30`}>
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="h-5 w-5 text-rose-400" />
            <h3 className="text-lg font-semibold text-rose-200">
              Not Found / Unavailable
            </h3>
          </div>
          <div className="space-y-2">
            {notFound.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/30"
              >
                <div className="flex items-center gap-3">
                  <span className="bg-rose-500/25 text-rose-300 px-2 py-1 rounded text-sm font-medium">
                    {item.quantity || 1}x
                  </span>
                  <span className="text-rose-100">{item.requested_item}</span>
                </div>
                <span className="text-rose-300 text-sm">Unavailable</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MenuResolution;
