#!/usr/bin/env node
import pg from 'pg';
import { getPostgresConfig } from './db-config.js';

const { Client } = pg;

async function groupByDate() {
    const client = new Client(getPostgresConfig());

    try {
        await client.connect();
        console.log('\n' + '='.repeat(80));
        console.log('MAHARASHTRA MACRO AGGREGATES GROUPED BY DATE');
        console.log('='.repeat(80) + '\n');

        const result = await client.query(`
      SELECT 
        computed_at::date as date,
        COUNT(*) as record_count,
        array_agg(DISTINCT caste_category ORDER BY caste_category) as categories
      FROM macro_aggregates
      WHERE geographic_code = 'MH'
      GROUP BY computed_at::date
      ORDER BY computed_at::date DESC
    `);

        result.rows.forEach(row => {
            console.log(`Date: ${row.date}`);
            console.log(`  Records: ${row.record_count}`);
            console.log(`  Categories: ${row.categories.join(', ')}`);
            console.log('');
        });

        // Show latest records
        console.log('='.repeat(80));
        console.log('LATEST RECORDS (most recent computed_at):');
        console.log('='.repeat(80) + '\n');

        const latest = await client.query(`
      SELECT 
        caste_category,
        noisy_population,
        noisy_submission_count,
        computed_at
      FROM macro_aggregates
      WHERE geographic_code = 'MH'
      ORDER BY computed_at DESC
      LIMIT 10
    `);

        latest.rows.forEach(row => {
            console.log(`${row.caste_category}: ${row.noisy_population} (${row.noisy_submission_count} submissions) - ${row.computed_at}`);
        });
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

groupByDate();
