#!/usr/bin/env node
/**
 * Shared Database Configuration
 * 
 * Loads database credentials from environment variables.
 * Used by all scripts to avoid hardcoding credentials.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Get database configuration for postgres user (admin)
 */
export function getPostgresConfig() {
    return {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5433'),
        database: process.env.DB_NAME || 'trust_census',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
    };
}

/**
 * Get database configuration for aggregation worker
 */
export function getAggregationWorkerConfig() {
    return {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5433'),
        database: process.env.DB_NAME || 'trust_census',
        user: process.env.DB_AGGREGATION_WORKER_USER || 'aggregation_worker',
        password: process.env.DB_AGGREGATION_WORKER_PASSWORD,
    };
}

/**
 * Validate that required environment variables are set
 */
export function validateEnv() {
    const required = ['DB_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\nPlease ensure .env file exists with all required variables.');
        process.exit(1);
    }
}
