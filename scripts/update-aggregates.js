#!/usr/bin/env node
/**
 * Update Aggregates - Complete Pipeline
 * 
 * This script runs the full aggregation pipeline (L1→L2→L3)
 * with a 30-day lookback window to ensure ALL recent data is processed.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('='.repeat(70));
console.log('UPDATING AGGREGATES - COMPLETE PIPELINE');
console.log('='.repeat(70));
console.log('');
console.log('Processing ALL submissions from the last 30 days...');
console.log('This ensures the map shows complete, up-to-date analytics.');
console.log('');

// Set environment variables for maximum data inclusion
const env = {
    ...process.env,
    AGGREGATION_INCLUDE_TODAY: 'true',
    // Override lookback period to 30 days
    AGGREGATION_LOOKBACK_DAYS: '30',
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
        console.log('✅ Aggregation pipeline completed!');
        console.log('');
        console.log('📊 Checking updated data...');
        console.log('');

        // Run the show-maharashtra-data script
        const check = spawn('node', ['scripts/show-maharashtra-data.js'], {
            cwd: projectRoot,
            stdio: 'inherit',
        });

        check.on('close', () => {
            console.log('');
            console.log('🎉 The map should now show the latest data!');
            console.log('   Refresh your browser to see updated analytics.');
            console.log('');
        });
    } else {
        console.log(`❌ Aggregation failed with code ${code}`);
        console.log('');
    }
    console.log('='.repeat(70));
});

worker.on('error', (err) => {
    console.error('❌ Failed to start aggregation worker:', err.message);
    process.exit(1);
});
