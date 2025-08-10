import React from "react";

const ConfirmedItemsReview = ({ items, onBack }) => {
  if (!items || !items.length) return null;
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-dark-800">Review Items</h2>
      <ul className="space-y-3">
        {items.map((it, idx) => {
          const deltaDisplay =
            it.delta != null && Number(it.delta) > 0
              ? ` +$${Number(it.delta).toFixed(2)}`
              : "";
          return (
            <li
              key={idx}
              className="p-4 rounded-xl bg-dark-600/10 border border-dark-300/20 flex justify-between items-center"
            >
              <div>
                <p className="font-semibold text-dark-800">
                  {it.quantity}x {it.item || it.matched_menu_item}
                  {it.size ? ` (${it.size})` : ""}
                </p>
                {it.status && (
                  <p className="text-xs text-dark-500 mt-1">
                    {it.status === "success" ? "Selected" : it.status}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-dark-700 font-medium">
                  {it.price}{" "}
                  {deltaDisplay && (
                    <span className="text-dark-500">{deltaDisplay}</span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-5 py-3 rounded-lg bg-dark-600/20 hover:bg-dark-600/30 text-dark-700 font-medium border border-dark-300/20"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ConfirmedItemsReview;
