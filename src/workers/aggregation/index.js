/**
 * Offline Aggregation Worker Entry Point
 * 
 * RESPONSIBILITY: Execute offline aggregation pipeline (L1 → L2 → L3)
 * 
 * This worker runs OUTSIDE the HTTP request lifecycle and cannot be
 * triggered via API routes. It is designed to be executed by:
 * - Cron jobs
 * - Systemd timers
 * - Manual administrator invocation
 * 
 * MUST:
 * - Run offline (not via HTTP)
 * - Use aggregation_worker database role
 * - Accept no user input parameters
 * - Process fixed time windows
 * - Enforce privacy thresholds
 * - Be append-only (no updates)
 * 
 * MUST NEVER:
 * - Be invoked via API routes
 * - Accept dynamic parameters from users
 * - Expose raw L1 data
 * - Skip privacy thresholds
 * - Allow reverse data flow
 */

import { 
  validateConfiguration, 
  getConfigurationSummary,
  EXECUTION_MODES,
  DATABASE_CONFIG,
} from './config.js';
import { 
  createJobLogger,
  info,
  error,
} from './logger.js';

/**
 * Generate a unique job ID
 */
function generateJobId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `agg-${timestamp}-${random}`;
}

/**
 * Parse command line arguments
 * Only accepts predefined execution modes, no dynamic parameters
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    stage: EXECUTION_MODES.FULL, // Default to full pipeline
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--stage=')) {
      const stage = arg.split('=')[1];
      if (Object.values(EXECUTION_MODES).includes(stage)) {
        options.stage = stage;
      } else {
        throw new Error(`Invalid stage: ${stage}. Valid stages: ${Object.values(EXECUTION_MODES).join(', ')}`);
      }
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Offline Aggregation Worker
==========================

Usage: node src/workers/aggregation/index.js [options]

Options:
  --stage=<stage>   Aggregation stage to run
                    - micro: Stage A only (L1 → L2)
                    - macro: Stage B only (L2 → L3)
                    - full:  Stage A then Stage B (default)
  
  --dry-run         Validate configuration without executing
  
  --help, -h        Show this help message

Examples:
  # Run full aggregation pipeline
  node src/workers/aggregation/index.js

  # Run micro-aggregation only
  node src/workers/aggregation/index.js --stage=micro

  # Run macro-aggregation only
  node src/workers/aggregation/index.js --stage=macro

  # Validate configuration
  node src/workers/aggregation/index.js --dry-run

Environment Variables:
  DB_AGGREGATION_WORKER_USER      Database user (default: aggregation_worker)
  DB_AGGREGATION_WORKER_PASSWORD  Database password (required)
  DB_HOST                         Database host (default: localhost)
  DB_PORT                         Database port (default: 5432)
  DB_NAME                         Database name (default: trust_census)

Security Notes:
  - This worker runs OFFLINE, not via HTTP
  - It uses the aggregation_worker database role
  - It accepts NO user input parameters
  - All configuration is fixed at deployment time
`);
}

/**
 * Placeholder for Stage A: Micro-Aggregation (L1 → L2)
 * 
 * NOT IMPLEMENTED YET
 * This function will:
 * - Read from census_submissions (L1)
 * - Apply k-anonymity thresholds
 * - Write to micro_aggregates (L2)
 */
async function executeMicroAggregation(logger) {
  logger.info('Stage A: Micro-Aggregation (L1 → L2)', { status: 'NOT_IMPLEMENTED' });
  
  // PLACEHOLDER: Actual implementation will:
  // 1. Connect to database using aggregation_worker role
  // 2. Query census_submissions for previous day's submissions
  // 3. Group by geographic area and caste category
  // 4. Apply k-anonymity threshold (suppress groups < k)
  // 5. Insert results into micro_aggregates
  // 6. Return summary statistics (no raw data)

  return {
    status: 'NOT_IMPLEMENTED',
    recordsProcessed: 0,
    aggregatesCreated: 0,
    aggregatesSuppressed: 0,
  };
}

/**
 * Placeholder for Stage B: Macro-Aggregation (L2 → L3)
 * 
 * NOT IMPLEMENTED YET
 * This function will:
 * - Read from micro_aggregates (L2)
 * - Apply differential privacy noise
 * - Write to macro_aggregates (L3)
 */
async function executeMacroAggregation(logger) {
  logger.info('Stage B: Macro-Aggregation (L2 → L3)', { status: 'NOT_IMPLEMENTED' });
  
  // PLACEHOLDER: Actual implementation will:
  // 1. Connect to database using aggregation_worker role
  // 2. Query micro_aggregates for previous week's aggregates
  // 3. Roll up to district/state/national level
  // 4. Apply differential privacy noise (Laplace mechanism)
  // 5. Insert results into macro_aggregates
  // 6. Return summary statistics (no raw data)

  return {
    status: 'NOT_IMPLEMENTED',
    recordsProcessed: 0,
    aggregatesCreated: 0,
    aggregatesSuppressed: 0,
  };
}

/**
 * Main execution function
 */
async function main() {
  const startTime = Date.now();
  const jobId = generateJobId();
  const logger = createJobLogger(jobId);

  info('='.repeat(60));
  info('Offline Aggregation Worker Starting', { job_id: jobId });
  info('='.repeat(60));

  try {
    // Parse command line arguments
    const options = parseArguments();
    info('Execution options', { 
      stage: options.stage, 
      dryRun: options.dryRun,
      job_id: jobId,
    });

    // Validate configuration
    info('Validating configuration...');
    validateConfiguration();
    info('Configuration valid');

    // Log configuration summary (non-sensitive)
    const configSummary = getConfigurationSummary();
    info('Configuration summary', configSummary);

    // Dry run mode - just validate and exit
    if (options.dryRun) {
      info('Dry run complete - configuration is valid');
      process.exit(0);
    }

    // Execute aggregation based on stage
    const results = {
      micro: null,
      macro: null,
    };

    if (options.stage === EXECUTION_MODES.MICRO || options.stage === EXECUTION_MODES.FULL) {
      logger.logStart('micro', configSummary.microAggregation);
      results.micro = await executeMicroAggregation(logger);
      logger.logComplete('micro', results.micro);
    }

    if (options.stage === EXECUTION_MODES.MACRO || options.stage === EXECUTION_MODES.FULL) {
      logger.logStart('macro', configSummary.macroAggregation);
      results.macro = await executeMacroAggregation(logger);
      logger.logComplete('macro', results.macro);
    }

    // Log final summary
    const durationMs = Date.now() - startTime;
    info('='.repeat(60));
    info('Aggregation job completed', {
      job_id: jobId,
      stage: options.stage,
      duration_ms: durationMs,
      micro_status: results.micro?.status || 'SKIPPED',
      macro_status: results.macro?.status || 'SKIPPED',
    });
    info('='.repeat(60));

    process.exit(0);

  } catch (err) {
    const durationMs = Date.now() - startTime;
    error('Aggregation job failed', {
      job_id: jobId,
      duration_ms: durationMs,
      error_type: err.name || 'Error',
    });
    
    // Log error to stderr (without sensitive details)
    console.error(`FATAL: ${err.message}`);
    process.exit(1);
  }
}

// Prevent execution if imported as module
// This worker should only run as a standalone process
if (process.argv[1] && process.argv[1].includes('aggregation')) {
  main();
}

// Export for testing purposes only
export { 
  parseArguments, 
  executeMicroAggregation, 
  executeMacroAggregation,
  generateJobId,
};

