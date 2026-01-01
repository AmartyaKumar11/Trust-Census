import pg from 'pg';
const { Pool } = pg;

let pool = null;

/**
 * Initialize database connection pool
 * Connection pooling for performance and security
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

