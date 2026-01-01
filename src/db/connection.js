import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Database Connection Management
 * 
 * RESPONSIBILITY: Database connection pool initialization and lifecycle
 * 
 * MUST:
 * - Provide connection pooling for performance
 * - Handle connection lifecycle (init, get, close)
 * - Manage connection pool configuration
 * - Handle pool errors gracefully
 * 
 * MUST NEVER:
 * - Contain business logic
 * - Expose raw queries to routes
 * - Bypass security constraints
 * - Allow connection pool exhaustion
 * - Store credentials in code
 */
export function initDB() {
  if (pool) {
    return pool;
  }

  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'trust_census',
    user: process.env.DB_USER || 'census_user',
    password: process.env.DB_PASSWORD,
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  return pool;
}

/**
 * Get database connection pool
 */
export function getDB() {
  if (!pool) {
    return initDB();
  }
  return pool;
}

/**
 * Close database connection pool
 */
export async function closeDB() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

