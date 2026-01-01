/**
 * Audit Module Index
 * 
 * RESPONSIBILITY: Export all audit components
 * 
 * This module provides MANDATORY, NON-BYPASSABLE audit logging
 * for the Trust-First Caste Census Management System.
 * 
 * Audit logging:
 * - CANNOT be disabled via config or environment
 * - CANNOT be bypassed by route handlers
 * - Uses ONLY the audit_writer database role
 * - Enforces fail-closed behavior
 * - Records ONLY non-sensitive metadata
 * 
 * Components:
 * - logger.js: Core audit logging functions
 * - middleware.js: Framework-level audit hooks
 */

// Core logging functions
export {
  logAuditEvent,
  logRequestStart,
  logRequestComplete,
  logAccessDenied,
  logSystemError,
  AuditActionCategory,
  AuditOutcome,
  determineActionCategory,
  determineOutcome,
} from './logger.js';

// Middleware plugin
export { auditPlugin } from './middleware.js';

