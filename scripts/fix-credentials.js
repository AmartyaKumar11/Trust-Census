#!/usr/bin/env node
/**
 * Script to fix all hardcoded credentials in scripts
 * Replaces hardcoded database config with shared module import
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptsDir = __dirname;

// Files to update
const filesToUpdate = [
    'check-submissions.js',
    'check-submission-dates.js',
    'check-pipeline-status.js',
    'group-by-date.js',
    'show-all-submissions.js',
    'show-latest-aggregates.js',
    'force-refresh-aggregates.js',
];

// Pattern to find and replace (with Windows line endings)
const oldPatternRegex = /const client = new Client\(\{\s*host: '127\.0\.0\.1',\s*port: 5433,\s*database: 'trust_census',\s*user: 'postgres',\s*password: 'postgres',\s*\}\);/gs;

const newPattern = `const client = new Client(getPostgresConfig());`;

const importToAdd = `import { getPostgresConfig } from './db-config.js';\n`;

console.log('Fixing hardcoded credentials in scripts...\n');

let fixed = 0;
let skipped = 0;

for (const file of filesToUpdate) {
    const filePath = join(scriptsDir, file);

    try {
        let content = readFileSync(filePath, 'utf8');
        let modified = false;

        // Add import if not present
        if (!content.includes('db-config.js')) {
            // Add after pg import
            content = content.replace(
                /(import pg from 'pg';)/,
                `$1\n${importToAdd.trim()}`
            );
            modified = true;
        }

        // Replace hardcoded config
        if (oldPatternRegex.test(content)) {
            content = content.replace(oldPatternRegex, newPattern);
            modified = true;
        }

        if (modified) {
            writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${file} - fixed`);
            fixed++;
        } else {
            console.log(`✓ ${file} - already fixed`);
            skipped++;
        }

    } catch (error) {
        console.log(`❌ ${file} - error: ${error.message}`);
    }
}

console.log(`\nSummary: ${fixed} fixed, ${skipped} skipped`);
