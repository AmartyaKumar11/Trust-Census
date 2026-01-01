import pg from 'pg';
const { Pool } = pg;

/**
 * Database Connection Management with Role Separation
 * 
 * RESPONSIBILITY: Provide separate database connections for each trust boundary
 * 
 * This module provides distinct connection pools for different database roles,
 * enforcing separation of powers at the connection level.
 * 
 * Database Roles:
 * - api_writer: For Enumerator endpoints (L1 write-only)
 * - audit_writer: For audit logging (L0 append-only)
 * - aggregation_worker: For background aggregation (L1 read, L2/L3 write)
 * - analytics_reader: For StateAnalyst/CentralPolicyViewer (L2/L3 read)
 * - supervisor_reader: For Supervisor endpoints (L0 read)
 * 
 * MUST:
 * - Provide separate connection pools for each role
 * - Prevent credential sharing across concerns
 * - Enforce role-based access at connection level
 * 
 * MUST NEVER:
 * - Use superuser credentials in application
 * - Share credentials across different concerns
 * - Allow a single connection to access all layers
 */

/**
 * Connection pool storage
 */
const pools = {
  apiWriter: null,
  auditWriter: null,
  aggregationWorker: null,
  analyticsReader: null,
  supervisorReader: null,
};

/**
 * Base connection configuration
 */
function getBaseConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'trust_census',
    max: 10, // Maximum pool size per role
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

/**
 * Initialize API Writer connection pool
 * Used by: Enumerator endpoints for L1 submissions
 * Permissions: INSERT on census_submissions, SELECT/UPDATE on users
 */
export function initApiWriterPool() {
  if (pools.apiWriter) {
    return pools.apiWriter;
  }

  pools.apiWriter = new Pool({
    ...getBaseConfig(),
    user: process.env.DB_API_WRITER_USER || 'api_writer',
    password: process.env.DB_API_WRITER_PASSWORD,
  });

  pools.apiWriter.on('error', (err) => {
    console.error('API Writer pool error:', err);
  });

  return pools.apiWriter;
}

/**
 * Initialize Audit Writer connection pool
 * Used by: Audit middleware for L0 logging
 * Permissions: INSERT on audit_logs only
 */
export function initAuditWriterPool() {
  if (pools.auditWriter) {
    return pools.auditWriter;
  }

  pools.auditWriter = new Pool({
    ...getBaseConfig(),
    user: process.env.DB_AUDIT_WRITER_USER || 'audit_writer',
    password: process.env.DB_AUDIT_WRITER_PASSWORD,
  });

  pools.auditWriter.on('error', (err) => {
    console.error('Audit Writer pool error:', err);
  });

  return pools.auditWriter;
}

/**
 * Initialize Aggregation Worker connection pool
 * Used by: Background aggregation workers
 * Permissions: SELECT on census_submissions, INSERT on aggregates
 */
export function initAggregationWorkerPool() {
  if (pools.aggregationWorker) {
    return pools.aggregationWorker;
  }

  pools.aggregationWorker = new Pool({
    ...getBaseConfig(),
    user: process.env.DB_AGGREGATION_WORKER_USER || 'aggregation_worker',
    password: process.env.DB_AGGREGATION_WORKER_PASSWORD,
  });

  pools.aggregationWorker.on('error', (err) => {
    console.error('Aggregation Worker pool error:', err);
  });

  return pools.aggregationWorker;
}

/**
 * Initialize Analytics Reader connection pool
 * Used by: StateAnalyst and CentralPolicyViewer endpoints
 * Permissions: SELECT on aggregate tables only
 */
export function initAnalyticsReaderPool() {
  if (pools.analyticsReader) {
    return pools.analyticsReader;
  }

  pools.analyticsReader = new Pool({
    ...getBaseConfig(),
    user: process.env.DB_ANALYTICS_READER_USER || 'analytics_reader',
    password: process.env.DB_ANALYTICS_READER_PASSWORD,
  });

  pools.analyticsReader.on('error', (err) => {
    console.error('Analytics Reader pool error:', err);
  });

  return pools.analyticsReader;
}

/**
 * Initialize Supervisor Reader connection pool
 * Used by: Supervisor endpoints for audit log access
 * Permissions: SELECT on audit_logs only
 */
export function initSupervisorReaderPool() {
  if (pools.supervisorReader) {
    return pools.supervisorReader;
  }

  pools.supervisorReader = new Pool({
    ...getBaseConfig(),
    user: process.env.DB_SUPERVISOR_READER_USER || 'supervisor_reader',
    password: process.env.DB_SUPERVISOR_READER_PASSWORD,
  });

  pools.supervisorReader.on('error', (err) => {
    console.error('Supervisor Reader pool error:', err);
  });

  return pools.supervisorReader;
}

/**
 * Get API Writer pool
 */
export function getApiWriterPool() {
  if (!pools.apiWriter) {
    return initApiWriterPool();
  }
  return pools.apiWriter;
}

/**
 * Get Audit Writer pool
 */
export function getAuditWriterPool() {
  if (!pools.auditWriter) {
    return initAuditWriterPool();
  }
  return pools.auditWriter;
}

/**
 * Get Aggregation Worker pool
 */
export function getAggregationWorkerPool() {
  if (!pools.aggregationWorker) {
    return initAggregationWorkerPool();
  }
  return pools.aggregationWorker;
}

/**
 * Get Analytics Reader pool
 */
export function getAnalyticsReaderPool() {
  if (!pools.analyticsReader) {
    return initAnalyticsReaderPool();
  }
  return pools.analyticsReader;
}

/**
 * Get Supervisor Reader pool
 */
export function getSupervisorReaderPool() {
  if (!pools.supervisorReader) {
    return initSupervisorReaderPool();
  }
  return pools.supervisorReader;
}

/**
 * Close all connection pools
 */
export async function closeAllPools() {
  const closePromises = [];

  if (pools.apiWriter) {
    closePromises.push(pools.apiWriter.end());
    pools.apiWriter = null;
  }
  if (pools.auditWriter) {
    closePromises.push(pools.auditWriter.end());
    pools.auditWriter = null;
  }
  if (pools.aggregationWorker) {
    closePromises.push(pools.aggregationWorker.end());
    pools.aggregationWorker = null;
  }
  if (pools.analyticsReader) {
    closePromises.push(pools.analyticsReader.end());
    pools.analyticsReader = null;
  }
  if (pools.supervisorReader) {
    closePromises.push(pools.supervisorReader.end());
    pools.supervisorReader = null;
  }

  await Promise.all(closePromises);
}

/**
 * Initialize all connection pools
 */
export function initAllPools() {
  initApiWriterPool();
  initAuditWriterPool();
  initAggregationWorkerPool();
  initAnalyticsReaderPool();
  initSupervisorReaderPool();
}

/**
 * Get pool by role name
 * Used for dynamic pool selection based on actor role
 * 
 * @param {string} role - The actor role
 * @returns {Pool} - The appropriate connection pool
 */
export function getPoolForRole(role) {
  switch (role) {
    case 'ENUMERATOR':
    case 'DATA_ENTRY':
      return getApiWriterPool();
    case 'SUPERVISOR':
    case 'AUDITOR':
      return getSupervisorReaderPool();
    case 'STATE_ANALYST':
    case 'ANALYST':
      return getAnalyticsReaderPool();
    case 'CENTRAL_POLICY_VIEWER':
      return getAnalyticsReaderPool();
    default:
      // DENY BY DEFAULT: Unknown role gets no pool
      throw new Error(`No database pool available for role: ${role}`);
  }
}

/**
 * Verify database role permissions
 * Used for health checks and auditing
 */
export async function verifyRolePermissions() {
  const results = {};

  // Test api_writer
  try {
    const pool = getApiWriterPool();
    await pool.query('SELECT 1');
    results.apiWriter = { connected: true };
    
    // Verify cannot SELECT from census_submissions
    try {
      await pool.query('SELECT * FROM census_submissions LIMIT 1');
      results.apiWriter.canReadSubmissions = true; // This is BAD
    } catch (e) {
      results.apiWriter.canReadSubmissions = false; // This is GOOD
    }
  } catch (e) {
    results.apiWriter = { connected: false, error: e.message };
  }

  // Test audit_writer
  try {
    const pool = getAuditWriterPool();
    await pool.query('SELECT 1');
    results.auditWriter = { connected: true };
    
    // Verify cannot SELECT from audit_logs
    try {
      await pool.query('SELECT * FROM audit_logs LIMIT 1');
      results.auditWriter.canReadAuditLogs = true; // This is BAD
    } catch (e) {
      results.auditWriter.canReadAuditLogs = false; // This is GOOD
    }
  } catch (e) {
    results.auditWriter = { connected: false, error: e.message };
  }

  // Test analytics_reader
  try {
    const pool = getAnalyticsReaderPool();
    await pool.query('SELECT 1');
    results.analyticsReader = { connected: true };
    
    // Verify cannot SELECT from census_submissions
    try {
      await pool.query('SELECT * FROM census_submissions LIMIT 1');
      results.analyticsReader.canReadSubmissions = true; // This is BAD
    } catch (e) {
      results.analyticsReader.canReadSubmissions = false; // This is GOOD
    }
  } catch (e) {
    results.analyticsReader = { connected: false, error: e.message };
  }

  return results;
}

