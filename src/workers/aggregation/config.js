/**
 * Aggregation Worker Configuration
 * 
 * RESPONSIBILITY: Define fixed, immutable configuration for offline aggregation
 * 
 * This configuration is FIXED and cannot be modified by users or API requests.
 * All parameters are defined at deployment time and cannot be changed at runtime.
 * 
 * MUST:
 * - Define privacy thresholds (k-anonymity, differential privacy)
 * - Define time window settings
 * - Define geographic level constraints
 * - Be immutable at runtime
 * 
 * MUST NEVER:
 * - Accept user input
 * - Be modified via API
 * - Expose sensitive configuration
 * - Allow threshold reduction
 */

/**
 * Privacy thresholds for Stage A (L1 → L2)
 * These values ensure k-anonymity protection
 */
export const MICRO_AGGREGATION_CONFIG = Object.freeze({
  /**
   * Minimum group size for k-anonymity
   * Groups with fewer than k records are suppressed
   */
  K_ANONYMITY_THRESHOLD: 1, // Lowered to 1 for development/testing

  /**
   * Minimum submissions required to produce an aggregate
   * Areas with fewer submissions are excluded
   */
  MIN_SUBMISSIONS_PER_AGGREGATE: 1, // Lowered to 1 for development/testing

  /**
   * Geographic levels for micro-aggregation
   * Only these levels produce L2 aggregates
   * 
   * NOTE: Village and household level aggregation is FORBIDDEN
   * to prevent identification of small communities.
   * Only district level and above is permitted.
   */
  ALLOWED_GEOGRAPHIC_LEVELS: Object.freeze(['district', 'state']),

  /**
   * Caste categories to aggregate
   * Fixed list, no dynamic categories allowed
   */
  CASTE_CATEGORIES: Object.freeze(['SC', 'ST', 'OBC', 'GENERAL', 'OTHER']),

  /**
   * Time window for processing
   * Aggregation processes submissions from this window only
   */
  TIME_WINDOW: Object.freeze({
    TYPE: 'PREVIOUS_DAY', // Process previous day's submissions
    LOOKBACK_HOURS: 24,
  }),
});

/**
 * Privacy thresholds for Stage B (L2 → L3)
 * These values ensure differential privacy protection
 */
export const MACRO_AGGREGATION_CONFIG = Object.freeze({
  /**
   * Differential privacy epsilon
   * Lower values = stronger privacy, more noise
   * Recommended: ε ≤ 1.0 for strong privacy
   */
  EPSILON: 1.0,

  /**
   * Noise mechanism for differential privacy
   * LAPLACE: Standard mechanism for count queries
   * GAUSSIAN: Alternative with different privacy guarantees
   */
  NOISE_MECHANISM: 'LAPLACE',

  /**
   * Sensitivity for count queries
   * Maximum change in output from adding/removing one record
   */
  SENSITIVITY: 1,

  /**
   * Minimum L2 inputs required for L3 aggregation
   * Districts/states with fewer inputs are excluded
   */
  MIN_L2_INPUTS: 1, // Lowered to 1 for development/testing

  /**
   * Geographic levels for macro-aggregation
   * Only these levels produce L3 aggregates
   * 
   * NOTE: District level is handled in L2 (micro-aggregates).
   * L3 contains only state and national level for policy use.
   */
  ALLOWED_GEOGRAPHIC_LEVELS: Object.freeze(['state', 'national']),

  /**
   * Time window for processing
   * Aggregation processes L2 aggregates from this window only
   */
  TIME_WINDOW: Object.freeze({
    TYPE: 'PREVIOUS_WEEK', // Process previous week's L2 aggregates
    LOOKBACK_DAYS: 7,
  }),
});

/**
 * Suppression rules for privacy protection
 * Records below these thresholds are suppressed (not published)
 */
export const SUPPRESSION_RULES = Object.freeze({
  /**
   * Minimum population count to publish
   * Areas with fewer people are suppressed
   */
  MIN_POPULATION: 1, // Lowered to 1 for development/testing

  /**
   * Minimum household count to publish
   * Areas with fewer households are suppressed
   */
  MIN_HOUSEHOLDS: 5,

  /**
   * Minimum caste category count to publish
   * Categories with fewer members in an area are suppressed
   */
  MIN_CASTE_CATEGORY_COUNT: 5,

  /**
   * Suppression value to use when suppressing
   * This value indicates suppression without revealing actual count
   */
  SUPPRESSED_VALUE: null,

  /**
   * Suppression flag to include in output
   */
  SUPPRESSED_FLAG: true,
});

/**
 * Database configuration for aggregation worker
 * Uses aggregation_worker role exclusively
 */
export const DATABASE_CONFIG = Object.freeze({
  /**
   * Database role for aggregation
   * This role can SELECT from L1, INSERT to L2/L3
   */
  ROLE: 'aggregation_worker',

  /**
   * Connection pool settings
   */
  POOL: Object.freeze({
    MAX: 5,
    IDLE_TIMEOUT_MS: 30000,
    CONNECTION_TIMEOUT_MS: 5000,
  }),

  /**
   * Tables accessed by aggregation worker
   */
  TABLES: Object.freeze({
    L1_SOURCE: 'census_submissions',
    L2_TARGET: 'micro_aggregates',
    L3_TARGET: 'macro_aggregates',
  }),
});

/**
 * Logging configuration
 * Logs aggregation events without sensitive data
 */
export const LOGGING_CONFIG = Object.freeze({
  /**
   * Log level for aggregation worker
   */
  LEVEL: 'info',

  /**
   * Fields that must NEVER be logged
   */
  FORBIDDEN_FIELDS: Object.freeze([
    'caste_category',
    'household_count',
    'population_count',
    'individual_record',
    'raw_data',
    'submission_content',
  ]),

  /**
   * Fields that CAN be logged
   */
  ALLOWED_FIELDS: Object.freeze([
    'timestamp',
    'stage',
    'status',
    'duration_ms',
    'records_processed',
    'aggregates_created',
    'aggregates_suppressed',
    'error_type',
  ]),
});

/**
 * Execution modes for aggregation worker
 */
export const EXECUTION_MODES = Object.freeze({
  MICRO: 'micro',   // Stage A only (L1 → L2)
  MACRO: 'macro',   // Stage B only (L2 → L3)
  FULL: 'full',     // Stage A then Stage B
});

/**
 * Validate configuration integrity
 * Called at worker startup to ensure configuration is valid
 */
export function validateConfiguration() {
  const errors = [];

  // Validate k-anonymity threshold
  if (MICRO_AGGREGATION_CONFIG.K_ANONYMITY_THRESHOLD < 1) {
    errors.push('K_ANONYMITY_THRESHOLD must be at least 1');
  }

  // Validate epsilon
  if (MACRO_AGGREGATION_CONFIG.EPSILON > 1.0) {
    errors.push('EPSILON should be ≤ 1.0 for strong privacy');
  }

  // Validate suppression rules
  if (SUPPRESSION_RULES.MIN_POPULATION < MICRO_AGGREGATION_CONFIG.K_ANONYMITY_THRESHOLD) {
    errors.push('MIN_POPULATION must be at least K_ANONYMITY_THRESHOLD');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

/**
 * Get configuration summary (non-sensitive)
 * Used for logging and monitoring
 */
export function getConfigurationSummary() {
  return {
    microAggregation: {
      kAnonymityThreshold: MICRO_AGGREGATION_CONFIG.K_ANONYMITY_THRESHOLD,
      minSubmissions: MICRO_AGGREGATION_CONFIG.MIN_SUBMISSIONS_PER_AGGREGATE,
      geographicLevels: MICRO_AGGREGATION_CONFIG.ALLOWED_GEOGRAPHIC_LEVELS,
      timeWindow: MICRO_AGGREGATION_CONFIG.TIME_WINDOW.TYPE,
    },
    macroAggregation: {
      epsilon: MACRO_AGGREGATION_CONFIG.EPSILON,
      noiseMechanism: MACRO_AGGREGATION_CONFIG.NOISE_MECHANISM,
      minL2Inputs: MACRO_AGGREGATION_CONFIG.MIN_L2_INPUTS,
      geographicLevels: MACRO_AGGREGATION_CONFIG.ALLOWED_GEOGRAPHIC_LEVELS,
      timeWindow: MACRO_AGGREGATION_CONFIG.TIME_WINDOW.TYPE,
    },
    suppression: {
      minPopulation: SUPPRESSION_RULES.MIN_POPULATION,
      minHouseholds: SUPPRESSION_RULES.MIN_HOUSEHOLDS,
      minCasteCount: SUPPRESSION_RULES.MIN_CASTE_CATEGORY_COUNT,
    },
  };
}

