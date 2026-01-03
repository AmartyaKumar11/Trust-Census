#!/usr/bin/env node
/**
 * Force Refresh Aggregates
 * 
 * This script clears the macro_aggregates table and forces
 * a complete reprocessing of all data.
 */

import pg from 'pg';
import { getPostgresConfig } from './db-config.js';

const { Client } = pg;

async function forceRefresh() {
    const client = new Client(getPostgresConfig());

    try {
        await client.connect();
        console.log('\n' + '='.repeat(80));
        console.log('FORCE REFRESH AGGREGATES');
        console.log('='.repeat(80) + '\n');

        // Clear macro_aggregates
        console.log('Clearing macro_aggregates table...');
        await client.query('DELETE FROM macro_aggregates');
        console.log('✅ Macro aggregates cleared');

        // Clear micro_aggregates
        console.log('Clearing micro_aggregates table...');
        await client.query('DELETE FROM micro_aggregates');
        console.log('✅ Micro aggregates cleared\n');

        console.log('Now run the aggregation worker to reprocess all data:');
        console.log('  node scripts/run-aggregation-latest.js\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

forceRefresh();
