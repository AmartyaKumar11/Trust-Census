import { getDB } from '../db/connection.js';
import { logAuditEvent } from '../middleware/audit.js';

/**
 * Audit Routes
 * AUDITOR role can view audit logs
 * Read-only access to audit trail
 */

export async function auditRoutes(fastify) {
  // Get audit logs
  // AUDITOR role only
  fastify.get('/audit/logs', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('AUDITOR')
    ],
    schema: {
      description: 'Retrieve audit logs (AUDITOR role only)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          actionType: { type: 'string' },
          resourceType: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
          offset: { type: 'integer', minimum: 0, default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const {
      userId,
      actionType,
      resourceType,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = request.query;

    // Build query with filters
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (actionType) {
      query += ` AND action_type = $${paramIndex}`;
      params.push(actionType);
      paramIndex++;
    }

    if (resourceType) {
      query += ` AND resource_type = $${paramIndex}`;
      params.push(resourceType);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    const countQuery = query.replace(/SELECT \*/, 'SELECT COUNT(*)').replace(/ORDER BY.*$/, '');
    const countResult = await db.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);

    // Log audit access
    await logAuditEvent(fastify, {
      userId: request.user.id,
      actionType: 'AUDIT_LOGS_ACCESSED',
      resourceType: 'audit',
      resourceId: null,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestMethod: request.method,
      requestPath: request.url,
      statusCode: 200,
      metadata: {
        filters: { userId, actionType, resourceType, startDate, endDate },
        resultCount: result.rows.length
      }
    });

    return reply.send({
      logs: result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        actionType: row.action_type,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        ipAddress: row.ip_address,
        requestMethod: row.request_method,
        requestPath: row.request_path,
        statusCode: row.status_code,
        metadata: row.metadata,
        createdAt: row.created_at
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  });

  // Get audit log by ID
  fastify.get('/audit/logs/:id', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('AUDITOR')
    ],
    schema: {
      description: 'Get specific audit log entry',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;

    const result = await db.query(
      'SELECT * FROM audit_logs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Audit log not found' });
    }

    const log = result.rows[0];

    // Log audit access
    await logAuditEvent(fastify, {
      userId: request.user.id,
      actionType: 'AUDIT_LOG_ACCESSED',
      resourceType: 'audit',
      resourceId: id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestMethod: request.method,
      requestPath: request.url,
      statusCode: 200,
      metadata: {}
    });

    return reply.send({
      id: log.id,
      userId: log.user_id,
      actionType: log.action_type,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      requestMethod: log.request_method,
      requestPath: log.request_path,
      statusCode: log.status_code,
      metadata: log.metadata,
      createdAt: log.created_at
    });
  });
}

