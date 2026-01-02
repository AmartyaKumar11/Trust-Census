/**
 * Stage A: Micro-Aggregation (L1 → L2)
 * 
 * RESPONSIBILITY: Transform raw census submissions into threshold-protected micro-aggregates
 * 
 * This module implements:
 * - Reading from census_submissions (L1) using aggregation_worker role
 * - Grouping by geographic area (district, state) and caste category
 * - Applying k-anonymity threshold (DROP groups < k, do NOT mask)
 * - Writing to micro_aggregates (L2)
 * 
 * MUST:
 * - Use aggregation_worker database role
 * - Process fixed time windows only
 * - Enforce k-anonymity threshold (k ≥ 5)
 * - DROP small groups entirely (do not publish)
 * - Be append-only (no updates to existing aggregates)
 * - Aggregate at district level or above ONLY
 * 
 * MUST NEVER:
 * - Accept user parameters
 * - Skip threshold enforcement
 * - Expose individual records
 * - Allow reverse lookup to L1
 * - Update existing aggregates
 * - Aggregate at village or household level
 * - Mask, round, or partially emit suppressed groups
 * - Log dropped group details or raw census values
 */

import crypto from 'crypto';
import { MICRO_AGGREGATION_CONFIG, DATABASE_CONFIG } from '../config.js';
import { meetsKAnonymityThreshold } from '../privacy/thresholds.js';

/**
 * Micro-aggregation result structure
 */
export const MicroAggregationResult = Object.freeze({
  SUCCESS: 'SUCCESS',
  PARTIAL: 'PARTIAL',
  NO_DATA: 'NO_DATA',
  ERROR: 'ERROR',
});

/**
 * Generate aggregation window ID
 * Used to identify which time window produced these aggregates
 * 
 * @param {string} startTime - Window start time
 * @param {string} endTime - Window end time
 * @returns {string} - Window ID
 */
export function generateWindowId(startTime, endTime) {
  const hash = crypto.createHash('sha256');
  hash.update(`${startTime}:${endTime}`);
  return hash.digest('hex').substring(0, 16);
}

/**
 * Calculate time window for processing
 * Returns start and end timestamps for the configured lookback period
 * 
 * In production: processes previous day's data only
 * For testing: can include current day via environment variable
 * 
 * @returns {object} - { startTime, endTime, windowId }
 */
export function calculateTimeWindow() {
  const now = new Date();
  const endTime = new Date(now);
  
  // For testing: include current day if AGGREGATION_INCLUDE_TODAY is set
  if (process.env.AGGREGATION_INCLUDE_TODAY === 'true') {
    // End time is now (include today's data)
    endTime.setHours(23, 59, 59, 999);
  } else {
    // Production: end at start of today (exclude today's data)
    endTime.setHours(0, 0, 0, 0);
  }

  const startTime = new Date(endTime);
  startTime.setHours(startTime.getHours() - MICRO_AGGREGATION_CONFIG.TIME_WINDOW.LOOKBACK_HOURS);

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
    submissionCount: aggregate.submission_count,
    totalPopulation: aggregate.total_population,
    timestamp: new Date().toISOString(),
  }));
  return hash.digest('hex');
}

/**
 * SQL query for district-level aggregation
 * 
 * This query:
 * - Reads from L1 (census_submissions)
 * - Groups by state_code, district_code, caste_category
 * - Computes submission_count and total_population
 * - Does NOT filter by k-anonymity (filtering done in application)
 */
const DISTRICT_AGGREGATION_QUERY = `
  SELECT 
    'district' as geographic_level,
    district_code as geographic_code,
    state_code,
    caste_category,
    COUNT(*) as submission_count,
    SUM(population_count) as total_population
  FROM census_submissions
  WHERE submitted_at >= $1 AND submitted_at < $2
  GROUP BY state_code, district_code, caste_category
`;

/**
 * SQL query for state-level aggregation
 * 
 * This query:
 * - Reads from L1 (census_submissions)
 * - Groups by state_code, caste_category
 * - Computes submission_count and total_population
 * - Does NOT filter by k-anonymity (filtering done in application)
 */
const STATE_AGGREGATION_QUERY = `
  SELECT 
    'state' as geographic_level,
    state_code as geographic_code,
    state_code,
    caste_category,
    COUNT(*) as submission_count,
    SUM(population_count) as total_population
  FROM census_submissions
  WHERE submitted_at >= $1 AND submitted_at < $2
  GROUP BY state_code, caste_category
`;

/**
 * SQL query to insert into micro_aggregates (L2)
 * 
 * This is INSERT ONLY - no UPDATE or DELETE
 * No foreign keys to L1 (census_submissions)
 */
const INSERT_MICRO_AGGREGATE_QUERY = `
  INSERT INTO micro_aggregates (
    geographic_level,
    geographic_code,
    caste_category,
    submission_count,
    population_count,
    is_suppressed,
    aggregation_window_id,
    computed_at,
    computation_hash
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  RETURNING id
`;

/**
 * Execute micro-aggregation
 * 
 * This function:
 * 1. Connects to database using aggregation_worker role
 * 2. Queries L1 for submissions in time window
 * 3. Groups by geographic area (district, state) and caste category
 * 4. DROPS groups below k-anonymity threshold (does NOT mask)
 * 5. Inserts passing groups into L2 (micro_aggregates)
 * 
 * @param {object} dbPool - Database connection pool (aggregation_worker role)
 * @param {object} logger - Job logger
 * @returns {Promise<object>} - Aggregation results
 */
export async function executeMicroAggregation(dbPool, logger) {
  const startTime = Date.now();
  const timeWindow = calculateTimeWindow();

  // Log start (non-sensitive)
  logger.info('Micro-aggregation starting', {
    stage: 'micro',
    status: 'STARTED',
    timestamp: new Date().toISOString(),
  });

  // Counters for logging (non-sensitive aggregate counts only)
  let totalGroupsProcessed = 0;
  let totalGroupsDropped = 0;
  let totalGroupsWritten = 0;

  try {
    // Process district-level aggregation
    const districtResult = await processGeographicLevel(
      dbPool,
      DISTRICT_AGGREGATION_QUERY,
      timeWindow,
      logger
    );

    totalGroupsProcessed += districtResult.processed;
    totalGroupsDropped += districtResult.dropped;
    totalGroupsWritten += districtResult.written;

    // Process state-level aggregation
    const stateResult = await processGeographicLevel(
      dbPool,
      STATE_AGGREGATION_QUERY,
      timeWindow,
      logger
    );

    totalGroupsProcessed += stateResult.processed;
    totalGroupsDropped += stateResult.dropped;
    totalGroupsWritten += stateResult.written;

    const durationMs = Date.now() - startTime;

    // Log completion (non-sensitive counts only)
    logger.info('Micro-aggregation completed', {
      stage: 'micro',
      status: 'COMPLETED',
      duration_ms: durationMs,
      records_processed: totalGroupsProcessed,
      aggregates_created: totalGroupsWritten,
      aggregates_suppressed: totalGroupsDropped,
      timestamp: new Date().toISOString(),
    });

    // Determine result status
    let status = MicroAggregationResult.SUCCESS;
    if (totalGroupsProcessed === 0) {
      status = MicroAggregationResult.NO_DATA;
    } else if (totalGroupsWritten === 0) {
      status = MicroAggregationResult.NO_DATA;
    }

    return {
      status,
      timeWindow: {
        startTime: timeWindow.startTime,
        endTime: timeWindow.endTime,
        windowId: timeWindow.windowId,
      },
      recordsProcessed: totalGroupsProcessed,
      aggregatesCreated: totalGroupsWritten,
      aggregatesSuppressed: totalGroupsDropped,
      durationMs,
    };

  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log error (non-sensitive - do NOT log error details that might contain data)
    logger.error('Micro-aggregation failed', {
      stage: 'micro',
      status: 'FAILED',
      duration_ms: durationMs,
      error_type: error.name || 'Error',
      timestamp: new Date().toISOString(),
    });

    return {
      status: MicroAggregationResult.ERROR,
      timeWindow: {
        startTime: timeWindow.startTime,
        endTime: timeWindow.endTime,
        windowId: timeWindow.windowId,
      },
      recordsProcessed: totalGroupsProcessed,
      aggregatesCreated: totalGroupsWritten,
      aggregatesSuppressed: totalGroupsDropped,
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
 * @returns {Promise<object>} - { processed, dropped, written }
 */
async function processGeographicLevel(dbPool, query, timeWindow, logger) {
  let processed = 0;
  let dropped = 0;
  let written = 0;

  // Execute aggregation query against L1
  const result = await dbPool.query(query, [timeWindow.startTime, timeWindow.endTime]);

  for (const row of result.rows) {
    processed++;

    // K-ANONYMITY CHECK: DROP groups below threshold
    // Do NOT mask, round, or partially emit - DROP entirely
    if (!meetsKAnonymityThreshold(parseInt(row.submission_count))) {
      dropped++;
      // NOTE: Do NOT log which group was dropped or its actual count
      continue;
    }

    // Group passes k-anonymity - write to L2
    const computationHash = generateComputationHash(row, timeWindow.windowId);

    try {
      await dbPool.query(INSERT_MICRO_AGGREGATE_QUERY, [
        row.geographic_level,
        row.geographic_code,
        row.caste_category,
        parseInt(row.submission_count),
        parseInt(row.total_population),
        false, // is_suppressed = false (suppressed groups are dropped, not written)
        timeWindow.windowId,
        new Date().toISOString(),
        computationHash,
      ]);

      written++;
    } catch (insertError) {
      // Log insert failure (non-sensitive)
      logger.warn('Failed to insert aggregate', {
        stage: 'micro',
        error_type: insertError.name || 'Error',
        // Do NOT log geographic_code, caste_category, or counts
      });
    }
  }

  return { processed, dropped, written };
}

/**
 * Validate that this module is being used correctly
 * Called at worker startup
 */
export function validateMicroAggregationConfig() {
  const errors = [];

  // Validate allowed geographic levels (must NOT include village or block)
  const forbiddenLevels = ['village', 'block', 'household'];
  for (const level of MICRO_AGGREGATION_CONFIG.ALLOWED_GEOGRAPHIC_LEVELS) {
    if (forbiddenLevels.includes(level.toLowerCase())) {
      errors.push(`Geographic level '${level}' is forbidden for micro-aggregation`);
    }
  }

  // Validate k-anonymity threshold
  if (MICRO_AGGREGATION_CONFIG.K_ANONYMITY_THRESHOLD < 5) {
    errors.push('K_ANONYMITY_THRESHOLD must be at least 5');
  }

  if (errors.length > 0) {
    throw new Error(`Micro-aggregation configuration invalid:\n${errors.join('\n')}`);
  }

  return true;
}
