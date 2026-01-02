#!/usr/bin/env node
/**
 * System Verification Script
 * 
 * RESPONSIBILITY: Verify all trust-first invariants at runtime
 * 
 * Tests:
 * 1. Submission without consent → MUST FAIL
 * 2. Consent creation → MUST SUCCEED
 * 3. Submission with consent → MUST SUCCEED
 * 4. Read raw submission → MUST FAIL
 * 5. Trigger aggregation via API → MUST FAIL
 * 6. Analytics access within scope → MUST SUCCEED
 * 7. Analytics access outside scope → MUST FAIL
 * 8. Export/download → MUST FAIL
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
dotenv.config({ path: join(__dirname, '..', '.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function logResult(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${testName}`);
  if (details) {
    console.log(`        ${details}`);
  }
  results.tests.push({ name: testName, passed, details });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data, ok: response.ok };
  } catch (err) {
    return { status: 0, data: { error: err.message }, ok: false };
  }
}

async function login(username, password) {
  const response = await fetchJson(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  
  if (response.ok && response.data.token) {
    return response.data.token;
  }
  return null;
}

// =============================================================================
// Test 1: Health Check
// =============================================================================
async function testHealthCheck() {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 1: Health Check');
  console.log('='.repeat(70));
  
  const response = await fetchJson(`${BASE_URL}/health`);
  logResult(
    'Health endpoint returns 200',
    response.status === 200,
    `Status: ${response.status}, Body: ${JSON.stringify(response.data)}`
  );
}

// =============================================================================
// Test 2: Authentication
// =============================================================================
async function testAuthentication() {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 2: Authentication');
  console.log('='.repeat(70));
  
  // Test invalid credentials
  const invalidResponse = await fetchJson(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: 'invalid', password: 'invalid' }),
  });
  logResult(
    'Invalid credentials rejected',
    invalidResponse.status === 401,
    `Status: ${invalidResponse.status}`
  );

  // Test valid enumerator login
  const enumeratorToken = await login('test_enumerator', 'enumerator_test_pwd_2024');
  logResult(
    'Enumerator login succeeds',
    enumeratorToken !== null,
    enumeratorToken ? 'Token received' : 'No token'
  );

  return { enumeratorToken };
}

// =============================================================================
// Test 3: Submission Without Consent (MUST FAIL)
// =============================================================================
async function testSubmissionWithoutConsent(token) {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 3: Submission Without Consent (MUST FAIL)');
  console.log('='.repeat(70));
  
  const response = await fetchJson(`${BASE_URL}/submissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      stateCode: 'MH',
      districtCode: '0101',
      blockCode: '0101001',
      villageCode: '0101001001',
      casteCategory: 'SC',
      populationCount: 100,
      householdCount: 20,
      receiptId: 'nonexistent-receipt-id',
    }),
  });
  
  logResult(
    'Submission without consent fails',
    response.status === 400 || response.status === 403,
    `Status: ${response.status}, Error: ${response.data?.error || 'none'}`
  );
}

// =============================================================================
// Test 4: Consent Creation
// =============================================================================
async function testConsentCreation(token) {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 4: Consent Creation');
  console.log('='.repeat(70));
  
  const response = await fetchJson(`${BASE_URL}/consent/capture`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      consentTextVersion: 'v1.0',
      stateCode: 'MH',
      districtCode: '0101',
      blockCode: '0101001',
      villageCode: '0101001001',
    }),
  });
  
  const passed = response.status === 201 && response.data?.receiptId;
  logResult(
    'Consent creation succeeds',
    passed,
    `Status: ${response.status}, Receipt: ${response.data?.receiptId || 'none'}`
  );
  
  return response.data?.receiptId;
}

// =============================================================================
// Test 5: Submission With Consent
// =============================================================================
async function testSubmissionWithConsent(token, receiptId) {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 5: Submission With Consent');
  console.log('='.repeat(70));
  
  const response = await fetchJson(`${BASE_URL}/submissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      stateCode: 'MH',
      districtCode: '0101',
      blockCode: '0101001',
      villageCode: '0101001001',
      casteCategory: 'SC',
      populationCount: 100,
      householdCount: 20,
      receiptId: receiptId,
    }),
  });
  
  const passed = response.status === 201 && response.data?.receiptId;
  logResult(
    'Submission with consent succeeds',
    passed,
    `Status: ${response.status}, Receipt: ${response.data?.receiptId || 'none'}`
  );
  
  return response.data?.receiptId;
}

// =============================================================================
// Test 6: Read Raw Submission (MUST FAIL)
// =============================================================================
async function testReadRawSubmission(token, submissionReceiptId) {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 6: Read Raw Submission (MUST FAIL)');
  console.log('='.repeat(70));
  
  // Try to read submission by receipt ID
  const response = await fetchJson(`${BASE_URL}/submissions/${submissionReceiptId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  
  logResult(
    'Raw submission read fails (404 or 403)',
    response.status === 404 || response.status === 403,
    `Status: ${response.status}`
  );
  
  // Try to list all submissions
  const listResponse = await fetchJson(`${BASE_URL}/submissions`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  
  logResult(
    'Submission listing fails (404 or 403)',
    listResponse.status === 404 || listResponse.status === 403,
    `Status: ${listResponse.status}`
  );
}

// =============================================================================
// Test 7: Trigger Aggregation via API (MUST FAIL)
// =============================================================================
async function testAggregationViaApi(token) {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 7: Trigger Aggregation via API (MUST FAIL)');
  console.log('='.repeat(70));
  
  // Try to trigger micro-aggregation
  const microResponse = await fetchJson(`${BASE_URL}/aggregates/compute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  
  logResult(
    'Micro-aggregation trigger fails (403)',
    microResponse.status === 403,
    `Status: ${microResponse.status}, Error: ${microResponse.data?.error || 'none'}`
  );
  
  // Try to trigger macro-aggregation
  const macroResponse = await fetchJson(`${BASE_URL}/aggregates/compute/macro`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  
  logResult(
    'Macro-aggregation trigger fails (403)',
    macroResponse.status === 403,
    `Status: ${macroResponse.status}, Error: ${macroResponse.data?.error || 'none'}`
  );
}

// =============================================================================
// Test 8: Analytics Access (Scope Enforcement)
// =============================================================================
async function testAnalyticsAccess() {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 8: Analytics Access (Scope Enforcement)');
  console.log('='.repeat(70));
  
  // Login as StateAnalyst (MH)
  const analystToken = await login('test_analyst', 'analyst_test_pwd_2024');
  if (!analystToken) {
    logResult('StateAnalyst login', false, 'Could not login');
    return;
  }
  logResult('StateAnalyst login', true, 'Token received');
  
  // Access own state data (should succeed)
  const ownStateResponse = await fetchJson(`${BASE_URL}/analytics/aggregates/state?stateCode=MH`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${analystToken}` },
  });
  logResult(
    'StateAnalyst can access own state data',
    ownStateResponse.status === 200,
    `Status: ${ownStateResponse.status}`
  );
  
  // Access other state data (should fail)
  const otherStateResponse = await fetchJson(`${BASE_URL}/analytics/aggregates/state?stateCode=KA`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${analystToken}` },
  });
  logResult(
    'StateAnalyst cannot access other state data',
    otherStateResponse.status === 403,
    `Status: ${otherStateResponse.status}`
  );
  
  // Access national data (should fail for StateAnalyst)
  const nationalResponse = await fetchJson(`${BASE_URL}/analytics/aggregates/national`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${analystToken}` },
  });
  logResult(
    'StateAnalyst cannot access national data',
    nationalResponse.status === 403,
    `Status: ${nationalResponse.status}`
  );
  
  // Login as CentralPolicyViewer
  const policyToken = await login('test_policy_viewer', 'policy_viewer_test_pwd_2024');
  if (!policyToken) {
    logResult('CentralPolicyViewer login', false, 'Could not login');
    return;
  }
  logResult('CentralPolicyViewer login', true, 'Token received');
  
  // Access national data (should succeed)
  const policyNationalResponse = await fetchJson(`${BASE_URL}/analytics/aggregates/national`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${policyToken}` },
  });
  logResult(
    'CentralPolicyViewer can access national data',
    policyNationalResponse.status === 200,
    `Status: ${policyNationalResponse.status}`
  );
}

// =============================================================================
// Test 9: Export/Download (MUST FAIL)
// =============================================================================
async function testExportDownload() {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 9: Export/Download (MUST FAIL)');
  console.log('='.repeat(70));
  
  const analystToken = await login('test_analyst', 'analyst_test_pwd_2024');
  
  // Try export
  const exportResponse = await fetchJson(`${BASE_URL}/analytics/export`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${analystToken}` },
  });
  logResult(
    'Export endpoint fails (403)',
    exportResponse.status === 403,
    `Status: ${exportResponse.status}`
  );
  
  // Try download
  const downloadResponse = await fetchJson(`${BASE_URL}/analytics/download`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${analystToken}` },
  });
  logResult(
    'Download endpoint fails (403)',
    downloadResponse.status === 403,
    `Status: ${downloadResponse.status}`
  );
}

// =============================================================================
// Test 10: Audit Logging
// =============================================================================
async function testAuditLogging() {
  console.log('');
  console.log('='.repeat(70));
  console.log('Test 10: Audit Logging');
  console.log('='.repeat(70));
  
  const supervisorToken = await login('test_supervisor', 'supervisor_test_pwd_2024');
  if (!supervisorToken) {
    logResult('Supervisor login', false, 'Could not login');
    return;
  }
  logResult('Supervisor login', true, 'Token received');
  
  // Access audit logs
  const auditResponse = await fetchJson(`${BASE_URL}/audit/logs`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${supervisorToken}` },
  });
  logResult(
    'Supervisor can access audit logs',
    auditResponse.status === 200,
    `Status: ${auditResponse.status}, Count: ${auditResponse.data?.data?.length || 0}`
  );
}

// =============================================================================
// Main Execution
// =============================================================================
async function main() {
  console.log('='.repeat(70));
  console.log('Trust-First Census System - Verification Suite');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Target: ${BASE_URL}`);
  console.log('');

  // Run tests
  await testHealthCheck();
  
  const { enumeratorToken } = await testAuthentication();
  
  if (enumeratorToken) {
    await testSubmissionWithoutConsent(enumeratorToken);
    const receiptId = await testConsentCreation(enumeratorToken);
    
    if (receiptId) {
      const submissionReceiptId = await testSubmissionWithConsent(enumeratorToken, receiptId);
      if (submissionReceiptId) {
        await testReadRawSubmission(enumeratorToken, submissionReceiptId);
      }
    }
    
    await testAggregationViaApi(enumeratorToken);
  }
  
  await testAnalyticsAccess();
  await testExportDownload();
  await testAuditLogging();

  // Summary
  console.log('');
  console.log('='.repeat(70));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('');
  
  if (results.failed === 0) {
    console.log('✅ ALL TESTS PASSED - System is operating within trust boundaries');
  } else {
    console.log('❌ SOME TESTS FAILED - Review failed tests above');
    console.log('');
    console.log('Failed tests:');
    for (const test of results.tests) {
      if (!test.passed) {
        console.log(`  - ${test.name}`);
        if (test.details) {
          console.log(`    ${test.details}`);
        }
      }
    }
  }
  
  console.log('');
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

