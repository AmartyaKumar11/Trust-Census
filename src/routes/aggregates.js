/**
 * Aggregate Routes (DISABLED)
 * 
 * RESPONSIBILITY: This file is a PLACEHOLDER that explicitly forbids
 * HTTP-triggered aggregation.
 * 
 * AGGREGATION VIA HTTP IS FORBIDDEN:
 * - Aggregation MUST NOT be triggered via HTTP API
 * - Aggregation MUST be performed by offline background workers
 * - Aggregation workers use the aggregation_worker database role
 * - No application-layer code should SELECT from L1 (census_submissions)
 * 
 * WHY THIS FILE EXISTS:
 * - Documents the architectural decision to forbid HTTP aggregation
 * - Prevents accidental re-implementation of forbidden endpoints
 * - Provides clear error messages if someone tries to access aggregate routes
 * 
 * FUTURE IMPLEMENTATION:
 * - Aggregation will be implemented as offline batch jobs
 * - Jobs will run on a separate worker service
 * - Jobs will use the aggregation_worker database role
 * - Results will be stored in L2/L3 tables
 * - StateAnalyst can READ pre-computed aggregates from L2/L3
 * 
 * FORBIDDEN ENDPOINTS (WILL NEVER BE IMPLEMENTED):
 * - POST /aggregates/compute - Triggers L1 read via HTTP
 * - POST /aggregates/compute/macro - Triggers L1 read via HTTP
 * - Any endpoint that reads from census_submissions
 * 
 * PERMITTED ENDPOINTS (TO BE IMPLEMENTED LATER):
 * - GET /aggregates/:id - Read pre-computed aggregate from L2/L3
 * - GET /aggregates - List pre-computed aggregates from L2/L3
 * - GET /aggregates/:id/verify - Verify aggregate hash
 * 
 * These read-only endpoints will use analytics_reader role which
 * has NO access to L1 (census_submissions).
 */

/**
 * Generic forbidden response
 */
const AGGREGATION_FORBIDDEN_RESPONSE = Object.freeze({
  error: 'Aggregation via HTTP is not permitted',
  message: 'Aggregation must be performed by authorized offline workers. This endpoint does not exist.',
  code: 'AGGREGATION_FORBIDDEN'
});

/**
 * Aggregate routes - DISABLED
 * 
 * This function registers placeholder routes that return 403 Forbidden
 * for any aggregation-related requests.
 */
export async function aggregateRoutes(fastify) {
  /**
   * POST /aggregates/compute - FORBIDDEN
   * 
   * This endpoint is STRUCTURALLY FORBIDDEN.
   * Aggregation must be performed by offline workers, not via HTTP.
   */
  fastify.post('/aggregates/compute', {
    schema: {
      description: 'FORBIDDEN: Aggregation via HTTP is not permitted',
      tags: ['forbidden'],
    }
  }, async (request, reply) => {
    // Log the forbidden attempt
    fastify.log.warn({
      msg: 'Forbidden aggregation attempt via HTTP',
      ip: request.ip,
      user: request.user?.id,
      path: request.url,
    });

    return reply.code(403).send(AGGREGATION_FORBIDDEN_RESPONSE);
  });

  /**
   * POST /aggregates/compute/macro - FORBIDDEN
   * 
   * This endpoint is STRUCTURALLY FORBIDDEN.
   * Macro-aggregation must be performed by offline workers, not via HTTP.
   */
  fastify.post('/aggregates/compute/macro', {
    schema: {
      description: 'FORBIDDEN: Aggregation via HTTP is not permitted',
      tags: ['forbidden'],
    }
  }, async (request, reply) => {
    fastify.log.warn({
      msg: 'Forbidden macro-aggregation attempt via HTTP',
      ip: request.ip,
      user: request.user?.id,
      path: request.url,
    });

    return reply.code(403).send(AGGREGATION_FORBIDDEN_RESPONSE);
  });

  /**
   * GET /aggregates/:id - PLACEHOLDER
   * 
   * This endpoint will be implemented to read PRE-COMPUTED aggregates
   * from L2/L3 tables. It will use analytics_reader role which has
   * NO access to L1.
   * 
   * Currently returns 501 Not Implemented.
   */
  fastify.get('/aggregates/:id', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('ANALYST', 'AUDITOR')
    ],
    schema: {
      description: 'Read pre-computed aggregate (NOT YET IMPLEMENTED)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    // This will read from L2/L3 tables (aggregate_computations, micro_aggregates, macro_aggregates)
    // NOT from census_submissions (L1)
    // Implementation deferred to offline aggregation phase
    return reply.code(501).send({
      error: 'Not implemented',
      message: 'Pre-computed aggregate retrieval will be available after offline aggregation is implemented.',
      code: 'NOT_IMPLEMENTED'
    });
  });

  /**
   * GET /aggregates - PLACEHOLDER
   * 
   * This endpoint will list pre-computed aggregates from L2/L3.
   * Currently returns 501 Not Implemented.
   */
  fastify.get('/aggregates', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('ANALYST')
    ],
    schema: {
      description: 'List pre-computed aggregates (NOT YET IMPLEMENTED)',
      security: [{ bearerAuth: [] }],
    }
  }, async (request, reply) => {
    return reply.code(501).send({
      error: 'Not implemented',
      message: 'Aggregate listing will be available after offline aggregation is implemented.',
      code: 'NOT_IMPLEMENTED'
    });
  });

  /**
   * GET /aggregates/:id/verify - PLACEHOLDER
   * 
   * This endpoint will verify aggregate computation hash.
   * Currently returns 501 Not Implemented.
   */
  fastify.get('/aggregates/:id/verify', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('ANALYST', 'AUDITOR')
    ],
    schema: {
      description: 'Verify aggregate computation hash (NOT YET IMPLEMENTED)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    return reply.code(501).send({
      error: 'Not implemented',
      message: 'Aggregate verification will be available after offline aggregation is implemented.',
      code: 'NOT_IMPLEMENTED'
    });
  });

  fastify.log.info('Aggregate routes registered (HTTP aggregation FORBIDDEN, read endpoints NOT YET IMPLEMENTED)');
}
