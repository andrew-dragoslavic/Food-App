import React from "react";
import { CheckCircle, HelpCircle, XCircle } from "lucide-react";

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

  if (!hasResults) {
    return (
      <div className="bg-dark-700 border border-dark-600 rounded-lg p-6 text-center">
        <p className="text-dark-300">No menu items processed yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confident Matches */}
      {confident_matches.length > 0 && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <h3 className="text-lg font-semibold text-green-400">
              Ready Items
            </h3>
            <span className="ml-2 bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs">
              {confident_matches.length}
            </span>
          </div>
          <ul className="space-y-2">
            {confident_matches.map((item, index) => (
              <li
                key={index}
                className="bg-dark-800/50 rounded-lg p-3 text-white font-medium"
              >
                {item.quantity || 1}x{" "}
                {item.matched_menu_item || item.requested_item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clarification Needed */}
      {clarification_needed.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <HelpCircle className="w-5 h-5 text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-400">
              Need Clarification
            </h3>
            <span className="ml-2 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs">
              {clarification_needed.length}
            </span>
          </div>
          <div className="space-y-3">
            {clarification_needed.map((item, index) => (
              <div key={index} className="bg-dark-800/50 rounded-lg p-3">
                <p className="text-white font-medium mb-2">
                  {item.requested_item} (Quantity: {item.quantity})
                </p>
                <p className="text-yellow-300 text-sm mb-3">
                  {item.clarification_question}
                </p>
                {item.possible_matches && item.possible_matches.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.possible_matches.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          onClarificationResponse &&
                          onClarificationResponse(item, option)
                        }
                        className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 px-3 py-1 rounded-lg text-sm transition-colors"
                      >
                        {option.menu_item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Not Found */}
      {not_found.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <XCircle className="w-5 h-5 text-red-400 mr-2" />
            <h3 className="text-lg font-semibold text-red-400">Not Found</h3>
            <span className="ml-2 bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs">
              {not_found.length}
            </span>
          </div>
          <div className="space-y-2">
            {not_found.map((item, index) => (
              <div key={index} className="bg-dark-800/50 rounded-lg p-3">
                <p className="text-white">
                  {item.requested_item} {item.quantity && `(${item.quantity})`}
                </p>
                {item.reason && (
                  <p className="text-red-300 text-sm mt-1">{item.reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuResolution;
