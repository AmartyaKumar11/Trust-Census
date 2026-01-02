import bcrypt from 'bcryptjs';
import { getDB } from '../db/connection.js';
import { validate, userCreationSchema } from '../middleware/validation.js';
import { logAuditEvent, AuditActionCategory, AuditOutcome } from '../audit/logger.js';

/**
 * Authentication Routes
 * 
 * RESPONSIBILITY: User registration and authentication endpoints
 * 
 * MUST:
 * - Allow user registration with valid roles only
 * - Authenticate users and issue JWT tokens
 * - Hash passwords securely (bcrypt)
 * - Explicitly reject super-admin role creation
 * - Log all authentication events
 * 
 * MUST NEVER:
 * - Create super-admin users
 * - Return passwords or password hashes
 * - Bypass authentication checks
 * - Allow role escalation
 * - Expose user credentials
 */

export async function authRoutes(fastify) {
  // User registration (admin function - would need separate admin setup)
  // For production, this should be done via secure bootstrap process
  fastify.post('/auth/register', {
    preHandler: [validate(userCreationSchema)],
    schema: {
      description: 'Register a new user (bootstrap only)',
      body: {
        type: 'object',
        required: ['username', 'password', 'role'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 100 },
          password: { type: 'string', minLength: 12 },
          role: { 
            type: 'string',
            enum: ['DATA_ENTRY', 'AUDITOR', 'ANALYST']
          }
        }
      }
    }
  }, async (request, reply) => {
    const { username, password, role } = request.body;
    const db = getDB();

    // Explicitly prevent super-admin
    if (role === 'SUPER_ADMIN') {
      return reply.code(403).send({
        error: 'Super-admin role is not permitted in this system'
      });
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return reply.code(409).send({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, passwordHash, role]
    );

    const user = result.rows[0];

    // Log audit event
    await logAuditEvent({
      timestamp: new Date().toISOString(),
      actorRole: role,
      actorId: user.id,
      actionCategory: AuditActionCategory.AUTH_SUCCESS,
      requestMethod: request.method,
      requestPath: request.url,
      outcome: AuditOutcome.SUCCESS,
      statusCode: 201,
      ipAddress: request.ip,
      metadata: {}
    });

    return reply.code(201).send({
      id: user.id,
      username: user.username,
      role: user.role
    });
  });

  // User login
  fastify.post('/auth/login', {
    schema: {
      description: 'Authenticate user and receive JWT token',
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { username, password } = request.body;
    const db = getDB();

    // Find user
    const result = await db.query(
      'SELECT id, username, password_hash, role, is_active FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      // Log failed login attempt
      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: 'ANONYMOUS',
        actorId: null,
        actionCategory: AuditActionCategory.AUTH_FAILURE,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.DENIED,
        statusCode: 401,
        ipAddress: request.ip,
        metadata: {}
      });

      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return reply.code(403).send({ error: 'Account is inactive' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      // Log failed login attempt
      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: user.role,
        actorId: user.id,
        actionCategory: AuditActionCategory.AUTH_FAILURE,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.DENIED,
        statusCode: 401,
        ipAddress: request.ip,
        metadata: {}
      });

      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = fastify.jwt.sign({
      id: user.id,
      username: user.username,
      role: user.role
    });

    // Log successful login
    await logAuditEvent({
      timestamp: new Date().toISOString(),
      actorRole: user.role,
      actorId: user.id,
      actionCategory: AuditActionCategory.AUTH_SUCCESS,
      requestMethod: request.method,
      requestPath: request.url,
      outcome: AuditOutcome.SUCCESS,
      statusCode: 200,
      ipAddress: request.ip,
      metadata: {}
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  });

  // Verify token - use onRequest hook instead of preHandler for authentication
  fastify.get('/auth/verify', async (request, reply) => {
    try {
      await request.jwtVerify();
      return reply.send({
        user: request.user
      });
    } catch (err) {
      return reply.code(401).send({ error: 'Invalid or expired token' });
    }
  });
}

