/**
 * REGENERATE POLICY JSON
 * 
 * Purpose: 
 * Updates the static frontend JSON file with the latest data from the database.
 * Adds 'caste_category' field derived from macro aggregates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getPostgresConfig } from './db-config.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_JSON_PATH = path.join(__dirname, '../frontend/public/data/india_state_policy_analytics.json');

// Classification logic (Must match frontend/src/lib/stateCategories.ts)
function classifyState(composition) {
    if (!composition || composition.length === 0) return 'INSUFFICIENT_DATA';

    const total = composition.reduce((sum, c) => sum + Number(c.population_estimate), 0);
    if (total === 0) return 'INSUFFICIENT_DATA';

    // Calculate shares
    const shares = {};
    composition.forEach(c => {
        shares[c.category] = (Number(c.population_estimate) / total) * 100;
    });

    const obc = shares['OBC'] || 0;
    const sc = shares['SC'] || 0;
    const st = shares['ST'] || 0;
    const general = shares['GENERAL'] || 0;
    const sc_st = sc + st;

    // 1. General Predominant
    if (general > 45 && general > (obc * 1.2)) return 'GENERAL_PREDOMINANT';

    // 2. OBC Predominant
    if (obc > 45 && obc > (general * 1.2)) return 'OBC_PREDOMINANT';

    // 3. SC/ST Predominant
    if (sc_st > 40 && sc_st > general && sc_st > obc) return 'SC_ST_PREDOMINANT';

    // 4. Mixed (No clear majority)
    // If variance is high but no single dominant group
    if (Math.max(general, obc, sc_st) > 35) return 'MIXED_COMPOSITION';

    // 5. Highly Diverse (Flat distribution)
    return 'HIGHLY_DIVERSE';
}

async function run() {
    console.log('Connecting to database...');
    // Create pool using shared config
    const pool = new Pool(getPostgresConfig());

    try {
        // 1. Load existing JSON
        console.log(`Reading existing JSON from ${FRONTEND_JSON_PATH}...`);
        const jsonContent = fs.readFileSync(FRONTEND_JSON_PATH, 'utf8');
        const policyData = JSON.parse(jsonContent);

        // 2. Fetch latest macro aggregates for each state
        console.log('Fetching macro aggregates...');
        const query = `
            SELECT 
                ma.geographic_code as state_code, 
                ma.caste_category as category, 
                ma.noisy_population as population_estimate
            FROM macro_aggregates ma
            INNER JOIN (
                SELECT geographic_code, MAX(computed_at) as latest_date
                FROM macro_aggregates
                WHERE geographic_level = 'state'
                GROUP BY geographic_code
            ) latest ON ma.geographic_code = latest.geographic_code AND ma.computed_at = latest.latest_date
            WHERE ma.geographic_level = 'state'
        `;

        const result = await pool.query(query);
        const rows = result.rows;

        // Group by state
        const stateComposition = {};
        rows.forEach(row => {
            if (!stateComposition[row.state_code]) {
                stateComposition[row.state_code] = [];
            }
            stateComposition[row.state_code].push(row);
        });

        // 3. Update states in JSON
        console.log('Updating state categories...');
        let updateCount = 0;

        Object.keys(policyData.states).forEach(stateCode => {
            // Map JSON state code (e.g. "01") to DB state code
            // Note: DB macro_aggregates uses numeric string '01'.
            // policyData.states uses keys "01", etc.

            const dbStateCode = stateCode; // They match in format
            const composition = stateComposition[dbStateCode] || [];

            const casteCategory = classifyState(composition);

            // Update the JSON object
            policyData.states[stateCode].caste_category = casteCategory;

            // console.log(`State ${stateCode}: ${casteCategory} (${composition.length} categories found)`);
            updateCount++;
        });

        // 4. Write back to file
        console.log(`Writing updated JSON with ${updateCount} updates...`);
        fs.writeFileSync(FRONTEND_JSON_PATH, JSON.stringify(policyData, null, 2));
        console.log('Success! JSON Updated.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
