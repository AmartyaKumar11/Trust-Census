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

import pg from 'pg';
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
import { 
  executeMicroAggregation as runMicroAggregation,
  validateMicroAggregationConfig,
} from './stages/micro.js';
import { 
  executeMacroAggregation as runMacroAggregation,
  validateMacroAggregationConfig,
} from './stages/macro.js';

const { Pool } = pg;

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
 * Create database connection pool for aggregation_worker role
 * 
 * This pool uses the aggregation_worker database role which:
 * - Can SELECT from census_submissions (L1)
 * - Can INSERT to micro_aggregates (L2)
 * - Can INSERT to macro_aggregates (L3)
 * - CANNOT access audit_logs, users, consent_records
 */
function createAggregationWorkerPool() {
  const pool = new Pool({
    user: process.env.DB_AGGREGATION_WORKER_USER || DATABASE_CONFIG.ROLE,
    password: process.env.DB_AGGREGATION_WORKER_PASSWORD,
    host: process.env.DB_HOST || '127.0.0.1', // Use 127.0.0.1 for Docker on Windows
    port: parseInt(process.env.DB_PORT || '5433'), // Docker PostgreSQL on port 5433
    database: process.env.DB_NAME || 'trust_census',
    max: DATABASE_CONFIG.POOL.MAX,
    idleTimeoutMillis: DATABASE_CONFIG.POOL.IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DATABASE_CONFIG.POOL.CONNECTION_TIMEOUT_MS,
  });

  return pool;
}

/**
 * Stage A: Micro-Aggregation (L1 → L2)
 * 
 * Executes micro-aggregation using the implementation in stages/micro.js
 * - Reads from census_submissions (L1)
 * - Applies k-anonymity thresholds (DROPS groups below k)
 * - Writes to micro_aggregates (L2)
 * - Aggregates at district and state level ONLY
 */
async function executeMicroAggregation(dbPool, logger) {
  logger.info('Stage A: Micro-Aggregation (L1 → L2)', { status: 'STARTING' });
  
  // Validate micro-aggregation configuration
  validateMicroAggregationConfig();
  
  // Execute micro-aggregation
  const result = await runMicroAggregation(dbPool, logger);
  
  return result;
}

/**
 * Stage B: Macro-Aggregation (L2 → L3)
 * 
 * Executes macro-aggregation using the implementation in stages/macro.js
 * - Reads from micro_aggregates (L2)
 * - Applies differential privacy noise (Laplace mechanism)
 * - Writes to macro_aggregates (L3)
 * - Aggregates at state and national level ONLY
 */
async function executeMacroAggregation(dbPool, logger) {
  logger.info('Stage B: Macro-Aggregation (L2 → L3)', { status: 'STARTING' });
  
  // Validate macro-aggregation configuration
  validateMacroAggregationConfig();
  
  // Execute macro-aggregation
  const result = await runMacroAggregation(dbPool, logger);
  
  return result;
}

/**
 * Main execution function
 */
async function main() {
  const startTime = Date.now();
  const jobId = generateJobId();
  const logger = createJobLogger(jobId);
  let dbPool = null;

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

    // Create database connection pool
    info('Creating database connection pool...');
    dbPool = createAggregationWorkerPool();
    
    // Verify database connection
    await dbPool.query('SELECT 1');
    info('Database connection established', { role: DATABASE_CONFIG.ROLE });

    // Execute aggregation based on stage
    const results = {
      micro: null,
      macro: null,
    };

    if (options.stage === EXECUTION_MODES.MICRO || options.stage === EXECUTION_MODES.FULL) {
      logger.logStart('micro', configSummary.microAggregation);
      results.micro = await executeMicroAggregation(dbPool, logger);
      logger.logComplete('micro', results.micro);
    }

    if (options.stage === EXECUTION_MODES.MACRO || options.stage === EXECUTION_MODES.FULL) {
      logger.logStart('macro', configSummary.macroAggregation);
      results.macro = await executeMacroAggregation(dbPool, logger);
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

    // Close database connection
    if (dbPool) {
      await dbPool.end();
    }

    process.exit(0);

  } catch (err) {
    const durationMs = Date.now() - startTime;
    error('Aggregation job failed', {
      job_id: jobId,
      duration_ms: durationMs,
      error_type: err.name || 'Error',
    });
    
    // Close database connection on error
    if (dbPool) {
      try {
        await dbPool.end();
      } catch (e) {
        // Ignore pool close errors
      }
    }
    
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
  createAggregationWorkerPool,
};

