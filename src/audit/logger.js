/**
 * Audit Logger
 * 
 * RESPONSIBILITY: Core audit logging functions for immutable action tracking
 * 
 * MUST:
 * - Log all system actions immutably (append-only)
 * - Provide complete audit trail (who, what, when, where)
 * - Be independent of business operations (separation of powers)
 * - Never fail silently (but not break requests)
 * 
 * MUST NEVER:
 * - Modify or delete audit logs
 * - Expose raw census data
 * - Log sensitive personal information
 * - Be bypassed by any operation
 * - Return audit logs with raw data
 */

/**
 * Create audit log entry
 * All system actions are logged here
 * 
 * This function is called by routes and middleware to log actions.
 * Audit logs are immutable and append-only.
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

