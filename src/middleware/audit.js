/**
 * Audit Middleware
 * Logs all actions for complete auditability
 * Immutable, append-only logging
 */

/**
 * Create audit log entry
 * All system actions are logged here
 */
export async function logAuditEvent(fastify, {
  userId,
  actionType,
  resourceType,
  resourceId = null,
  ipAddress,
  userAgent,
  requestMethod,
  requestPath,
  statusCode,
  metadata = {}
}) {
  const db = fastify.db;
  
  try {
    const result = await db.query(
      `SELECT log_audit_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) as id`,
      [
        userId,
        actionType,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        requestMethod,
        requestPath,
        statusCode,
        JSON.stringify(metadata)
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    // Audit logging failures are critical but should not break the request
    console.error('Audit logging failed:', error);
    // In production, this should alert administrators
    return null;
  }
}

/**
 * Fastify plugin to add audit logging to requests
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

