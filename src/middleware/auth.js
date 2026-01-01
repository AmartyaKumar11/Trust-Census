import jwt from '@fastify/jwt';
import { getDB } from '../db/connection.js';
import { 
  SystemRoles, 
  isValidRole, 
  isForbiddenRole, 
  normalizeRole,
  VALID_ROLES,
  LEGACY_ROLE_MAPPING
} from '../rbac/roles.js';

/**
 * Authentication Middleware
 * 
 * RESPONSIBILITY: JWT authentication and identity verification
 * 
 * This module handles WHO is making a request (identity).
 * Role-based access control is handled by the RBAC middleware.
 * 
 * MUST:
 * - Verify JWT tokens on protected routes
 * - Verify user exists and is active
 * - Attach user identity and role to request
 * - Normalize roles (handle legacy role names)
 * - Explicitly reject forbidden roles (super-admin, etc.)
 * 
 * MUST NEVER:
 * - Allow access without valid JWT
 * - Allow access with forbidden roles
 * - Allow role combination or escalation
 * - Expose user passwords or hashes
 * - Allow default, fallback, or implicit roles
 */

/**
 * Generic error responses (no authorization logic leakage)
 */
const AUTH_ERRORS = Object.freeze({
  INVALID_TOKEN: { error: 'Invalid or expired token' },
  USER_NOT_FOUND: { error: 'User not found or inactive' },
  INVALID_ROLE: { error: 'Invalid role assignment' },
  FORBIDDEN_ROLE: { error: 'Access denied' },
});

/**
 * Register authentication plugin
 */
export async function authPlugin(fastify) {
  // Register JWT plugin
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'CHANGE_THIS_SECURE_SECRET',
    sign: {
      expiresIn: process.env.JWT_EXPIRY || '24h'
    }
  });

  /**
   * Authentication decorator
   * Verifies JWT and attaches user to request
   * 
   * DENY BY DEFAULT: No valid token = no access
   */
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      // Verify JWT token
      await request.jwtVerify();
      
      // DENY BY DEFAULT: No user ID in token = no access
      if (!request.user || !request.user.id) {
        return reply.code(401).send(AUTH_ERRORS.INVALID_TOKEN);
      }

      // Verify user exists and is active in database
      const db = getDB();
      const userResult = await db.query(
        'SELECT id, username, role, is_active FROM users WHERE id = $1',
        [request.user.id]
      );

      // DENY BY DEFAULT: User not found or inactive = no access
      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        return reply.code(401).send(AUTH_ERRORS.USER_NOT_FOUND);
      }

      const dbUser = userResult.rows[0];

      // DENY BY DEFAULT: No role = no access
      if (!dbUser.role) {
        return reply.code(403).send(AUTH_ERRORS.INVALID_ROLE);
      }

      // DENY BY DEFAULT: Forbidden role = no access
      if (isForbiddenRole(dbUser.role)) {
        return reply.code(403).send(AUTH_ERRORS.FORBIDDEN_ROLE);
      }

      // Normalize role (handles legacy role names)
      const normalizedRole = normalizeRole(dbUser.role);

      // DENY BY DEFAULT: Invalid role after normalization = no access
      if (!normalizedRole) {
        return reply.code(403).send(AUTH_ERRORS.INVALID_ROLE);
      }

      // Attach verified user to request
      request.user = Object.freeze({
        id: dbUser.id,
        username: dbUser.username,
        role: normalizedRole,
      });

      // Update last login (non-blocking)
      db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [request.user.id]
      ).catch(() => {
        // Ignore errors - last login update is not critical
      });

    } catch (err) {
      // DENY BY DEFAULT: Any error = no access
      return reply.code(401).send(AUTH_ERRORS.INVALID_TOKEN);
    }
  });

  /**
   * Role requirement decorator (legacy compatibility)
   * Use fastify.requireRoles() from RBAC middleware instead
   * 
   * @deprecated Use requireRoles from rbac/middleware.js
   */
  fastify.decorate('requireRole', function (...allowedRoles) {
    return async function (request, reply) {
      // DENY BY DEFAULT: No user = no access
      if (!request.user) {
        return reply.code(401).send(AUTH_ERRORS.INVALID_TOKEN);
      }

      // DENY BY DEFAULT: No role = no access
      if (!request.user.role) {
        return reply.code(403).send(AUTH_ERRORS.INVALID_ROLE);
      }

      // DENY BY DEFAULT: Forbidden role requested = no access
      for (const role of allowedRoles) {
        if (isForbiddenRole(role)) {
          return reply.code(403).send(AUTH_ERRORS.FORBIDDEN_ROLE);
        }
      }

      // DENY BY DEFAULT: User has forbidden role = no access
      if (isForbiddenRole(request.user.role)) {
        return reply.code(403).send(AUTH_ERRORS.FORBIDDEN_ROLE);
      }

      // Check if user's role is in allowed roles (with normalization)
      const userRole = normalizeRole(request.user.role);
      const isAllowed = allowedRoles.some(allowedRole => {
        const normalizedAllowed = normalizeRole(allowedRole);
        return normalizedAllowed === userRole;
      });

      // DENY BY DEFAULT: Role not in allowed list = no access
      if (!isAllowed) {
        return reply.code(403).send(AUTH_ERRORS.FORBIDDEN_ROLE);
      }
    };
  });

  /**
   * Expose role constants
   */
  fastify.decorate('SystemRoles', SystemRoles);
  fastify.decorate('VALID_ROLES', VALID_ROLES);
  fastify.decorate('LEGACY_ROLE_MAPPING', LEGACY_ROLE_MAPPING);
}
