import { logAuditEvent } from './logger.js';

/**
 * Audit Middleware
 * 
 * RESPONSIBILITY: Fastify plugin for automatic request/response audit logging
 * 
 * MUST:
 * - Automatically log all requests and responses
 * - Capture request metadata (IP, user agent, method, path)
 * - Log response status codes
 * - Be independent of business logic (separation of powers)
 * 
 * MUST NEVER:
 * - Log sensitive data in metadata
 * - Modify request/response
 * - Break request flow on audit failure
 * - Expose raw census data
 */

/**
 * Fastify plugin to add audit logging to requests
 * 
 * This middleware automatically logs all requests and responses
 * for complete auditability. It operates independently of business
 * operations to ensure separation of powers.
 */
export async function auditPlugin(fastify) {
  fastify.addHook('onRequest', async (request, reply) => {
    // Store request metadata for audit logging
    request.auditMetadata = {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      method: request.method,
      path: request.url,
    };
  });

  fastify.addHook('onResponse', async (request, reply) => {
    // Log all requests (except health checks)
    if (request.url !== '/health') {
      await logAuditEvent(fastify, {
        userId: request.user?.id || null,
        actionType: `${request.method}_${request.routerPath || request.url}`,
        resourceType: 'request',
        resourceId: null,
        ipAddress: request.auditMetadata.ipAddress,
        userAgent: request.auditMetadata.userAgent,
        requestMethod: request.auditMetadata.method,
        requestPath: request.auditMetadata.path,
        statusCode: reply.statusCode,
        metadata: {
          // Only log safe metadata, no sensitive data
          queryParams: Object.keys(request.query || {}),
        }
      });
    }
  });
}

