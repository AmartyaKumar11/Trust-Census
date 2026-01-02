import fp from 'fastify-plugin';
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
 * RESPONSIBILITY: JWT authentication, identity verification, and scope attachment
 * 
 * This module handles WHO is making a request (identity).
 * Role-based access control is handled by the RBAC middleware.
 * Scope and purpose enforcement is handled by the scope middleware.
 * 
 * MUST:
 * - Verify JWT tokens on protected routes
 * - Verify user exists and is active
 * - Attach user identity and role to request
 * - Attach IMMUTABLE scope metadata to request
 * - Normalize roles (handle legacy role names)
 * - Explicitly reject forbidden roles (super-admin, etc.)
 * 
 * MUST NEVER:
 * - Allow access without valid JWT
 * - Allow access with forbidden roles
 * - Allow role combination or escalation
 * - Allow scope escalation via request
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
 * Register authentication plugin implementation
 */
async function authPluginImpl(fastify) {
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
      // Also load scope assignment (IMMUTABLE - cannot be changed via request)
      const db = getDB();
      const userResult = await db.query(
        `SELECT 
          u.id, 
          u.username, 
          u.role, 
          u.is_active,
          usa.functional_scope,
          usa.geographic_level,
          usa.geographic_code
        FROM users u
        LEFT JOIN user_scope_assignments usa ON u.id = usa.user_id
        WHERE u.id = $1`,
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

      // Load additional scope codes if user has scope assignment
      let additionalCodes = [];
      if (dbUser.functional_scope) {
        const additionalResult = await db.query(
          `SELECT geographic_level, geographic_code 
           FROM user_additional_scopes 
           WHERE user_id = $1`,
          [dbUser.id]
        );
        additionalCodes = additionalResult.rows.map(r => r.geographic_code);
      }

      // Attach verified user to request with IMMUTABLE scope metadata
      // Scope is loaded from database and CANNOT be modified via request
      request.user = Object.freeze({
        id: dbUser.id,
        username: dbUser.username,
        role: normalizedRole,
        // Immutable scope metadata - cannot be escalated
        scope: Object.freeze({
          functional: dbUser.functional_scope || null,
          geographic: dbUser.geographic_level ? Object.freeze({
            level: dbUser.geographic_level,
            code: dbUser.geographic_code,
            codes: Object.freeze(additionalCodes),
          }) : null,
        }),
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

  // NOTE: requireRole is defined in rbac/middleware.js
  // Role constants are also defined there
}

// Wrap with fastify-plugin to ensure decorators propagate to child contexts
export const authPlugin = fp(authPluginImpl, {
  name: 'auth-plugin',
  fastify: '4.x',
});
