#!/usr/bin/env node
import pg from 'pg';
import { getPostgresConfig } from './db-config.js';

const { Client } = pg;

async function showAllSubmissions() {
    const client = new Client(getPostgresConfig());

    try {
        await client.connect();
        console.log('\n' + '='.repeat(80));
        console.log('ALL MAHARASHTRA SUBMISSIONS (DETAILED)');
        console.log('='.repeat(80) + '\n');

        const result = await client.query(`
      SELECT 
        caste_category,
        population_count,
        household_count,
        submitted_at,
        submitted_at::date as submission_date
      FROM census_submissions
      WHERE state_code = 'MH'
      ORDER BY submitted_at DESC
    `);

        if (result.rows.length === 0) {
            console.log('⚠️  No submissions found\n');
        } else {
            console.log(`Total submissions: ${result.rows.length}\n`);

            result.rows.forEach((row, idx) => {
                console.log(`${idx + 1}. ${row.caste_category}`);
                console.log(`   Population: ${row.population_count}`);
                console.log(`   Households: ${row.household_count}`);
                console.log(`   Submitted: ${row.submitted_at}`);
                console.log(`   Date: ${row.submission_date}`);
                console.log('');
            });

            // Group by date
            const byDate = {};
            result.rows.forEach(row => {
                const date = row.submission_date;
                if (!byDate[date]) byDate[date] = [];
                byDate[date].push(row);
            });

            console.log('='.repeat(80));
            console.log('SUMMARY BY DATE:');
            console.log('='.repeat(80));
            Object.keys(byDate).sort().reverse().forEach(date => {
                console.log(`\n${date}: ${byDate[date].length} submissions`);
                const categories = {};
                byDate[date].forEach(r => {
                    if (!categories[r.caste_category]) categories[r.caste_category] = 0;
                    categories[r.caste_category]++;
                });
                Object.keys(categories).forEach(cat => {
                    console.log(`  - ${cat}: ${categories[cat]}`);
                });
            });
            console.log('');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

showAllSubmissions();
