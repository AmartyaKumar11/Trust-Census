#!/usr/bin/env node
import pg from 'pg';
import { getPostgresConfig } from './db-config.js';

const { Client } = pg;

async function checkSubmissions() {
    const client = new Client(getPostgresConfig());

    try {
        await client.connect();
        console.log('\n' + '='.repeat(80));
        console.log('CENSUS SUBMISSIONS FOR MAHARASHTRA (MH)');
        console.log('='.repeat(80) + '\n');

        const result = await client.query(`
      SELECT 
        caste_category,
        COUNT(*) as submission_count,
        SUM(population_count) as total_population,
        MAX(submitted_at) as latest_submission
      FROM census_submissions
      WHERE state_code = 'MH'
      GROUP BY caste_category
      ORDER BY caste_category
    `);

        if (result.rows.length === 0) {
            console.log('⚠️  No submissions found for Maharashtra (MH)');
            console.log('   You may need to add submissions first.\n');
        } else {
            console.log('Category'.padEnd(20) + 'Submissions'.padEnd(15) + 'Population'.padEnd(15) + 'Latest Submission');
            console.log('-'.repeat(80));

            result.rows.forEach(row => {
                console.log(
                    row.caste_category.padEnd(20) +
                    String(row.submission_count).padEnd(15) +
                    String(row.total_population).padEnd(15) +
                    new Date(row.latest_submission).toLocaleString()
                );
            });

            console.log('\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

checkSubmissions();
