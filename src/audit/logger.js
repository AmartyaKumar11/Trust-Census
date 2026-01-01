/**
 * Mandatory Audit Logger
 * 
 * RESPONSIBILITY: Core audit logging functions for immutable action tracking
 * 
 * This module provides MANDATORY, NON-BYPASSABLE audit logging.
 * Audit logging CANNOT be disabled, skipped, or configured off.
 * 
 * MUST:
 * - Log all system actions immutably (append-only)
 * - Use ONLY the audit_writer database role
 * - Fail-closed: if audit fails, request fails
 * - Be independent of business operations (separation of powers)
 * - Record ONLY non-sensitive metadata
 * 
 * MUST NEVER:
 * - Modify or delete audit logs
 * - Expose raw census data
 * - Log sensitive personal information
 * - Log request bodies or caste values
 * - Be bypassed by any operation
 * - Be disabled via config or environment
 * - Use any database role except audit_writer
 * - Read from L1, L2, or L3
 */

import { getAuditWriterPool } from '../db/connections.js';

/**
 * Action categories for audit logging
 * These are the ONLY action categories permitted
 */
export const AuditActionCategory = Object.freeze({
  AUTH_ATTEMPT: 'AUTH_ATTEMPT',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILURE: 'AUTH_FAILURE',
  SUBMISSION: 'SUBMISSION',
  SUBMISSION_VERIFY: 'SUBMISSION_VERIFY',
  AGGREGATE_COMPUTE: 'AGGREGATE_COMPUTE',
  AGGREGATE_READ: 'AGGREGATE_READ',
  AUDIT_READ: 'AUDIT_READ',
  CONSENT_OPERATION: 'CONSENT_OPERATION',
  SYSTEM_HEALTH: 'SYSTEM_HEALTH',
  ACCESS_DENIED: 'ACCESS_DENIED',
  VALIDATION_FAILURE: 'VALIDATION_FAILURE',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
});

/**
 * Outcome types for audit logging
 */
export const AuditOutcome = Object.freeze({
  ALLOWED: 'ALLOWED',
  DENIED: 'DENIED',
  ERROR: 'ERROR',
});

/**
 * Sanitize metadata to remove any sensitive information
 * This is a MANDATORY step before logging
 * 
 * @param {object} metadata - Raw metadata
 * @returns {object} - Sanitized metadata
 */
function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  // Forbidden keys that must NEVER be logged
  const forbiddenKeys = [
    'body',
    'requestBody',
    'responseBody',
    'password',
    'passwordHash',
    'token',
    'jwt',
    'secret',
    'aadhaar',
    'phone',
    'mobile',
    'email',
    'name',
    'address',
    'biometric',
    'fingerprint',
    'iris',
    'casteCategory',
    'caste',
    'householdCount',
    'populationCount',
    'rawData',
    'censusData',
    'submissionData',
  ];

  const sanitized = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    
    // Skip forbidden keys
    if (forbiddenKeys.some(forbidden => lowerKey.includes(forbidden.toLowerCase()))) {
      continue;
    }

    // Only include safe primitive values
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      // Only include arrays of primitives (e.g., query param names)
      sanitized[key] = value.filter(v => typeof v === 'string' || typeof v === 'number');
    }
  }

  return sanitized;
}

/**
 * Determine action category from request
 * 
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @returns {string} - Action category
 */
export function determineActionCategory(method, path) {
  const normalizedPath = path.toLowerCase();

  if (normalizedPath.startsWith('/auth/login')) {
    return AuditActionCategory.AUTH_ATTEMPT;
  }
  if (normalizedPath.startsWith('/auth/')) {
    return AuditActionCategory.AUTH_ATTEMPT;
  }
  if (normalizedPath.startsWith('/submissions') && method === 'POST') {
    return AuditActionCategory.SUBMISSION;
  }
  if (normalizedPath.includes('/verify')) {
    return AuditActionCategory.SUBMISSION_VERIFY;
  }
  if (normalizedPath.startsWith('/aggregates') && method === 'POST') {
    return AuditActionCategory.AGGREGATE_COMPUTE;
  }
  if (normalizedPath.startsWith('/aggregates') && method === 'GET') {
    return AuditActionCategory.AGGREGATE_READ;
  }
  if (normalizedPath.startsWith('/policy/')) {
    return AuditActionCategory.AGGREGATE_READ;
  }
  if (normalizedPath.startsWith('/audit/')) {
    return AuditActionCategory.AUDIT_READ;
  }
  if (normalizedPath.startsWith('/consent') || normalizedPath.startsWith('/citizen/consent')) {
    return AuditActionCategory.CONSENT_OPERATION;
  }
  if (normalizedPath === '/health') {
    return AuditActionCategory.SYSTEM_HEALTH;
  }

  return AuditActionCategory.SYSTEM_ERROR;
}

/**
 * Determine outcome from status code
 * 
 * @param {number} statusCode - HTTP status code
 * @returns {string} - Outcome
 */
export function determineOutcome(statusCode) {
  if (statusCode >= 200 && statusCode < 300) {
    return AuditOutcome.ALLOWED;
  }
  if (statusCode === 401 || statusCode === 403) {
    return AuditOutcome.DENIED;
  }
  return AuditOutcome.ERROR;
}

/**
 * Create audit log entry - MANDATORY, FAIL-CLOSED
 * 
 * This function MUST succeed for the request to proceed.
 * If audit logging fails, an error is thrown (fail-closed).
 * 
 * @param {object} auditEvent - Audit event data
 * @throws {Error} - If audit logging fails (fail-closed)
 */
export async function logAuditEvent({
  timestamp,
  actorRole,
  actorId,
  actionCategory,
  requestMethod,
  requestPath,
  outcome,
  statusCode,
  ipAddress,
  metadata = {}
}) {
  // Get audit_writer connection pool - ONLY this role can write to L0
  const db = getAuditWriterPool();

  // Sanitize metadata to remove any sensitive information
  const sanitizedMetadata = sanitizeMetadata(metadata);

  // Build audit record with ONLY permitted fields
  const auditRecord = {
    timestamp: timestamp || new Date().toISOString(),
    actor_role: actorRole || 'ANONYMOUS',
    actor_id: actorId || null,
    action_category: actionCategory,
    request_method: requestMethod,
    request_path: requestPath,
    outcome: outcome,
    status_code: statusCode,
    ip_address: ipAddress,
    metadata: sanitizedMetadata,
  };

  try {
    // Insert audit record using audit_writer role
    // This role can ONLY INSERT into audit_logs, cannot read L1/L2/L3
    await db.query(
      `INSERT INTO audit_logs (
        user_id,
        action_type,
        resource_type,
        ip_address,
        request_method,
        request_path,
        status_code,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        auditRecord.actor_id,
        auditRecord.action_category,
        auditRecord.actor_role,
        auditRecord.ip_address,
        auditRecord.request_method,
        auditRecord.request_path,
        auditRecord.status_code,
        JSON.stringify({
          outcome: auditRecord.outcome,
          ...auditRecord.metadata,
        }),
        auditRecord.timestamp,
      ]
    );

  } catch (error) {
    // FAIL-CLOSED: Audit failure MUST cause request failure
    // This error will propagate up and fail the request
    console.error('CRITICAL: Audit logging failed - request will be rejected:', error.message);
    throw new Error('Audit logging failed - request rejected');
  }
}

/**
 * Log audit event for request start
 * Called at the beginning of request processing
 */
export async function logRequestStart({
  actorRole,
  actorId,
  actionCategory,
  requestMethod,
  requestPath,
  ipAddress,
}) {
  return logAuditEvent({
    timestamp: new Date().toISOString(),
    actorRole,
    actorId,
    actionCategory,
    requestMethod,
    requestPath,
    outcome: AuditOutcome.ALLOWED, // Will be updated on response
    statusCode: 0, // Pending
    ipAddress,
    metadata: { phase: 'REQUEST_START' },
  });
}

/**
 * Log audit event for request completion
 * Called at the end of request processing
 */
export async function logRequestComplete({
  actorRole,
  actorId,
  actionCategory,
  requestMethod,
  requestPath,
  outcome,
  statusCode,
  ipAddress,
}) {
  return logAuditEvent({
    timestamp: new Date().toISOString(),
    actorRole,
    actorId,
    actionCategory,
    requestMethod,
    requestPath,
    outcome,
    statusCode,
    ipAddress,
    metadata: { phase: 'REQUEST_COMPLETE' },
  });
}

/**
 * Log audit event for access denial
 * Called when access is denied
 */
export async function logAccessDenied({
  actorRole,
  actorId,
  requestMethod,
  requestPath,
  ipAddress,
  reason,
}) {
  return logAuditEvent({
    timestamp: new Date().toISOString(),
    actorRole,
    actorId,
    actionCategory: AuditActionCategory.ACCESS_DENIED,
    requestMethod,
    requestPath,
    outcome: AuditOutcome.DENIED,
    statusCode: 403,
    ipAddress,
    metadata: { reason: reason || 'Access denied' },
  });
}

/**
 * Log audit event for system error
 * Called when an error occurs
 */
export async function logSystemError({
  actorRole,
  actorId,
  requestMethod,
  requestPath,
  ipAddress,
  errorType,
}) {
  return logAuditEvent({
    timestamp: new Date().toISOString(),
    actorRole,
    actorId,
    actionCategory: AuditActionCategory.SYSTEM_ERROR,
    requestMethod,
    requestPath,
    outcome: AuditOutcome.ERROR,
    statusCode: 500,
    ipAddress,
    metadata: { errorType: errorType || 'UNKNOWN' },
  });
}
