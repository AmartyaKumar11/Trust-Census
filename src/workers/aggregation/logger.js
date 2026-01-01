/**
 * Aggregation Worker Logger
 * 
 * RESPONSIBILITY: Non-sensitive logging for offline aggregation
 * 
 * This logger records aggregation events WITHOUT exposing sensitive data.
 * It is used by the offline aggregation worker, not the HTTP server.
 * 
 * MUST:
 * - Log aggregation events (start, complete, error)
 * - Record metadata (timestamp, duration, counts)
 * - Be usable for monitoring and debugging
 * 
 * MUST NEVER:
 * - Log raw census data
 * - Log individual record details
 * - Log caste categories with counts
 * - Log population or household values
 * - Expose any L1 content
 */

import { LOGGING_CONFIG } from './config.js';

/**
 * Log levels
 */
const LOG_LEVELS = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
});

/**
 * Current log level from configuration
 */
const currentLevel = LOG_LEVELS[LOGGING_CONFIG.LEVEL.toUpperCase()] || LOG_LEVELS.INFO;

/**
 * Sanitize log data to remove sensitive fields
 * 
 * @param {object} data - Data to sanitize
 * @returns {object} - Sanitized data
 */
function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Check if field is forbidden
    const isForbidden = LOGGING_CONFIG.FORBIDDEN_FIELDS.some(
      forbidden => lowerKey.includes(forbidden.toLowerCase())
    );

    if (isForbidden) {
      // Skip forbidden fields entirely
      continue;
    }

    // Check if field is explicitly allowed
    const isAllowed = LOGGING_CONFIG.ALLOWED_FIELDS.some(
      allowed => lowerKey === allowed.toLowerCase()
    );

    if (isAllowed) {
      // Include allowed fields
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    } else {
      // For unknown fields, only include if primitive and non-sensitive
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        // Additional check for numeric values that might be counts
        if (typeof value === 'number' && value > 0) {
          // Don't log specific counts that could reveal data
          if (lowerKey.includes('count') && !lowerKey.includes('records_processed') && !lowerKey.includes('aggregates')) {
            continue;
          }
        }
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Format log message
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} data - Additional data
 * @returns {string} - Formatted log message
 */
function formatLog(level, message, data) {
  const timestamp = new Date().toISOString();
  const sanitizedData = sanitizeLogData(data);

  return JSON.stringify({
    timestamp,
    level,
    component: 'aggregation-worker',
    message,
    ...sanitizedData,
  });
}

/**
 * Log at DEBUG level
 */
export function debug(message, data = {}) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.log(formatLog('DEBUG', message, data));
  }
}

/**
 * Log at INFO level
 */
export function info(message, data = {}) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log(formatLog('INFO', message, data));
  }
}

/**
 * Log at WARN level
 */
export function warn(message, data = {}) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(formatLog('WARN', message, data));
  }
}

/**
 * Log at ERROR level
 */
export function error(message, data = {}) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    console.error(formatLog('ERROR', message, data));
  }
}

/**
 * Log aggregation job start
 * 
 * @param {string} stage - Aggregation stage (micro, macro, full)
 * @param {object} config - Configuration summary (non-sensitive)
 */
export function logJobStart(stage, config = {}) {
  info('Aggregation job started', {
    stage,
    timestamp: new Date().toISOString(),
    status: 'STARTED',
    // Only log non-sensitive config summary
    kAnonymityThreshold: config.kAnonymityThreshold,
    epsilon: config.epsilon,
    timeWindow: config.timeWindow,
  });
}

/**
 * Log aggregation job completion
 * 
 * @param {string} stage - Aggregation stage
 * @param {object} results - Job results (sanitized)
 */
export function logJobComplete(stage, results = {}) {
  info('Aggregation job completed', {
    stage,
    timestamp: new Date().toISOString(),
    status: 'COMPLETED',
    duration_ms: results.durationMs,
    records_processed: results.recordsProcessed,
    aggregates_created: results.aggregatesCreated,
    aggregates_suppressed: results.aggregatesSuppressed,
  });
}

/**
 * Log aggregation job failure
 * 
 * @param {string} stage - Aggregation stage
 * @param {Error} err - Error object
 */
export function logJobError(stage, err) {
  error('Aggregation job failed', {
    stage,
    timestamp: new Date().toISOString(),
    status: 'FAILED',
    error_type: err.name || 'Error',
    // Do NOT log full error message (might contain sensitive data)
    // Only log error type for debugging
  });
}

/**
 * Log stage progress
 * 
 * @param {string} stage - Aggregation stage
 * @param {string} phase - Current phase
 * @param {object} progress - Progress data (sanitized)
 */
export function logProgress(stage, phase, progress = {}) {
  debug('Aggregation progress', {
    stage,
    phase,
    timestamp: new Date().toISOString(),
    records_processed: progress.recordsProcessed,
  });
}

/**
 * Log suppression event
 * 
 * @param {string} stage - Aggregation stage
 * @param {string} reason - Suppression reason
 */
export function logSuppression(stage, reason) {
  debug('Aggregate suppressed', {
    stage,
    timestamp: new Date().toISOString(),
    suppression_reason: reason,
    // Do NOT log which specific group was suppressed
    // Do NOT log the actual count that triggered suppression
  });
}

/**
 * Create a logger instance for a specific job
 * 
 * @param {string} jobId - Unique job identifier
 * @returns {object} - Logger instance
 */
export function createJobLogger(jobId) {
  return {
    debug: (message, data) => debug(message, { ...data, job_id: jobId }),
    info: (message, data) => info(message, { ...data, job_id: jobId }),
    warn: (message, data) => warn(message, { ...data, job_id: jobId }),
    error: (message, data) => error(message, { ...data, job_id: jobId }),
    logStart: (stage, config) => logJobStart(stage, { ...config, job_id: jobId }),
    logComplete: (stage, results) => logJobComplete(stage, { ...results, job_id: jobId }),
    logError: (stage, err) => logJobError(stage, err),
    logProgress: (stage, phase, progress) => logProgress(stage, phase, { ...progress, job_id: jobId }),
    logSuppression: (stage, reason) => logSuppression(stage, reason),
  };
}

