/**
 * Privacy Thresholds Module
 * 
 * RESPONSIBILITY: K-anonymity and suppression enforcement for micro-aggregation
 * 
 * STATUS: PLACEHOLDER - NOT IMPLEMENTED YET
 * 
 * This module will implement:
 * - K-anonymity threshold checking
 * - Group size suppression
 * - Minimum count enforcement
 * 
 * MUST:
 * - Enforce k-anonymity (k ≥ 5)
 * - Suppress groups below threshold
 * - Never expose suppressed values
 * 
 * MUST NEVER:
 * - Allow threshold bypass
 * - Expose suppressed group sizes
 * - Reduce threshold below minimum
 */

import { MICRO_AGGREGATION_CONFIG, SUPPRESSION_RULES } from '../config.js';

/**
 * Suppression reasons
 */
export const SuppressionReason = Object.freeze({
  BELOW_K_THRESHOLD: 'BELOW_K_THRESHOLD',
  BELOW_MIN_POPULATION: 'BELOW_MIN_POPULATION',
  BELOW_MIN_HOUSEHOLDS: 'BELOW_MIN_HOUSEHOLDS',
  BELOW_MIN_SUBMISSIONS: 'BELOW_MIN_SUBMISSIONS',
  BELOW_MIN_CASTE_COUNT: 'BELOW_MIN_CASTE_COUNT',
});

/**
 * Check if a value meets k-anonymity threshold
 * 
 * @param {number} count - Number of records in group
 * @returns {boolean} - True if meets threshold
 */
export function meetsKAnonymityThreshold(count) {
  return count >= MICRO_AGGREGATION_CONFIG.K_ANONYMITY_THRESHOLD;
}

/**
 * Check if an aggregate should be suppressed
 * Returns suppression decision and reason
 * 
 * @param {object} aggregate - Aggregate data
 * @returns {object} - { suppress: boolean, reason: string|null }
 */
export function checkSuppression(aggregate) {
  // Check k-anonymity (submission count)
  if (aggregate.submissionCount < MICRO_AGGREGATION_CONFIG.K_ANONYMITY_THRESHOLD) {
    return { 
      suppress: true, 
      reason: SuppressionReason.BELOW_K_THRESHOLD,
    };
  }

  // Check minimum submissions
  if (aggregate.submissionCount < MICRO_AGGREGATION_CONFIG.MIN_SUBMISSIONS_PER_AGGREGATE) {
    return { 
      suppress: true, 
      reason: SuppressionReason.BELOW_MIN_SUBMISSIONS,
    };
  }

  // Check minimum population
  if (aggregate.populationCount < SUPPRESSION_RULES.MIN_POPULATION) {
    return { 
      suppress: true, 
      reason: SuppressionReason.BELOW_MIN_POPULATION,
    };
  }

  // Check minimum households
  if (aggregate.householdCount < SUPPRESSION_RULES.MIN_HOUSEHOLDS) {
    return { 
      suppress: true, 
      reason: SuppressionReason.BELOW_MIN_HOUSEHOLDS,
    };
  }

  return { suppress: false, reason: null };
}

/**
 * Apply suppression to an aggregate
 * Returns the aggregate with values nullified if suppressed
 * 
 * @param {object} aggregate - Aggregate data
 * @returns {object} - Possibly suppressed aggregate
 */
export function applySuppression(aggregate) {
  const { suppress, reason } = checkSuppression(aggregate);

  if (!suppress) {
    return {
      ...aggregate,
      isSuppressed: false,
      suppressionReason: null,
    };
  }

  // Return suppressed aggregate with null values
  return {
    geographicLevel: aggregate.geographicLevel,
    geographicCode: aggregate.geographicCode,
    casteCategory: aggregate.casteCategory,
    // Suppress actual values
    householdCount: SUPPRESSION_RULES.SUPPRESSED_VALUE,
    populationCount: SUPPRESSION_RULES.SUPPRESSED_VALUE,
    submissionCount: SUPPRESSION_RULES.SUPPRESSED_VALUE,
    // Mark as suppressed
    isSuppressed: SUPPRESSION_RULES.SUPPRESSED_FLAG,
    suppressionReason: reason,
  };
}

/**
 * Check if a caste category in an area should be suppressed
 * 
 * @param {number} categoryCount - Count for this category in the area
 * @returns {boolean} - True if should suppress
 */
export function shouldSuppressCasteCategory(categoryCount) {
  return categoryCount < SUPPRESSION_RULES.MIN_CASTE_CATEGORY_COUNT;
}

/**
 * Get threshold configuration summary (non-sensitive)
 * 
 * @returns {object} - Threshold configuration
 */
export function getThresholdSummary() {
  return {
    kAnonymityThreshold: MICRO_AGGREGATION_CONFIG.K_ANONYMITY_THRESHOLD,
    minSubmissions: MICRO_AGGREGATION_CONFIG.MIN_SUBMISSIONS_PER_AGGREGATE,
    minPopulation: SUPPRESSION_RULES.MIN_POPULATION,
    minHouseholds: SUPPRESSION_RULES.MIN_HOUSEHOLDS,
    minCasteCount: SUPPRESSION_RULES.MIN_CASTE_CATEGORY_COUNT,
  };
}

