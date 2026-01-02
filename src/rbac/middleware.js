import fp from 'fastify-plugin';
import { 
  SystemRoles, 
  isValidRole, 
  isForbiddenRole, 
  normalizeRole,
  VALID_ROLES 
} from './roles.js';

/**
 * RBAC Middleware
 * 
 * RESPONSIBILITY: Deny-by-default role-based access control
 * 
 * This middleware enforces WHO is making a request, not WHAT the request does.
 * All access decisions are based solely on the authenticated role.
 * 
 * MUST:
 * - Deny by default (no access unless explicitly permitted)
 * - Allow access only if role is explicitly permitted
 * - NOT inspect request payloads for authorization decisions
 * - Provide generic error responses (no authorization logic leakage)
 * - Reject any super-admin or override role
 * 
 * MUST NEVER:
 * - Allow access without an authenticated role
 * - Allow role combination or escalation
 * - Inspect request payloads for authorization
 * - Leak authorization logic in error responses
 * - Allow default, fallback, or implicit roles
 */

/**
 * Generic access denied response
 * Does not leak authorization logic
 */
const ACCESS_DENIED_RESPONSE = Object.freeze({
  error: 'Access denied'
});

/**
 * Generic authentication required response
 */
const AUTHENTICATION_REQUIRED_RESPONSE = Object.freeze({
  error: 'Authentication required'
});

/**
 * Create RBAC middleware that enforces role-based access
 * 
 * @param {string[]} allowedRoles - Array of roles that are permitted access
 * @returns {Function} - Fastify preHandler function
 */
export function requireRoles(...allowedRoles) {
  // Validate allowed roles at middleware creation time
  for (const role of allowedRoles) {
    if (isForbiddenRole(role)) {
      throw new Error(`Cannot create RBAC middleware with forbidden role: ${role}`);
    }
    if (!isValidRole(role)) {
      throw new Error(`Cannot create RBAC middleware with invalid role: ${role}`);
    }
  }

  return async function rbacMiddleware(request, reply) {
    // DENY BY DEFAULT: No user = no access
    if (!request.user) {
      return reply.code(401).send(AUTHENTICATION_REQUIRED_RESPONSE);
    }

    // DENY BY DEFAULT: No role = no access
    if (!request.user.role) {
      return reply.code(403).send(ACCESS_DENIED_RESPONSE);
    }

    // Normalize the user's role (handles legacy roles)
    const normalizedRole = normalizeRole(request.user.role);

    // DENY BY DEFAULT: Invalid role = no access
    if (!normalizedRole) {
      return reply.code(403).send(ACCESS_DENIED_RESPONSE);
    }

    // DENY BY DEFAULT: Forbidden role = no access
    if (isForbiddenRole(request.user.role)) {
      return reply.code(403).send(ACCESS_DENIED_RESPONSE);
    }

    // Check if user's role is in the allowed roles
    const isAllowed = allowedRoles.some(allowedRole => {
      const normalizedAllowed = normalizeRole(allowedRole);
      return normalizedAllowed === normalizedRole;
    });

    // DENY BY DEFAULT: Role not in allowed list = no access
    if (!isAllowed) {
      return reply.code(403).send(ACCESS_DENIED_RESPONSE);
    }

    // Update request with normalized role
    request.user.role = normalizedRole;

    // Access granted - continue to next handler
  };
}

/**
 * Middleware that requires authentication but allows any valid role
 * Still enforces deny-by-default for invalid/forbidden roles
 * 
 * @returns {Function} - Fastify preHandler function
 */
export function requireAuthenticated() {
  return async function authenticatedMiddleware(request, reply) {
    // DENY BY DEFAULT: No user = no access
    if (!request.user) {
      return reply.code(401).send(AUTHENTICATION_REQUIRED_RESPONSE);
    }

    // DENY BY DEFAULT: No role = no access
    if (!request.user.role) {
      return reply.code(403).send(ACCESS_DENIED_RESPONSE);
    }

    // Normalize the user's role
    const normalizedRole = normalizeRole(request.user.role);

    // DENY BY DEFAULT: Invalid role = no access
    if (!normalizedRole) {
      return reply.code(403).send(ACCESS_DENIED_RESPONSE);
    }

    // DENY BY DEFAULT: Forbidden role = no access
    if (isForbiddenRole(request.user.role)) {
      return reply.code(403).send(ACCESS_DENIED_RESPONSE);
    }

    // Update request with normalized role
    request.user.role = normalizedRole;

    // Access granted - continue to next handler
  };
}

/**
 * Fastify plugin to register RBAC decorators
 * Wrapped with fastify-plugin to ensure decorators are available globally
 */
async function rbacPluginImpl(fastify) {
  /**
   * Decorate fastify with role requirement function
   * Usage: fastify.requireRoles(SystemRoles.ENUMERATOR, SystemRoles.SUPERVISOR)
   */
  fastify.decorate('requireRoles', function (...allowedRoles) {
    return requireRoles(...allowedRoles);
  });

  /**
   * Alias for requireRoles (backward compatibility)
   * Usage: fastify.requireRole('ENUMERATOR', 'SUPERVISOR')
   */
  fastify.decorate('requireRole', function (...allowedRoles) {
    return requireRoles(...allowedRoles);
  });

  /**
   * Decorate fastify with authenticated-only requirement
   * Usage: fastify.requireAuthenticated()
   */
  fastify.decorate('requireAuthenticated', function () {
    return requireAuthenticated();
  });

  /**
   * Decorate fastify with role constants for easy access
   */
  fastify.decorate('SystemRoles', SystemRoles);

  /**
   * Add onRequest hook to validate role on every request
   * This ensures no request can proceed without role validation
   */
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip role validation for public endpoints (health check)
    if (request.url === '/health') {
      return;
    }

    // Skip role validation for authentication endpoints
    if (request.url.startsWith('/auth/')) {
      return;
    }

    // For all other endpoints, if user is present, validate role
    if (request.user && request.user.role) {
      // Check for forbidden roles
      if (isForbiddenRole(request.user.role)) {
        return reply.code(403).send(ACCESS_DENIED_RESPONSE);
      }

      // Normalize role
      const normalizedRole = normalizeRole(request.user.role);
      if (!normalizedRole) {
        return reply.code(403).send(ACCESS_DENIED_RESPONSE);
      }

      // Update request with normalized role
      request.user.role = normalizedRole;
    }
  });
}

// Wrap with fastify-plugin to ensure decorators propagate to child contexts
export const rbacPlugin = fp(rbacPluginImpl, {
  name: 'rbac-plugin',
  fastify: '4.x',
});

/**
 * Export role constants for convenience
 */
export { SystemRoles } from './roles.js';

