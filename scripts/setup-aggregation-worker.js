#!/usr/bin/env node
import pg from 'pg';
import { getPostgresConfig } from './db-config.js';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function setup() {
  const client = new Client(getPostgresConfig());

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get password from environment
    const workerPassword = process.env.DB_AGGREGATION_WORKER_PASSWORD;

    if (!workerPassword) {
      console.error('❌ DB_AGGREGATION_WORKER_PASSWORD not set in .env file');
      process.exit(1);
    }

    // Create aggregation_worker role
    console.log('Creating aggregation_worker role...');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aggregation_worker') THEN
          CREATE ROLE aggregation_worker WITH LOGIN PASSWORD '${workerPassword}';
        ELSE
          ALTER ROLE aggregation_worker WITH PASSWORD '${workerPassword}';
        END IF;
      END
      $$;
    `);

    console.log('✅ Role created/updated');

    // Grant permissions
    console.log('Granting permissions...');
    await client.query(`GRANT CONNECT ON DATABASE trust_census TO aggregation_worker`);
    await client.query(`GRANT USAGE ON SCHEMA public TO aggregation_worker`);
    await client.query(`GRANT SELECT ON census_submissions TO aggregation_worker`);
    await client.query(`GRANT SELECT, INSERT ON micro_aggregates TO aggregation_worker`);
    await client.query(`GRANT SELECT, INSERT ON macro_aggregates TO aggregation_worker`);

    console.log('✅ Permissions granted\n');
    console.log('🎉 Setup complete! Now run:\n');
    console.log('   node src/workers/aggregation/index.js\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setup();
