import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { initDB, getDB } from './db/connection.js';
import { initAuditWriterPool } from './db/connections.js';
import { authPlugin } from './middleware/auth.js';
import { rbacPlugin } from './rbac/middleware.js';
import { scopePlugin } from './scope/middleware.js';
import { auditPlugin } from './audit/middleware.js';
import { authRoutes } from './routes/auth.js';
import { submissionRoutes } from './routes/submissions.js';
import { aggregateRoutes } from './routes/aggregates.js';
import { auditRoutes } from './routes/audit.js';

// Load environment variables
dotenv.config();

/**
 * Trust Census Server - Application Entry Point
 * 
 * RESPONSIBILITY: Server initialization, plugin registration, route mounting
 * 
 * MUST:
 * - Register all security middleware (auth, audit, validation)
 * - Mount all API routes
 * - Handle graceful shutdown
 * - Initialize database connection
 * - Configure security plugins (helmet, CORS, rate limiting)
 * 
 * MUST NEVER:
 * - Contain business logic
 * - Bypass security layers
 * - Expose debug endpoints
 * - Register routes without authentication where required
 * - Allow super-admin role creation
 * 
 * Security Principles:
 * - No super-admin role
 * - No raw data access after submission
 * - No reverse data flow from aggregates
 * - No personal identifiers stored
 * - Complete auditability
 */

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV === 'development' 
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined
  },
  trustProxy: true // For accurate IP addresses behind proxies
});

// Register security plugins
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
});

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || false,
  credentials: true
});

await fastify.register(rateLimit, {
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  timeWindow: parseInt(process.env.RATE_LIMIT_TIME_WINDOW || '60000'),
  errorResponseBuilder: (request, context) => {
    return {
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(context.ttl / 1000)
    };
  }
});

// Initialize database connections
initDB();
const db = getDB();

// Initialize audit writer pool (uses audit_writer role - L0 only)
// This pool can ONLY INSERT into audit_logs, cannot read L1/L2/L3
initAuditWriterPool();

// Decorate fastify with database
fastify.decorate('db', db);

// Register authentication (identity verification + scope metadata)
await fastify.register(authPlugin);

// Register RBAC (role-based access control)
await fastify.register(rbacPlugin);

// Register scope and purpose enforcement
// Runs AFTER RBAC, ensures valid roles act only within assigned scope
// Enforces geographic scope and purpose binding
await fastify.register(scopePlugin);

// Register MANDATORY audit logging
// CANNOT be disabled via config or environment
// Uses audit_writer database role exclusively
// Enforces fail-closed behavior
await fastify.register(auditPlugin);

// Health check endpoint (no auth required, no data exposure)
fastify.get('/health', async (request, reply) => {
  try {
    // Check database connection
    await db.query('SELECT 1');
    return reply.send({ 
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return reply.code(503).send({ 
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

// Register routes
await fastify.register(authRoutes);
await fastify.register(submissionRoutes);
await fastify.register(aggregateRoutes);
await fastify.register(auditRoutes);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : error.message;

  reply.code(error.statusCode || 500).send({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info(`Trust Census Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM received, shutting down gracefully');
  await fastify.close();
  await db.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  fastify.log.info('SIGINT received, shutting down gracefully');
  await fastify.close();
  await db.end();
  process.exit(0);
});

start();

