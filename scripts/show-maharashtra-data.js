#!/usr/bin/env node
import pg from 'pg';
import { getPostgresConfig } from './db-config.js';

const { Client } = pg;

async function showMaharashtraData() {
    const client = new Client(getPostgresConfig());

    try {
        await client.connect();
        console.log('\n' + '='.repeat(80));
        console.log('MAHARASHTRA CASTE COMPOSITION DATA');
        console.log('='.repeat(80) + '\n');

        const result = await client.query(`
      SELECT 
        caste_category,
        noisy_population,
        noisy_submission_count,
        aggregation_window_id,
        computed_at
      FROM macro_aggregates
      WHERE geographic_code = 'MH'
      ORDER BY caste_category
    `);

        if (result.rows.length === 0) {
            console.log('⚠️  No data found for Maharashtra (MH)');
            console.log('   The macro_aggregates table may be empty.');
            console.log('   You may need to run the aggregation worker or seed test data.\n');
        } else {
            console.log('Category'.padEnd(20) + 'Population'.padEnd(15) + 'Submissions'.padEnd(15) + 'Window ID');
            console.log('-'.repeat(80));

            let totalPop = 0;
            result.rows.forEach(row => {
                console.log(
                    row.caste_category.padEnd(20) +
                    String(row.noisy_population).padEnd(15) +
                    String(row.noisy_submission_count).padEnd(15) +
                    (row.aggregation_window_id || 'N/A')
                );
                totalPop += parseInt(row.noisy_population);
            });

            console.log('-'.repeat(80));
            console.log('TOTAL'.padEnd(20) + String(totalPop).padEnd(15));
            console.log('\n📊 Computed at: ' + (result.rows[0]?.computed_at || 'N/A'));
            console.log('🔒 Note: Values are privacy-noised estimates\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

showMaharashtraData();
