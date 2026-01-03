#!/usr/bin/env node
import pg from 'pg';
import { getPostgresConfig } from './db-config.js';

const { Client } = pg;

async function showLatestAggregates() {
    const client = new Client(getPostgresConfig());

    try {
        await client.connect();
        console.log('\n' + '='.repeat(80));
        console.log('LATEST MACRO AGGREGATES FOR MAHARASHTRA');
        console.log('='.repeat(80) + '\n');

        const result = await client.query(`
      SELECT 
        caste_category,
        noisy_population,
        noisy_submission_count,
        aggregation_window_id,
        computed_at,
        id
      FROM macro_aggregates
      WHERE geographic_code = 'MH'
      ORDER BY computed_at DESC, id DESC
    `);

        if (result.rows.length === 0) {
            console.log('⚠️  No macro aggregates found\n');
        } else {
            console.log(`Total records: ${result.rows.length}\n`);

            result.rows.forEach((row, idx) => {
                console.log(`${idx + 1}. ${row.caste_category}`);
                console.log(`   Population: ${row.noisy_population}`);
                console.log(`   Submissions: ${row.noisy_submission_count}`);
                console.log(`   Window: ${row.aggregation_window_id}`);
                console.log(`   Computed: ${row.computed_at}`);
                console.log(`   ID: ${row.id}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

showLatestAggregates();
