#!/usr/bin/env node
import pg from 'pg';
import { getPostgresConfig } from './db-config.js';

const { Client } = pg;

async function checkPipeline() {
    const client = new Client(getPostgresConfig());

    try {
        await client.connect();
        console.log('\n' + '='.repeat(80));
        console.log('AGGREGATION PIPELINE STATUS');
        console.log('='.repeat(80) + '\n');

        // Check L1 (census_submissions)
        const l1 = await client.query(`
      SELECT COUNT(*) as count, MAX(submitted_at) as latest
      FROM census_submissions WHERE state_code = 'MH'
    `);
        console.log('L1 (census_submissions):');
        console.log(`  Count: ${l1.rows[0].count}`);
        console.log(`  Latest: ${l1.rows[0].latest}`);
        console.log('');

        // Check L2 (micro_aggregates)
        const l2 = await client.query(`
      SELECT COUNT(*) as count, MAX(computed_at) as latest
      FROM micro_aggregates WHERE geographic_code LIKE 'MH%' OR geographic_code = 'MH'
    `);
        console.log('L2 (micro_aggregates):');
        console.log(`  Count: ${l2.rows[0].count}`);
        console.log(`  Latest: ${l2.rows[0].latest || 'N/A'}`);
        console.log('');

        // Check L3 (macro_aggregates)
        const l3 = await client.query(`
      SELECT COUNT(*) as count, MAX(computed_at) as latest
      FROM macro_aggregates WHERE geographic_code = 'MH'
    `);
        console.log('L3 (macro_aggregates):');
        console.log(`  Count: ${l3.rows[0].count}`);
        console.log(`  Latest: ${l3.rows[0].latest || 'N/A'}`);
        console.log('');

        if (l1.rows[0].count > 0 && l2.rows[0].count == 0) {
            console.log('⚠️  Issue: L1 has data but L2 is empty');
            console.log('   The micro-aggregation stage (L1→L2) needs to run first.');
            console.log('');
        }

        if (l2.rows[0].count > 0 && l3.rows[0].count == 0) {
            console.log('⚠️  Issue: L2 has data but L3 is empty');
            console.log('   The macro-aggregation stage (L2→L3) needs to run.');
            console.log('');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

checkPipeline();
