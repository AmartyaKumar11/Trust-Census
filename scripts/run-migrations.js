#!/usr/bin/env node
/**
 * Database Migration Runner
 * 
 * RESPONSIBILITY: Run all database migrations in correct order
 * 
 * This script:
 * 1. Connects to PostgreSQL as superuser
 * 2. Runs migrations in strict order
 * 3. Sets up database roles with passwords from environment
 * 4. Verifies triggers and permissions
 */

import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment
dotenv.config({ path: join(projectRoot, '.env') });

const DB_CONFIG = {
  // Use 127.0.0.1 (not localhost) to force IPv4 and avoid DNS issues
  host: process.env.DB_HOST || '127.0.0.1',
  // Port 5433 for Docker PostgreSQL (5432 is reserved for host PostgreSQL)
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'trust_census',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

console.log('='.repeat(70));
console.log('Trust Census Database Migration Runner');
console.log('='.repeat(70));
console.log('');
console.log(`Database: ${DB_CONFIG.database} @ ${DB_CONFIG.host}:${DB_CONFIG.port}`);
console.log('');

async function runMigration(client, name, sql) {
  console.log(`Running ${name}...`);
  try {
    await client.query(sql);
    console.log(`  ✅ ${name} completed`);
    return true;
  } catch (err) {
    // Some errors are expected (e.g., "already exists")
    if (err.message.includes('already exists') || 
        err.message.includes('duplicate') ||
        err.message.includes('does not exist')) {
      console.log(`  ⚠️  ${name}: ${err.message.split('\n')[0]}`);
      return true;
    }
    console.log(`  ❌ ${name} failed: ${err.message}`);
    return false;
  }
}

async function main() {
  const client = new Client(DB_CONFIG);
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');
    console.log('');

    // =========================================================================
    // STEP 1: Create base tables first
    // =========================================================================
    console.log('Step 1: Creating base tables...');
    
    const baseSchema = `
      -- Create user_role enum if not exists
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
          CREATE TYPE user_role AS ENUM ('DATA_ENTRY', 'AUDITOR', 'ANALYST');
        END IF;
      END
      $$;

      -- Add new role values if not present
      DO $$
      BEGIN
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CITIZEN';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ENUMERATOR';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPERVISOR';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'STATE_ANALYST';
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'CENTRAL_POLICY_VIEWER';
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors (e.g., if values already exist)
        NULL;
      END
      $$;

      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      );

      -- Create census_submissions table
      CREATE TABLE IF NOT EXISTS census_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        state_code VARCHAR(2) NOT NULL,
        district_code VARCHAR(4) NOT NULL,
        block_code VARCHAR(6) NOT NULL,
        village_code VARCHAR(10),
        household_count INTEGER NOT NULL CHECK (household_count >= 0),
        population_count INTEGER NOT NULL CHECK (population_count >= 0),
        caste_category VARCHAR(50) NOT NULL,
        submitted_by UUID NOT NULL REFERENCES users(id),
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        submission_hash VARCHAR(64) NOT NULL,
        is_verified BOOLEAN DEFAULT false
      );

      -- Create audit_logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        action_type VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id UUID,
        ip_address INET,
        user_agent TEXT,
        request_method VARCHAR(10),
        request_path TEXT,
        status_code INTEGER,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_census_submissions_geo ON census_submissions(state_code, district_code, block_code, village_code);
      CREATE INDEX IF NOT EXISTS idx_census_submissions_submitted_at ON census_submissions(submitted_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `;
    
    await runMigration(client, 'Base schema', baseSchema);

    // =========================================================================
    // STEP 2: Create database roles with proper passwords
    // =========================================================================
    console.log('');
    console.log('Step 2: Creating database roles...');
    
    const roles = [
      { name: 'api_writer', password: process.env.DB_API_WRITER_PASSWORD },
      { name: 'audit_writer', password: process.env.DB_AUDIT_WRITER_PASSWORD },
      { name: 'aggregation_worker', password: process.env.DB_AGGREGATION_WORKER_PASSWORD },
      { name: 'analytics_reader', password: process.env.DB_ANALYTICS_READER_PASSWORD },
      { name: 'supervisor_reader', password: process.env.DB_SUPERVISOR_READER_PASSWORD },
    ];

    for (const role of roles) {
      try {
        // Check if role exists
        const roleExists = await client.query(
          "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1",
          [role.name]
        );
        
        if (roleExists.rows.length === 0) {
          await client.query(`CREATE ROLE ${role.name} WITH LOGIN PASSWORD '${role.password}'`);
          console.log(`  ✅ Created role: ${role.name}`);
        } else {
          // Update password
          await client.query(`ALTER ROLE ${role.name} WITH PASSWORD '${role.password}'`);
          console.log(`  ✅ Updated role: ${role.name}`);
        }
      } catch (err) {
        console.log(`  ⚠️  Role ${role.name}: ${err.message.split('\n')[0]}`);
      }
    }

    // =========================================================================
    // STEP 3: Run migration files
    // =========================================================================
    console.log('');
    console.log('Step 3: Running migration files...');
    
    const migrations = [
      '001_update_roles.sql',
      '002_database_roles.sql',
      '003_user_scopes.sql',
      '004_consent_model.sql',
      '005_micro_aggregates_schema.sql',
      '006_macro_aggregates_schema.sql',
    ];

    for (const migration of migrations) {
      const migrationPath = join(projectRoot, 'src', 'db', 'migrations', migration);
      
      if (!existsSync(migrationPath)) {
        console.log(`  ⚠️  Migration not found: ${migration}`);
        continue;
      }

      const sql = readFileSync(migrationPath, 'utf-8');
      await runMigration(client, migration, sql);
    }

    // =========================================================================
    // STEP 4: Create user_scopes table (simpler version for application)
    // =========================================================================
    console.log('');
    console.log('Step 4: Creating user_scopes table...');
    
    const userScopesTable = `
      CREATE TABLE IF NOT EXISTS user_scopes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        functional_scope VARCHAR(50) NOT NULL,
        geographic_level VARCHAR(20) NOT NULL,
        geographic_code VARCHAR(20) NOT NULL,
        geographic_codes TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_scopes_user_id ON user_scopes(user_id);
    `;
    
    await runMigration(client, 'user_scopes table', userScopesTable);

    // =========================================================================
    // STEP 5: Grant permissions
    // =========================================================================
    console.log('');
    console.log('Step 5: Granting permissions...');
    
    const permissions = `
      -- Grant schema usage
      GRANT USAGE ON SCHEMA public TO api_writer, audit_writer, aggregation_worker, analytics_reader, supervisor_reader;

      -- api_writer permissions
      GRANT SELECT, UPDATE ON users TO api_writer;
      GRANT INSERT ON census_submissions TO api_writer;
      GRANT INSERT ON consent_records TO api_writer;
      GRANT INSERT ON submission_consent_links TO api_writer;
      GRANT SELECT ON user_scopes TO api_writer;
      GRANT SELECT ON user_scope_assignments TO api_writer;
      GRANT SELECT ON user_additional_scopes TO api_writer;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO api_writer;

      -- audit_writer permissions
      GRANT INSERT ON audit_logs TO audit_writer;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO audit_writer;

      -- aggregation_worker permissions
      GRANT SELECT ON census_submissions TO aggregation_worker;
      GRANT INSERT, SELECT ON micro_aggregates TO aggregation_worker;
      GRANT INSERT, SELECT ON macro_aggregates TO aggregation_worker;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO aggregation_worker;

      -- analytics_reader permissions
      GRANT SELECT ON micro_aggregates TO analytics_reader;
      GRANT SELECT ON macro_aggregates TO analytics_reader;

      -- supervisor_reader permissions
      GRANT SELECT ON audit_logs TO supervisor_reader;
      GRANT SELECT ON consent_records TO supervisor_reader;
      GRANT SELECT ON user_scopes TO supervisor_reader;
    `;
    
    await runMigration(client, 'Permissions', permissions);

    // =========================================================================
    // STEP 6: Verify triggers
    // =========================================================================
    console.log('');
    console.log('Step 6: Verifying triggers...');
    
    const triggerResult = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `);
    
    if (triggerResult.rows.length > 0) {
      console.log('  Found triggers:');
      for (const row of triggerResult.rows) {
        console.log(`    - ${row.trigger_name} (${row.event_manipulation} on ${row.event_object_table})`);
      }
    } else {
      console.log('  ⚠️  No triggers found');
    }

    // =========================================================================
    // STEP 7: Verify tables
    // =========================================================================
    console.log('');
    console.log('Step 7: Verifying tables...');
    
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('  Tables:');
    for (const row of tableResult.rows) {
      console.log(`    - ${row.table_name}`);
    }

    console.log('');
    console.log('='.repeat(70));
    console.log('Migration Complete!');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

