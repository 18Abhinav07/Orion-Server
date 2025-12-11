export const SIMILARITY_THRESHOLDS = {
  CLEAN: { min: 0, max: 40 },        // Proceed as original
  WARNING: { min: 40, max: 70 },     // Show warning, user decides
  REVIEW: { min: 70, max: 90 },      // Admin mediation required
  DERIVATIVE: { min: 90, max: 100 }  // Force link to parent
};

export const STATUSES = {
  CLEAN: 'CLEAN',
  WARNING: 'WARNING',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED',
  DERIVATIVE: 'DERIVATIVE'
};
