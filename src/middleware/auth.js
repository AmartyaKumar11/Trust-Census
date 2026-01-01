import jwt from '@fastify/jwt';
import { getDB } from '../db/connection.js';

/**
 * Authentication Middleware
 * 
 * RESPONSIBILITY: JWT authentication and role-based access control
 * 
 * MUST:
 * - Verify JWT tokens on protected routes
 * - Enforce role-based access control (RBAC)
 * - Explicitly reject super-admin role (database + code)
 * - Verify user is active before allowing access
 * - Update last login timestamp
 * 
 * MUST NEVER:
 * - Allow super-admin role (explicitly rejected)
 * - Bypass authentication checks
 * - Grant permissions beyond user's role
 * - Expose user passwords or hashes
 * - Allow role escalation
 */

/**
 * Register JWT plugin
 */
export async function authPlugin(fastify) {
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'CHANGE_THIS_SECURE_SECRET',
    sign: {
      expiresIn: process.env.JWT_EXPIRY || '24h'
    }
  });

  // Decorate fastify with user lookup
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
      
      // Verify user still exists and is active
      const db = getDB();
      const userResult = await db.query(
        'SELECT id, username, role, is_active FROM users WHERE id = $1',
        [request.user.id]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
        return reply.code(401).send({ error: 'User not found or inactive' });
      }

      // Attach user to request
      request.user = {
        id: userResult.rows[0].id,
        username: userResult.rows[0].username,
        role: userResult.rows[0].role,
      };

      // Update last login
      await db.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [request.user.id]
      );
    } catch (err) {
      reply.send(err);
    }
  });

  // Role-based access control decorator
  fastify.decorate('requireRole', function (...allowedRoles) {
    return async function (request, reply) {
      if (!request.user) {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      // Explicitly prevent any super-admin role
      if (request.user.role === 'SUPER_ADMIN' || allowedRoles.includes('SUPER_ADMIN')) {
        return reply.code(403).send({ 
          error: 'Super-admin role is not permitted in this system' 
        });
      }

      if (!allowedRoles.includes(request.user.role)) {
        return reply.code(403).send({ 
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: request.user.role
        });
      }
    };
  });
}

