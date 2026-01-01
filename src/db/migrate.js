import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB, getDB } from './connection.js';

/**
 * Database Migration Script
 * 
 * RESPONSIBILITY: Execute database schema initialization
 * 
 * MUST:
 * - Read and execute schema from init.sql
 * - Initialize database connection
 * - Handle migration errors gracefully
 * - Close connections after migration
 * 
 * MUST NEVER:
 * - Modify schema to violate trust-first principles
 * - Bypass security constraints
 * - Run in production without proper authorization
 * - Expose database credentials
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log('Initializing database connection...');
  initDB();
  const db = getDB();

  try {
    console.log('Reading schema file...');
    const schemaPath = join(__dirname, 'init.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    console.log('Executing schema...');
    await db.query(schema);

    console.log('✅ Database migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

migrate();

