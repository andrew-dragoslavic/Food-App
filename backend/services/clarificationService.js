function clarificationService(prediction) {
  const hasUnclearItems = prediction.clarification_needed.length > 0;
  const hasUnfoundItems = prediction.not_found.length > 0;
  const hasClearItems = prediction.confident_matches.length > 0;

  const clarification = hasUnclearItems || hasUnfoundItems;

  const totalItems =
    prediction.confident_matches.length +
    prediction.clarification_needed.length +
    prediction.not_found.length;

  if (totalItems === 0) {
    return {
      needed: true,
      error: "No items found in order",
      data: {
        /* empty structure */
      },
    };
  }

  return {
    needed: clarification,
    data: {
      confident_matches: prediction.confident_matches || [],
      clarification_needed: prediction.clarification_needed || [],
      not_found: prediction.not_found || [],
    },
    summary: {
      total_items: totalItems,
      clear_items: hasClearItems ? prediction.confident_matches.length : 0,
      unclear_items: hasUnclearItems
        ? prediction.clarification_needed.length
        : 0,
      missing_items: hasUnfoundItems ? prediction.not_found.length : 0,
    },
  };
}
