#!/usr/bin/env node
/**
 * Run Aggregation Worker with Latest Data
 * 
 * This script runs the aggregation worker configured to include
 * all data up to the current moment, ensuring the map shows
 * the latest submissions.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('='.repeat(70));
console.log('Running Aggregation Worker with Latest Data');
console.log('='.repeat(70));
console.log('');
console.log('This will process ALL submissions including today\'s data');
console.log('and update the macro_aggregates table for the map.');
console.log('');

// Set environment variables
const env = {
    ...process.env,
    AGGREGATION_INCLUDE_TODAY: 'true', // Include today's data
};

// Run the aggregation worker
const worker = spawn('node', ['src/workers/aggregation/index.js'], {
    cwd: projectRoot,
    env: env,
    stdio: 'inherit',
});

worker.on('close', (code) => {
    console.log('');
    console.log('='.repeat(70));
    if (code === 0) {
        console.log('✅ Aggregation completed successfully!');
        console.log('');
        console.log('The map should now show the latest data.');
        console.log('Refresh your browser to see the updated analytics.');
    } else {
        console.log(`❌ Aggregation failed with code ${code}`);
    }
    console.log('='.repeat(70));
    console.log('');
    process.exit(code);
});

worker.on('error', (err) => {
    console.error('❌ Failed to start aggregation worker:', err.message);
    process.exit(1);
});
