#!/usr/bin/env node
/**
 * Create Test Users Script
 * 
 * RESPONSIBILITY: Create test users for each role to verify system behavior
 * 
 * Creates:
 * - ENUMERATOR (test_enumerator) - For submission testing
 * - SUPERVISOR (test_supervisor) - For audit log testing
 * - STATE_ANALYST (test_analyst) - For aggregate access testing
 * - CENTRAL_POLICY_VIEWER (test_policy_viewer) - For national data testing
 * - CITIZEN (test_citizen) - For consent testing
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config({ path: join(__dirname, '..', '.env') });

import crypto from 'crypto';

// Generate random test passwords (different each run for security)
function generateTestPassword() {
  return `test_${crypto.randomBytes(8).toString('hex')}`;
}

// Fixed demo passwords for demo environment
// In production, use generateTestPassword() instead
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const DEMO_PASSWORDS = {
  test_enumerator: 'DemoEnum2024!',
  test_supervisor: 'DemoSuper2024!',
  test_analyst: 'DemoAnalyst2024!',
  test_analyst_other: 'DemoAnalyst2024!',
  test_policy_viewer: 'DemoPolicy2024!',
  test_citizen: 'DemoCitizen2024!',
};

function getPassword(username) {
  if (DEMO_MODE && DEMO_PASSWORDS[username]) {
    return DEMO_PASSWORDS[username];
  }
  return generateTestPassword();
}

const TEST_USERS = [
  {
    username: 'test_enumerator',
    password: getPassword('test_enumerator'),
    role: 'ENUMERATOR',
    scope: {
      functional: 'SUBMISSION',
      geographic: {
        level: 'DISTRICT',
        code: '0101', // Test district
        codes: ['0101001', '0101002'], // Test blocks
      },
    },
  },
  {
    username: 'test_supervisor',
    password: getPassword('test_supervisor'),
    role: 'SUPERVISOR',
    scope: {
      functional: 'OVERSIGHT',
      geographic: {
        level: 'STATE',
        code: 'MH', // Maharashtra
        codes: ['0101', '0102'], // Districts
      },
    },
  },
  {
    username: 'test_analyst',
    password: getPassword('test_analyst'),
    role: 'STATE_ANALYST',
    scope: {
      functional: 'ANALYSIS',
      geographic: {
        level: 'STATE',
        code: 'MH', // Maharashtra
        codes: ['0101', '0102'], // Districts
      },
    },
  },
  {
    username: 'test_analyst_other',
    password: getPassword('test_analyst_other'),
    role: 'STATE_ANALYST',
    scope: {
      functional: 'ANALYSIS',
      geographic: {
        level: 'STATE',
        code: 'KA', // Karnataka (different state for scope testing)
        codes: ['0201', '0202'],
      },
    },
  },
  {
    username: 'test_policy_viewer',
    password: getPassword('test_policy_viewer'),
    role: 'CENTRAL_POLICY_VIEWER',
    scope: {
      functional: 'POLICY_VIEW',
      geographic: {
        level: 'NATIONAL',
        code: 'IN',
        codes: [],
      },
    },
  },
  {
    username: 'test_citizen',
    password: getPassword('test_citizen'),
    role: 'CITIZEN',
    scope: {
      functional: 'CONSENT',
      geographic: {
        level: 'VILLAGE',
        code: '0101001001', // Test village
        codes: [],
      },
    },
  },
];

async function createTestUsers() {
  console.log('='.repeat(70));
  console.log('Creating Test Users');
  console.log('='.repeat(70));
  console.log('');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'trust_census',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Database connected');
    console.log('');

    for (const user of TEST_USERS) {
      console.log(`Creating user: ${user.username} (${user.role})...`);
      
      try {
        // Hash password
        const passwordHash = await bcrypt.hash(user.password, 10);
        
        // Check if user exists
        const existsResult = await client.query(
          'SELECT id FROM users WHERE username = $1',
          [user.username]
        );

        let userId;
        
        if (existsResult.rows.length > 0) {
          userId = existsResult.rows[0].id;
          console.log(`   ⚠️  User already exists (id: ${userId})`);
          
          // Update password and role
          await client.query(
            'UPDATE users SET password_hash = $1, role = $2 WHERE id = $3',
            [passwordHash, user.role, userId]
          );
        } else {
          // Insert new user
          const insertResult = await client.query(
            `INSERT INTO users (username, password_hash, role)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [user.username, passwordHash, user.role]
          );
          userId = insertResult.rows[0].id;
          console.log(`   ✅ User created (id: ${userId})`);
        }

        // Update or insert scope
        const scopeExists = await client.query(
          'SELECT id FROM user_scopes WHERE user_id = $1',
          [userId]
        );

        if (scopeExists.rows.length > 0) {
          await client.query(
            `UPDATE user_scopes 
             SET functional_scope = $1,
                 geographic_level = $2,
                 geographic_code = $3,
                 geographic_codes = $4
             WHERE user_id = $5`,
            [
              user.scope.functional,
              user.scope.geographic.level,
              user.scope.geographic.code,
              user.scope.geographic.codes,
              userId,
            ]
          );
          console.log(`   ✅ Scope updated`);
        } else {
          await client.query(
            `INSERT INTO user_scopes (user_id, functional_scope, geographic_level, geographic_code, geographic_codes)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              userId,
              user.scope.functional,
              user.scope.geographic.level,
              user.scope.geographic.code,
              user.scope.geographic.codes,
            ]
          );
          console.log(`   ✅ Scope created`);
        }
        
        console.log(`   Credentials: ${user.username} / ${user.password}`);
        console.log('');
      } catch (err) {
        console.log(`   ❌ Failed: ${err.message}`);
        console.log('');
      }
    }

    console.log('='.repeat(70));
    console.log('Test Users Summary');
    console.log('='.repeat(70));
    console.log('');
    console.log('| Username              | Role                  | Password                    |');
    console.log('|-----------------------|-----------------------|-----------------------------|');
    for (const user of TEST_USERS) {
      console.log(`| ${user.username.padEnd(21)} | ${user.role.padEnd(21)} | ${user.password.padEnd(27)} |`);
    }
    console.log('');

  } catch (err) {
    console.error('❌ Failed to create test users:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestUsers();

