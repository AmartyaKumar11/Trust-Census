import bcrypt from 'bcryptjs';
import { getDB } from '../db/connection.js';
import { validate, userCreationSchema } from '../middleware/validation.js';
import { logAuditEvent } from '../middleware/audit.js';

/**
 * Authentication Routes
 * User registration and login
 * NO super-admin role creation allowed
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
    await logAuditEvent(fastify, {
      userId: user.id,
      actionType: 'USER_REGISTERED',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestMethod: request.method,
      requestPath: request.url,
      statusCode: 201,
      metadata: { role }
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
      await logAuditEvent(fastify, {
        userId: null,
        actionType: 'LOGIN_FAILED',
        resourceType: 'auth',
        resourceId: null,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        requestMethod: request.method,
        requestPath: request.url,
        statusCode: 401,
        metadata: { username }
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
      await logAuditEvent(fastify, {
        userId: user.id,
        actionType: 'LOGIN_FAILED',
        resourceType: 'auth',
        resourceId: user.id,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        requestMethod: request.method,
        requestPath: request.url,
        statusCode: 401,
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
    await logAuditEvent(fastify, {
      userId: user.id,
      actionType: 'LOGIN_SUCCESS',
      resourceType: 'auth',
      resourceId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestMethod: request.method,
      requestPath: request.url,
      statusCode: 200,
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

  // Verify token
  fastify.get('/auth/verify', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    return reply.send({
      user: request.user
    });
  });
}

