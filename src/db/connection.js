import pg from 'pg';
import dns from 'dns';

const { Pool } = pg;

// Force IPv4 resolution to avoid Docker networking issues on Windows
dns.setDefaultResultOrder('ipv4first');

let pool = null;

/**
 * Database Connection Management
 * 
 * RESPONSIBILITY: Database connection pool initialization and lifecycle
 * 
 * CONFIGURATION:
 * - Default port: 5433 (Docker PostgreSQL)
 * - Port 5432 is reserved for host PostgreSQL and MUST NOT be used
 * - IPv4 is forced to ensure deterministic Docker connectivity
 * 
 * MUST:
 * - Provide connection pooling for performance
 * - Handle connection lifecycle (init, get, close)
 * - Manage connection pool configuration
 * - Handle pool errors gracefully
 * - Connect to Docker PostgreSQL on port 5433
 * 
 * MUST NEVER:
 * - Contain business logic
 * - Expose raw queries to routes
 * - Bypass security constraints
 * - Allow connection pool exhaustion
 * - Store credentials in code
 * - Use port 5432 (reserved for host PostgreSQL)
 */
export function initDB() {
  if (pool) {
    return pool;
  }

  const config = {
    // Explicit IPv4 address to avoid DNS resolution issues
    host: process.env.DB_HOST || '127.0.0.1',
    // Port 5433 for Docker PostgreSQL (5432 is reserved for host PostgreSQL)
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'trust_census',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  pool = new Pool(config);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  console.log(`[DB] Main pool configured: ${config.host}:${config.port}/${config.database}`);

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

/**
 * Verify database connection and log server info
 * Used at startup to confirm connection to correct PostgreSQL instance
 * 
 * @returns {Promise<object>} Server information
 */
export async function verifyDatabaseConnection() {
  const db = getDB();
  
  try {
    // Query PostgreSQL server info to verify we're connected to the right instance
    const result = await db.query(`
      SELECT 
        version() as server_version,
        inet_server_addr() as server_addr,
        inet_server_port() as server_port,
        current_database() as database_name,
        current_user as connected_user
    `);
    
    const info = result.rows[0];
    
    console.log('[DB] Connection verified:');
    console.log(`     Server: ${info.server_version?.split(',')[0] || 'Unknown'}`);
    console.log(`     Address: ${info.server_addr || 'local'}:${info.server_port || 'unknown'}`);
    console.log(`     Database: ${info.database_name}`);
    console.log(`     User: ${info.connected_user}`);
    
    return {
      connected: true,
      serverVersion: info.server_version,
      serverAddr: info.server_addr,
      serverPort: info.server_port,
      database: info.database_name,
      user: info.connected_user,
    };
  } catch (err) {
    console.error('[DB] Connection verification FAILED:', err.message);
    return {
      connected: false,
      error: err.message,
    };
  }
}

