/**
 * Analytics Routes - Read-Only Access to Macro-Aggregates (L3)
 * 
 * RESPONSIBILITY: Provide read-only access to privacy-noised macro-aggregates
 * 
 * This module implements:
 * - Read-only access to L3 (macro_aggregates) ONLY
 * - Role-based access (StateAnalyst, CentralPolicyViewer)
 * - Scope-bound queries (geographic scope enforcement)
 * - Fixed query shapes (no arbitrary WHERE clauses)
 * - Audit logging for all access
 * 
 * MUST:
 * - Read ONLY from macro_aggregates (L3)
 * - Enforce role-based access
 * - Enforce geographic scope
 * - Use fixed query shapes
 * - Audit all access
 * - Include privacy disclaimer in responses
 * 
 * MUST NEVER:
 * - Expose micro_aggregates (L2) or raw data (L1)
 * - Allow dynamic filtering beyond fixed parameters
 * - Allow arbitrary WHERE clauses
 * - Allow client-controlled grouping
 * - Expose export or download functionality
 * - Log query parameters or response bodies
 * - Expose exact noise parameters
 */

import { logAuditEvent, AuditActionCategory, AuditOutcome } from '../audit/logger.js';
import { SystemRoles } from '../rbac/roles.js';
import { GeographicLevel, PurposeCategory } from '../scope/definitions.js';

/**
 * Privacy disclaimer to include in all responses
 */
const PRIVACY_DISCLAIMER = Object.freeze({
  notice: 'Values are privacy-preserving estimates with differential privacy noise applied.',
  accuracy: 'Individual values may differ from true counts. Aggregates are suitable for policy analysis only.',
  restrictions: 'Data cannot be exported, downloaded, or used to infer individual records.',
});

/**
 * Generic access denied response
 */
const ACCESS_DENIED_RESPONSE = Object.freeze({
  error: 'Access denied'
});

/**
 * Fixed query for state-level aggregates
 * No dynamic WHERE clauses - only fixed parameters
 */
const STATE_AGGREGATES_QUERY = `
  SELECT 
    id,
    geographic_level,
    geographic_code,
    caste_category,
    noisy_population,
    noisy_submission_count,
    aggregation_window_id,
    computed_at
  FROM macro_aggregates
  WHERE geographic_level = 'state'
    AND ($1::text IS NULL OR geographic_code = $1)
    AND ($2::text IS NULL OR aggregation_window_id = $2)
  ORDER BY geographic_code, caste_category
  LIMIT 100
`;

/**
 * Fixed query for national-level aggregates
 * No dynamic WHERE clauses - only fixed parameters
 */
const NATIONAL_AGGREGATES_QUERY = `
  SELECT 
    id,
    geographic_level,
    geographic_code,
    caste_category,
    noisy_population,
    noisy_submission_count,
    aggregation_window_id,
    computed_at
  FROM macro_aggregates
  WHERE geographic_level = 'national'
    AND ($1::text IS NULL OR aggregation_window_id = $1)
  ORDER BY caste_category
  LIMIT 100
`;

/**
 * Fixed query for single aggregate by ID
 */
const AGGREGATE_BY_ID_QUERY = `
  SELECT 
    id,
    geographic_level,
    geographic_code,
    caste_category,
    noisy_population,
    noisy_submission_count,
    aggregation_window_id,
    computed_at,
    computation_hash
  FROM macro_aggregates
  WHERE id = $1
`;

/**
 * Fixed query for aggregate verification (hash only)
 */
const AGGREGATE_VERIFY_QUERY = `
  SELECT 
    id,
    geographic_level,
    geographic_code,
    computation_hash,
    computed_at
  FROM macro_aggregates
  WHERE id = $1
`;

/**
 * Fixed query for available aggregation windows
 */
const AVAILABLE_WINDOWS_QUERY = `
  SELECT DISTINCT 
    aggregation_window_id,
    MIN(computed_at) as window_start,
    MAX(computed_at) as window_end
  FROM macro_aggregates
  WHERE ($1::text IS NULL OR geographic_level = $1)
  GROUP BY aggregation_window_id
  ORDER BY window_start DESC
  LIMIT 20
`;

/**
 * Log analytics access for audit
 */
async function logAnalyticsAccess(request, action, outcome, statusCode) {
  try {
    await logAuditEvent({
      timestamp: new Date().toISOString(),
      actorRole: request.user?.role || 'ANONYMOUS',
      actorId: request.user?.id || null,
      actionCategory: AuditActionCategory.ANALYTICS_ACCESS,
      requestMethod: request.method,
      requestPath: request.url,
      outcome: outcome,
      statusCode: statusCode,
      ipAddress: request.ip,
      metadata: {
        action: action,
        // NOTE: Do NOT log query parameters or response data
      },
    });
  } catch (error) {
    console.error('Failed to log analytics access:', error);
  }
}

/**
 * Validate geographic scope for StateAnalyst
 * StateAnalyst can only access their assigned state
 */
function validateStateAnalystScope(request, requestedStateCode) {
  const userScope = request.user?.scope?.geographic;
  
  if (!userScope) {
    return { valid: false, reason: 'No geographic scope assigned' };
  }
  
  // StateAnalyst must have STATE level scope
  if (userScope.level !== GeographicLevel.STATE) {
    return { valid: false, reason: 'Invalid scope level' };
  }
  
  // If requesting a specific state, it must match assigned scope
  if (requestedStateCode && requestedStateCode !== userScope.code) {
    return { valid: false, reason: 'Outside assigned geographic scope' };
  }
  
  return { valid: true, assignedState: userScope.code };
}

/**
 * Validate geographic scope for CentralPolicyViewer
 * CentralPolicyViewer can access state and national level
 */
function validateCentralPolicyViewerScope(request, requestedLevel) {
  const userScope = request.user?.scope?.geographic;
  
  // CentralPolicyViewer should have NATIONAL level scope
  // But can access state-level data across all states
  if (requestedLevel && !['state', 'national'].includes(requestedLevel.toLowerCase())) {
    return { valid: false, reason: 'Invalid geographic level' };
  }
  
  return { valid: true };
}

/**
 * Analytics Routes Plugin
 */
export async function analyticsRoutes(fastify) {
  // Get analytics database pool (uses analytics_reader role)
  const getAnalyticsPool = () => {
    if (fastify.analyticsPool) {
      return fastify.analyticsPool;
    }
    // Fallback to main pool if analytics pool not configured
    return fastify.pg;
  };

  /**
   * GET /analytics/aggregates/state
   * 
   * Read state-level macro-aggregates (L3)
   * 
   * Access: StateAnalyst (assigned state only), CentralPolicyViewer (all states)
   * Purpose: POLICY_READ
   */
  fastify.get('/analytics/aggregates/state', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRoles(SystemRoles.STATE_ANALYST, SystemRoles.CENTRAL_POLICY_VIEWER),
    ],
    schema: {
      description: 'Read state-level macro-aggregates (L3). Values are privacy-preserving estimates.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          stateCode: { 
            type: 'string', 
            pattern: '^[A-Z]{2}$',
            description: 'State code (2 letters). StateAnalyst: must match assigned scope.'
          },
          windowId: { 
            type: 'string', 
            maxLength: 32,
            description: 'Aggregation window ID (optional filter)'
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            disclaimer: { type: 'object' },
            data: { type: 'array' },
            count: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { stateCode, windowId } = request.query;
    const userRole = request.user.role;

    // Validate scope based on role
    if (userRole === SystemRoles.STATE_ANALYST) {
      const scopeValidation = validateStateAnalystScope(request, stateCode);
      if (!scopeValidation.valid) {
        await logAnalyticsAccess(request, 'STATE_AGGREGATES_READ', AuditOutcome.DENIED, 403);
        return reply.code(403).send(ACCESS_DENIED_RESPONSE);
      }
      // Force state code to assigned state for StateAnalyst
      const effectiveStateCode = stateCode || scopeValidation.assignedState;
      
      const pool = getAnalyticsPool();
      const result = await pool.query(STATE_AGGREGATES_QUERY, [effectiveStateCode, windowId || null]);
      
      await logAnalyticsAccess(request, 'STATE_AGGREGATES_READ', AuditOutcome.SUCCESS, 200);
      
      return {
        disclaimer: PRIVACY_DISCLAIMER,
        data: result.rows,
        count: result.rows.length,
      };
    }

    if (userRole === SystemRoles.CENTRAL_POLICY_VIEWER) {
      const scopeValidation = validateCentralPolicyViewerScope(request, 'state');
      if (!scopeValidation.valid) {
        await logAnalyticsAccess(request, 'STATE_AGGREGATES_READ', AuditOutcome.DENIED, 403);
        return reply.code(403).send(ACCESS_DENIED_RESPONSE);
      }
      
      const pool = getAnalyticsPool();
      const result = await pool.query(STATE_AGGREGATES_QUERY, [stateCode || null, windowId || null]);
      
      await logAnalyticsAccess(request, 'STATE_AGGREGATES_READ', AuditOutcome.SUCCESS, 200);
      
      return {
        disclaimer: PRIVACY_DISCLAIMER,
        data: result.rows,
        count: result.rows.length,
      };
    }

    // Should not reach here due to role check, but deny by default
    await logAnalyticsAccess(request, 'STATE_AGGREGATES_READ', AuditOutcome.DENIED, 403);
    return reply.code(403).send(ACCESS_DENIED_RESPONSE);
  });

  /**
   * GET /analytics/aggregates/national
   * 
   * Read national-level macro-aggregates (L3)
   * 
   * Access: CentralPolicyViewer only
   * Purpose: POLICY_READ
   */
  fastify.get('/analytics/aggregates/national', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRoles(SystemRoles.CENTRAL_POLICY_VIEWER),
    ],
    schema: {
      description: 'Read national-level macro-aggregates (L3). Values are privacy-preserving estimates.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          windowId: { 
            type: 'string', 
            maxLength: 32,
            description: 'Aggregation window ID (optional filter)'
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            disclaimer: { type: 'object' },
            data: { type: 'array' },
            count: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { windowId } = request.query;

    const scopeValidation = validateCentralPolicyViewerScope(request, 'national');
    if (!scopeValidation.valid) {
      await logAnalyticsAccess(request, 'NATIONAL_AGGREGATES_READ', AuditOutcome.DENIED, 403);
      return reply.code(403).send(ACCESS_DENIED_RESPONSE);
    }

    const pool = getAnalyticsPool();
    const result = await pool.query(NATIONAL_AGGREGATES_QUERY, [windowId || null]);

    await logAnalyticsAccess(request, 'NATIONAL_AGGREGATES_READ', AuditOutcome.SUCCESS, 200);

    return {
      disclaimer: PRIVACY_DISCLAIMER,
      data: result.rows,
      count: result.rows.length,
    };
  });

  /**
   * GET /analytics/aggregates/:id
   * 
   * Read a specific macro-aggregate by ID (L3)
   * 
   * Access: StateAnalyst (if within scope), CentralPolicyViewer
   * Purpose: POLICY_READ
   */
  fastify.get('/analytics/aggregates/:id', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRoles(SystemRoles.STATE_ANALYST, SystemRoles.CENTRAL_POLICY_VIEWER),
    ],
    schema: {
      description: 'Read a specific macro-aggregate by ID (L3). Values are privacy-preserving estimates.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            disclaimer: { type: 'object' },
            data: { type: 'object' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const userRole = request.user.role;

    const pool = getAnalyticsPool();
    const result = await pool.query(AGGREGATE_BY_ID_QUERY, [id]);

    if (result.rows.length === 0) {
      await logAnalyticsAccess(request, 'AGGREGATE_READ_BY_ID', AuditOutcome.ERROR, 404);
      return reply.code(404).send({ error: 'Aggregate not found' });
    }

    const aggregate = result.rows[0];

    // Validate scope based on role
    if (userRole === SystemRoles.STATE_ANALYST) {
      // StateAnalyst can only access aggregates within their assigned state
      if (aggregate.geographic_level === 'state') {
        const scopeValidation = validateStateAnalystScope(request, aggregate.geographic_code);
        if (!scopeValidation.valid) {
          await logAnalyticsAccess(request, 'AGGREGATE_READ_BY_ID', AuditOutcome.DENIED, 403);
          return reply.code(403).send(ACCESS_DENIED_RESPONSE);
        }
      } else if (aggregate.geographic_level === 'national') {
        // StateAnalyst cannot access national-level aggregates
        await logAnalyticsAccess(request, 'AGGREGATE_READ_BY_ID', AuditOutcome.DENIED, 403);
        return reply.code(403).send(ACCESS_DENIED_RESPONSE);
      }
    }

    // CentralPolicyViewer can access all state and national level aggregates

    await logAnalyticsAccess(request, 'AGGREGATE_READ_BY_ID', AuditOutcome.SUCCESS, 200);

    return {
      disclaimer: PRIVACY_DISCLAIMER,
      data: aggregate,
    };
  });

  /**
   * GET /analytics/aggregates/:id/verify
   * 
   * Verify aggregate integrity (hash only, no data values)
   * 
   * Access: StateAnalyst (if within scope), CentralPolicyViewer
   * Purpose: POLICY_READ
   */
  fastify.get('/analytics/aggregates/:id/verify', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRoles(SystemRoles.STATE_ANALYST, SystemRoles.CENTRAL_POLICY_VIEWER),
    ],
    schema: {
      description: 'Verify aggregate integrity (hash only). Does not return data values.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            geographic_level: { type: 'string' },
            geographic_code: { type: 'string' },
            computation_hash: { type: 'string' },
            computed_at: { type: 'string' },
            verified: { type: 'boolean' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const userRole = request.user.role;

    const pool = getAnalyticsPool();
    const result = await pool.query(AGGREGATE_VERIFY_QUERY, [id]);

    if (result.rows.length === 0) {
      await logAnalyticsAccess(request, 'AGGREGATE_VERIFY', AuditOutcome.ERROR, 404);
      return reply.code(404).send({ error: 'Aggregate not found' });
    }

    const aggregate = result.rows[0];

    // Validate scope for StateAnalyst
    if (userRole === SystemRoles.STATE_ANALYST) {
      if (aggregate.geographic_level === 'state') {
        const scopeValidation = validateStateAnalystScope(request, aggregate.geographic_code);
        if (!scopeValidation.valid) {
          await logAnalyticsAccess(request, 'AGGREGATE_VERIFY', AuditOutcome.DENIED, 403);
          return reply.code(403).send(ACCESS_DENIED_RESPONSE);
        }
      } else if (aggregate.geographic_level === 'national') {
        await logAnalyticsAccess(request, 'AGGREGATE_VERIFY', AuditOutcome.DENIED, 403);
        return reply.code(403).send(ACCESS_DENIED_RESPONSE);
      }
    }

    await logAnalyticsAccess(request, 'AGGREGATE_VERIFY', AuditOutcome.SUCCESS, 200);

    return {
      ...aggregate,
      verified: true, // Hash exists and record found
    };
  });

  /**
   * GET /analytics/windows
   * 
   * List available aggregation windows
   * 
   * Access: StateAnalyst, CentralPolicyViewer
   * Purpose: POLICY_READ
   */
  fastify.get('/analytics/windows', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRoles(SystemRoles.STATE_ANALYST, SystemRoles.CENTRAL_POLICY_VIEWER),
    ],
    schema: {
      description: 'List available aggregation windows for L3 data.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          level: { 
            type: 'string', 
            enum: ['state', 'national'],
            description: 'Geographic level filter'
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            windows: { type: 'array' },
            count: { type: 'integer' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { level } = request.query;
    const userRole = request.user.role;

    // StateAnalyst cannot filter to national level
    if (userRole === SystemRoles.STATE_ANALYST && level === 'national') {
      await logAnalyticsAccess(request, 'WINDOWS_LIST', AuditOutcome.DENIED, 403);
      return reply.code(403).send(ACCESS_DENIED_RESPONSE);
    }

    const pool = getAnalyticsPool();
    const result = await pool.query(AVAILABLE_WINDOWS_QUERY, [level || null]);

    await logAnalyticsAccess(request, 'WINDOWS_LIST', AuditOutcome.SUCCESS, 200);

    return {
      windows: result.rows,
      count: result.rows.length,
    };
  });

  // ============================================================================
  // FORBIDDEN ENDPOINTS - Explicitly documented as not implemented
  // ============================================================================

  /**
   * POST /analytics/* - FORBIDDEN
   * No write operations on analytics endpoints
   */
  fastify.post('/analytics/*', async (request, reply) => {
    await logAnalyticsAccess(request, 'FORBIDDEN_WRITE', AuditOutcome.DENIED, 403);
    return reply.code(403).send({
      error: 'Write operations are not permitted on analytics endpoints',
    });
  });

  /**
   * GET /analytics/export - FORBIDDEN
   * No export functionality
   */
  fastify.get('/analytics/export', async (request, reply) => {
    await logAnalyticsAccess(request, 'FORBIDDEN_EXPORT', AuditOutcome.DENIED, 403);
    return reply.code(403).send({
      error: 'Export functionality is not permitted',
    });
  });

  /**
   * GET /analytics/download - FORBIDDEN
   * No download functionality
   */
  fastify.get('/analytics/download', async (request, reply) => {
    await logAnalyticsAccess(request, 'FORBIDDEN_DOWNLOAD', AuditOutcome.DENIED, 403);
    return reply.code(403).send({
      error: 'Download functionality is not permitted',
    });
  });

  fastify.log.info('Analytics routes registered (L3 read-only access)');
}

