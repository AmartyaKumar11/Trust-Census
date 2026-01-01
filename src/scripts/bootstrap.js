import bcrypt from 'bcryptjs';
import readline from 'readline';
import { initDB, getDB } from '../db/connection.js';

/**
 * Bootstrap Script
 * 
 * RESPONSIBILITY: Initial user creation for system setup
 * 
 * MUST:
 * - Create first user account securely
 * - Hash passwords with bcrypt
 * - Explicitly reject super-admin role
 * - Validate input before creation
 * - Be run in secure environment only
 * 
 * MUST NEVER:
 * - Create super-admin users
 * - Expose passwords or hashes
 * - Be exposed as API endpoint
 * - Bypass security constraints
 * - Run automatically in production
 * 
 * SECURITY NOTE: This script should be run in a secure environment
 * and the created credentials should be stored securely.
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function bootstrap() {
  console.log('=== Trust Census Bootstrap ===\n');
  console.log('This script will create the first user account.\n');

  const username = await question('Username: ');
  if (!username || username.length < 3) {
    console.error('Username must be at least 3 characters');
    process.exit(1);
  }

  const password = await question('Password (min 12 chars): ');
  if (!password || password.length < 12) {
    console.error('Password must be at least 12 characters');
    process.exit(1);
  }

  console.log('\nAvailable roles:');
  console.log('1. DATA_ENTRY - Can submit census data');
  console.log('2. AUDITOR - Can view audit logs');
  console.log('3. ANALYST - Can compute aggregates');
  console.log('\nNOTE: Super-admin role is NOT permitted in this system.\n');

  const roleChoice = await question('Select role (1-3): ');
  const roleMap = {
    '1': 'DATA_ENTRY',
    '2': 'AUDITOR',
    '3': 'ANALYST'
  };

  const role = roleMap[roleChoice];
  if (!role) {
    console.error('Invalid role selection');
    process.exit(1);
  }

  // Explicitly prevent super-admin
  if (role === 'SUPER_ADMIN') {
    console.error('Super-admin role is not permitted in this system');
    process.exit(1);
  }

  console.log('\nInitializing database...');
  initDB();
  const db = getDB();

  try {
    // Check if user exists
    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existing.rows.length > 0) {
      console.error('User already exists');
      process.exit(1);
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    console.log('Creating user...');
    const result = await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, passwordHash, role]
    );

    const user = result.rows[0];
    console.log('\n✅ User created successfully!');
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Role: ${user.role}`);
    console.log('\n⚠️  IMPORTANT: Store these credentials securely.');
    console.log('⚠️  The password cannot be recovered if lost.');

  } catch (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  } finally {
    await db.end();
    rl.close();
  }
}

bootstrap();

