#!/usr/bin/env node
import pg from 'pg';
import { getPostgresConfig } from './db-config.js';

const { Client } = pg;

async function checkSubmissionDates() {
    const client = new Client(getPostgresConfig());

    try {
        await client.connect();
        console.log('\n' + '='.repeat(80));
        console.log('SUBMISSION DATES FOR MAHARASHTRA');
        console.log('='.repeat(80) + '\n');

        const result = await client.query(`
      SELECT 
        caste_category,
        COUNT(*) as count,
        MIN(submitted_at) as earliest,
        MAX(submitted_at) as latest,
        NOW() as current_time,
        NOW() - MAX(submitted_at) as age
      FROM census_submissions
      WHERE state_code = 'MH'
      GROUP BY caste_category
      ORDER BY caste_category
    `);

        if (result.rows.length === 0) {
            console.log('⚠️  No submissions found\n');
        } else {
            result.rows.forEach(row => {
                console.log(`Category: ${row.caste_category}`);
                console.log(`  Count: ${row.count}`);
                console.log(`  Earliest: ${row.earliest}`);
                console.log(`  Latest: ${row.latest}`);
                console.log(`  Age: ${row.age}`);
                console.log('');
            });

            console.log(`Current time: ${result.rows[0].current_time}`);
            console.log('');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

checkSubmissionDates();
