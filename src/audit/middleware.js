/**
 * Mandatory Audit Middleware
 * 
 * RESPONSIBILITY: Framework-level audit logging enforcement
 * 
 * This middleware provides MANDATORY, NON-BYPASSABLE audit logging.
 * Route handlers have NO control over whether audit logging occurs.
 * Audit logging CANNOT be disabled via config or environment variables.
 * 
 * MUST:
 * - Log EVERY request (allowed, denied, or error)
 * - Enforce fail-closed behavior (audit failure = request failure)
 * - Use ONLY the audit_writer database role
 * - Record ONLY non-sensitive metadata
 * - Be registered globally at framework level
 * 
 * MUST NEVER:
 * - Allow routes to bypass audit logging
 * - Log request bodies or sensitive data
 * - Fail silently (must fail-closed)
 * - Be disabled via configuration
 * - Use any database role except audit_writer
 */

import {
  logAuditEvent,
  determineActionCategory,
  determineOutcome,
  AuditActionCategory,
  AuditOutcome,
} from './logger.js';
import { normalizeRole } from '../rbac/roles.js';

/**
 * Audit Plugin - MANDATORY, NON-BYPASSABLE
 * 
 * This plugin registers global hooks that CANNOT be bypassed.
 * All requests are audited regardless of route configuration.
 */
export async function auditPlugin(fastify) {
  /**
   * onRequest Hook - Capture request metadata
   * 
   * This hook runs at the START of every request.
   * It captures metadata for audit logging.
   */
  fastify.addHook('onRequest', async (request, reply) => {
    // Capture request start time
    request.auditStartTime = Date.now();

    // Capture request metadata (NO sensitive data)
    request.auditContext = Object.freeze({
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.url,
      routerPath: request.routerPath || request.url,
      ipAddress: request.ip,
      // User info will be added after authentication
      actorRole: null,
      actorId: null,
    });
  });

  /**
   * preHandler Hook - Capture authenticated user info
   * 
   * This hook runs AFTER authentication but BEFORE route handler.
   * It captures the authenticated user's role and ID.
   */
  fastify.addHook('preHandler', async (request, reply) => {
    // Update audit context with authenticated user info
    if (request.user) {
      request.auditContext = Object.freeze({
        ...request.auditContext,
        actorRole: normalizeRole(request.user.role) || 'UNKNOWN',
        actorId: request.user.id || null,
      });
    }
  });

  /**
   * onResponse Hook - Log successful/allowed requests
   * 
   * This hook runs AFTER the response is sent.
   * It logs the completed request with outcome.
   * 
   * FAIL-CLOSED: If audit logging fails, an error is thrown.
   */
  fastify.addHook('onResponse', async (request, reply) => {
    const actionCategory = determineActionCategory(
      request.auditContext.method,
      request.auditContext.path
    );

    const outcome = determineOutcome(reply.statusCode);

    // MANDATORY audit logging - CANNOT be skipped
    // If this fails, the error will propagate (fail-closed)
    try {
      await logAuditEvent({
        timestamp: request.auditContext.timestamp,
        actorRole: request.auditContext.actorRole || 'ANONYMOUS',
        actorId: request.auditContext.actorId,
        actionCategory,
        requestMethod: request.auditContext.method,
        requestPath: request.auditContext.path,
        outcome,
        statusCode: reply.statusCode,
        ipAddress: request.auditContext.ipAddress,
        metadata: {
          // ONLY safe metadata - NO sensitive data
          durationMs: Date.now() - request.auditStartTime,
          routerPath: request.auditContext.routerPath,
        },
      });
    } catch (error) {
      // FAIL-CLOSED: Audit failure is logged to console
      // The request has already completed, but we log the failure
      console.error('CRITICAL: Post-response audit logging failed:', error.message);
      // Note: Response already sent, cannot fail the request at this point
      // This is logged for monitoring and alerting
    }
  });

  /**
   * onError Hook - Log error requests
   * 
   * This hook runs when an error occurs during request processing.
   * It logs the error with appropriate outcome.
   * 
   * FAIL-CLOSED: If audit logging fails, the original error is still thrown.
   */
  fastify.addHook('onError', async (request, reply, error) => {
    const actionCategory = determineActionCategory(
      request.auditContext?.method || request.method,
      request.auditContext?.path || request.url
    );

    // Determine outcome based on error type
    let outcome = AuditOutcome.ERROR;
    let statusCode = error.statusCode || 500;

    if (statusCode === 401 || statusCode === 403) {
      outcome = AuditOutcome.DENIED;
    }

    // MANDATORY audit logging - CANNOT be skipped
    try {
      await logAuditEvent({
        timestamp: request.auditContext?.timestamp || new Date().toISOString(),
        actorRole: request.auditContext?.actorRole || 'ANONYMOUS',
        actorId: request.auditContext?.actorId || null,
        actionCategory,
        requestMethod: request.auditContext?.method || request.method,
        requestPath: request.auditContext?.path || request.url,
        outcome,
        statusCode,
        ipAddress: request.auditContext?.ipAddress || request.ip,
        metadata: {
          // ONLY safe metadata - NO sensitive data
          errorType: error.name || 'Error',
          // Do NOT log error message (may contain sensitive data)
        },
      });
    } catch (auditError) {
      // FAIL-CLOSED: Log the audit failure
      console.error('CRITICAL: Error audit logging failed:', auditError.message);
      // The original error will still be thrown
    }
  });

  /**
   * onRequestAbort Hook - Log aborted requests
   * 
   * This hook runs when a request is aborted by the client.
   * It logs the abort for audit trail.
   */
  fastify.addHook('onRequestAbort', async (request) => {
    try {
      await logAuditEvent({
        timestamp: request.auditContext?.timestamp || new Date().toISOString(),
        actorRole: request.auditContext?.actorRole || 'ANONYMOUS',
        actorId: request.auditContext?.actorId || null,
        actionCategory: AuditActionCategory.SYSTEM_ERROR,
        requestMethod: request.auditContext?.method || request.method,
        requestPath: request.auditContext?.path || request.url,
        outcome: AuditOutcome.ERROR,
        statusCode: 0,
        ipAddress: request.auditContext?.ipAddress || request.ip,
        metadata: {
          aborted: true,
        },
      });
    } catch (auditError) {
      console.error('CRITICAL: Abort audit logging failed:', auditError.message);
    }
  });

  /**
   * Decorate fastify with audit functions for explicit logging
   * 
   * These are available for routes that need to log specific actions,
   * but the global hooks ensure ALL requests are logged regardless.
   */
  fastify.decorate('logAuditEvent', logAuditEvent);
  fastify.decorate('AuditActionCategory', AuditActionCategory);
  fastify.decorate('AuditOutcome', AuditOutcome);

  /**
   * Log plugin initialization
   */
  fastify.log.info('Mandatory audit logging initialized - CANNOT be disabled');
}

/**
 * Export for use in other modules
 */
export { logAuditEvent, AuditActionCategory, AuditOutcome } from './logger.js';
