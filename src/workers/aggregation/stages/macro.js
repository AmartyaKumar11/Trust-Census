/**
 * Stage B: Macro-Aggregation (L2 → L3)
 * 
 * RESPONSIBILITY: Transform micro-aggregates into privacy-noised macro-aggregates
 * 
 * This module implements:
 * - Reading from micro_aggregates (L2) using aggregation_worker role
 * - Rolling up to state and national levels ONLY
 * - Applying differential privacy noise (Laplace mechanism)
 * - Writing to macro_aggregates (L3)
 * 
 * MUST:
 * - Use aggregation_worker database role
 * - Process fixed time windows only
 * - Apply differential privacy noise (ε ≤ 1.0)
 * - Use irreversible noise mechanism
 * - Be append-only (no updates to existing aggregates)
 * - Aggregate at state and national level ONLY
 * 
 * MUST NEVER:
 * - Accept user parameters
 * - Skip noise application
 * - Allow noise removal
 * - Access L1 directly (only L2)
 * - Update existing aggregates
 * - Aggregate at district level (that's L2)
 * - Log pre-noise or post-noise raw values
 * - Log epsilon, noise values, or distributions
 * - Emit negative values after noise
 */

import crypto from 'crypto';
import { MACRO_AGGREGATION_CONFIG } from '../config.js';
import { applyNoise, validatePrivacyParameters } from '../privacy/noise.js';

/**
 * Macro-aggregation result structure
 */
export const MacroAggregationResult = Object.freeze({
  SUCCESS: 'SUCCESS',
  PARTIAL: 'PARTIAL',
  NO_DATA: 'NO_DATA',
  ERROR: 'ERROR',
});

/**
 * Generate aggregation window ID for L3
 * 
 * @param {string} startTime - Window start time
 * @param {string} endTime - Window end time
 * @returns {string} - Window ID
 */
export function generateWindowId(startTime, endTime) {
  const hash = crypto.createHash('sha256');
  hash.update(`L3:${startTime}:${endTime}`);
  return hash.digest('hex').substring(0, 16);
}

/**
 * Calculate time window for processing
 * Returns start and end timestamps for the previous week
 * 
 * @returns {object} - { startTime, endTime, windowId }
 */
export function calculateTimeWindow() {
  const now = new Date();
  const endTime = new Date(now);
  endTime.setHours(0, 0, 0, 0);
  endTime.setDate(endTime.getDate() - endTime.getDay()); // Start of this week = end of last week

  const startTime = new Date(endTime);
  startTime.setDate(startTime.getDate() - MACRO_AGGREGATION_CONFIG.TIME_WINDOW.LOOKBACK_DAYS);

  const startTimeISO = startTime.toISOString();
  const endTimeISO = endTime.toISOString();

  return {
    startTime: startTimeISO,
    endTime: endTimeISO,
    windowId: generateWindowId(startTimeISO, endTimeISO),
  };
}

/**
 * Generate computation hash for integrity verification
 * 
 * @param {object} aggregate - Aggregate data
 * @param {string} windowId - Aggregation window ID
 * @returns {string} - SHA-256 hash
 */
function generateComputationHash(aggregate, windowId) {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify({
    windowId,
    geographicLevel: aggregate.geographic_level,
    geographicCode: aggregate.geographic_code,
    casteCategory: aggregate.caste_category,
    // NOTE: Hash includes noised values, not true values
    noisyPopulation: aggregate.noisy_population,
    noisySubmissionCount: aggregate.noisy_submission_count,
    timestamp: new Date().toISOString(),
  }));
  return hash.digest('hex');
}

/**
 * SQL query for state-level aggregation from L2
 * 
 * This query:
 * - Reads from micro_aggregates (L2)
 * - Groups by state (using geographic_code where geographic_level='state')
 * - Computes sum of submission_count and population_count
 * - Filters to non-suppressed L2 records only
 */
const STATE_AGGREGATION_QUERY = `
  SELECT 
    'state' as geographic_level,
    geographic_code,
    caste_category,
    SUM(submission_count) as total_submission_count,
    SUM(population_count) as total_population,
    COUNT(*) as l2_input_count
  FROM micro_aggregates
  WHERE computed_at >= $1 AND computed_at < $2
    AND is_suppressed = false
    AND geographic_level = 'state'
  GROUP BY geographic_code, caste_category
  HAVING COUNT(*) >= $3
`;

/**
 * SQL query for national-level aggregation from L2
 * 
 * This query:
 * - Reads from micro_aggregates (L2)
 * - Aggregates ALL state-level data to national level
 * - Computes sum of submission_count and population_count
 * - Filters to non-suppressed L2 records only
 */
const NATIONAL_AGGREGATION_QUERY = `
  SELECT 
    'national' as geographic_level,
    'NATIONAL' as geographic_code,
    caste_category,
    SUM(submission_count) as total_submission_count,
    SUM(population_count) as total_population,
    COUNT(*) as l2_input_count
  FROM micro_aggregates
  WHERE computed_at >= $1 AND computed_at < $2
    AND is_suppressed = false
  GROUP BY caste_category
  HAVING COUNT(*) >= $3
`;

/**
 * SQL query to insert into macro_aggregates (L3)
 * 
 * This is INSERT ONLY - no UPDATE or DELETE
 * No foreign keys to L2 or L1
 * Values are NOISED - not true values
 */
const INSERT_MACRO_AGGREGATE_QUERY = `
  INSERT INTO macro_aggregates (
    geographic_level,
    geographic_code,
    caste_category,
    noisy_population,
    noisy_submission_count,
    aggregation_window_id,
    computed_at,
    computation_hash
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING id
`;

/**
 * Apply differential privacy noise to aggregate values
 * 
 * This function applies Laplace noise to both population and submission counts.
 * The noise is irreversible - original values cannot be recovered.
 * 
 * @param {number} population - True population count
 * @param {number} submissionCount - True submission count
 * @returns {object} - { noisyPopulation, noisySubmissionCount }
 */
function applyPrivacyNoise(population, submissionCount) {
  // Apply independent noise to each value
  const noisedPopulation = applyNoise(population);
  const noisedSubmissionCount = applyNoise(submissionCount);

  // Ensure non-negative values (noise can push below zero)
  // Math.max(0, ...) is already applied in applyNoise, but double-check
  return {
    noisyPopulation: Math.max(0, noisedPopulation.noisedValue),
    noisySubmissionCount: Math.max(0, noisedSubmissionCount.noisedValue),
  };
}

/**
 * Execute macro-aggregation
 * 
 * This function:
 * 1. Reads from micro_aggregates (L2) using aggregation_worker role
 * 2. Groups by state and national level
 * 3. Applies differential privacy noise (Laplace mechanism)
 * 4. Inserts noised values into macro_aggregates (L3)
 * 
 * @param {object} dbPool - Database connection pool (aggregation_worker role)
 * @param {object} logger - Job logger
 * @returns {Promise<object>} - Aggregation results
 */
export async function executeMacroAggregation(dbPool, logger) {
  const startTime = Date.now();
  const timeWindow = calculateTimeWindow();

  // Log start (non-sensitive - do NOT log epsilon or noise parameters)
  logger.info('Macro-aggregation starting', {
    stage: 'macro',
    status: 'STARTED',
    timestamp: new Date().toISOString(),
  });

  // Counters for logging (non-sensitive aggregate counts only)
  let totalL2RowsProcessed = 0;
  let totalL3RowsCreated = 0;

  try {
    // Validate privacy parameters before processing
    validatePrivacyParameters();

    // Process state-level aggregation
    const stateResult = await processGeographicLevel(
      dbPool,
      STATE_AGGREGATION_QUERY,
      timeWindow,
      logger
    );

    totalL2RowsProcessed += stateResult.l2Processed;
    totalL3RowsCreated += stateResult.l3Created;

    // Process national-level aggregation
    const nationalResult = await processGeographicLevel(
      dbPool,
      NATIONAL_AGGREGATION_QUERY,
      timeWindow,
      logger
    );

    totalL2RowsProcessed += nationalResult.l2Processed;
    totalL3RowsCreated += nationalResult.l3Created;

    const durationMs = Date.now() - startTime;

    // Log completion (non-sensitive counts only)
    // NEVER log epsilon, noise values, or distributions
    logger.info('Macro-aggregation completed', {
      stage: 'macro',
      status: 'COMPLETED',
      duration_ms: durationMs,
      l2_rows_processed: totalL2RowsProcessed,
      l3_rows_created: totalL3RowsCreated,
      timestamp: new Date().toISOString(),
    });

    // Determine result status
    let status = MacroAggregationResult.SUCCESS;
    if (totalL2RowsProcessed === 0) {
      status = MacroAggregationResult.NO_DATA;
    } else if (totalL3RowsCreated === 0) {
      status = MacroAggregationResult.NO_DATA;
    }

    return {
      status,
      timeWindow: {
        startTime: timeWindow.startTime,
        endTime: timeWindow.endTime,
        windowId: timeWindow.windowId,
      },
      recordsProcessed: totalL2RowsProcessed,
      aggregatesCreated: totalL3RowsCreated,
      durationMs,
    };

  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log error (non-sensitive - do NOT log error details that might contain data)
    logger.error('Macro-aggregation failed', {
      stage: 'macro',
      status: 'FAILED',
      duration_ms: durationMs,
      error_type: error.name || 'Error',
      timestamp: new Date().toISOString(),
    });

    return {
      status: MacroAggregationResult.ERROR,
      timeWindow: {
        startTime: timeWindow.startTime,
        endTime: timeWindow.endTime,
        windowId: timeWindow.windowId,
      },
      recordsProcessed: totalL2RowsProcessed,
      aggregatesCreated: totalL3RowsCreated,
      durationMs,
      error: error.name || 'Error',
    };
  }
}

/**
 * Process aggregation for a specific geographic level
 * 
 * @param {object} dbPool - Database connection pool
 * @param {string} query - SQL query for aggregation
 * @param {object} timeWindow - Time window object
 * @param {object} logger - Job logger
 * @returns {Promise<object>} - { l2Processed, l3Created }
 */
async function processGeographicLevel(dbPool, query, timeWindow, logger) {
  let l2Processed = 0;
  let l3Created = 0;

  // Execute aggregation query against L2
  const result = await dbPool.query(query, [
    timeWindow.startTime,
    timeWindow.endTime,
    MACRO_AGGREGATION_CONFIG.MIN_L2_INPUTS,
  ]);

  for (const row of result.rows) {
    // Count L2 inputs processed (sum of l2_input_count across all groups)
    l2Processed += parseInt(row.l2_input_count);

    // Apply differential privacy noise
    // This is IRREVERSIBLE - original values cannot be recovered
    const { noisyPopulation, noisySubmissionCount } = applyPrivacyNoise(
      parseInt(row.total_population),
      parseInt(row.total_submission_count)
    );

    // Generate computation hash (uses noised values)
    const aggregateForHash = {
      geographic_level: row.geographic_level,
      geographic_code: row.geographic_code,
      caste_category: row.caste_category,
      noisy_population: noisyPopulation,
      noisy_submission_count: noisySubmissionCount,
    };
    const computationHash = generateComputationHash(aggregateForHash, timeWindow.windowId);

    try {
      await dbPool.query(INSERT_MACRO_AGGREGATE_QUERY, [
        row.geographic_level,
        row.geographic_code,
        row.caste_category,
        noisyPopulation,
        noisySubmissionCount,
        timeWindow.windowId,
        new Date().toISOString(),
        computationHash,
      ]);

      l3Created++;
    } catch (insertError) {
      // Log insert failure (non-sensitive)
      // NEVER log geographic_code, caste_category, or noised values
      logger.warn('Failed to insert macro-aggregate', {
        stage: 'macro',
        error_type: insertError.name || 'Error',
      });
    }
  }

  return { l2Processed, l3Created };
}

/**
 * Validate that this module is being used correctly
 * Called at worker startup
 */
export function validateMacroAggregationConfig() {
  const errors = [];

  // Validate allowed geographic levels (must NOT include district - that's L2)
  const forbiddenLevels = ['district', 'block', 'village', 'household'];
  for (const level of MACRO_AGGREGATION_CONFIG.ALLOWED_GEOGRAPHIC_LEVELS) {
    if (forbiddenLevels.includes(level.toLowerCase())) {
      errors.push(`Geographic level '${level}' is forbidden for macro-aggregation (L3)`);
    }
  }

  // Validate epsilon (must be positive and ≤ 1.0 for strong privacy)
  if (MACRO_AGGREGATION_CONFIG.EPSILON <= 0) {
    errors.push('EPSILON must be positive');
  }
  if (MACRO_AGGREGATION_CONFIG.EPSILON > 1.0) {
    errors.push('EPSILON should be ≤ 1.0 for strong privacy');
  }

  // Validate minimum L2 inputs
  if (MACRO_AGGREGATION_CONFIG.MIN_L2_INPUTS < 1) {
    errors.push('MIN_L2_INPUTS must be at least 1');
  }

  if (errors.length > 0) {
    throw new Error(`Macro-aggregation configuration invalid:\n${errors.join('\n')}`);
  }

  return true;
}
