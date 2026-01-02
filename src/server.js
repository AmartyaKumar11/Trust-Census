import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { initDB, getDB, verifyDatabaseConnection } from './db/connection.js';
import { initAuditWriterPool } from './db/connections.js';
import { authPlugin } from './middleware/auth.js';
import { rbacPlugin } from './rbac/middleware.js';
import { scopePlugin } from './scope/middleware.js';
import { auditPlugin } from './audit/middleware.js';
import { authRoutes } from './routes/auth.js';
import { submissionRoutes } from './routes/submissions.js';
import { aggregateRoutes } from './routes/aggregates.js';
import { auditRoutes } from './routes/audit.js';
import { consentRoutes } from './routes/consent.js';
import { analyticsRoutes } from './routes/analytics.js';

// Load environment variables
dotenv.config();

/**
 * IMPORTANT: Aggregation workers are NOT loaded in the API process.
 * Aggregation runs ONLY via offline worker: node src/workers/aggregation/index.js
 * This ensures separation of concerns and prevents HTTP-triggered aggregation.
 */

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
await fastify.register(consentRoutes);  // Consent routes (L0) - must be before submissions
await fastify.register(submissionRoutes);
await fastify.register(aggregateRoutes);
await fastify.register(auditRoutes);
await fastify.register(analyticsRoutes);  // Analytics routes (L3 read-only)

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
    console.log('');
    console.log('='.repeat(70));
    console.log('Trust-First Caste Census Management System');
    console.log('='.repeat(70));
    console.log('');
    
    // Verify database connection and log server info
    console.log('[STARTUP] Verifying database connection...');
    const dbInfo = await verifyDatabaseConnection();
    
    if (!dbInfo.connected) {
      console.error('[STARTUP] FATAL: Database connection failed');
      console.error('[STARTUP] Ensure Docker PostgreSQL is running on port 5433');
      console.error('[STARTUP] Command: docker run -d --name trust-census-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=trust_census -p 5433:5432 postgres:16-alpine');
      process.exit(1);
    }
    
    // Verify we're connected to Docker PostgreSQL (should show PostgreSQL 16.x)
    if (dbInfo.serverVersion && !dbInfo.serverVersion.includes('16')) {
      console.warn('[STARTUP] WARNING: Expected PostgreSQL 16.x (Docker), got:', dbInfo.serverVersion);
    }
    
    console.log('');
    console.log('[STARTUP] Middleware initialization:');
    console.log('     ✓ Authentication (JWT)');
    console.log('     ✓ RBAC (Role-Based Access Control)');
    console.log('     ✓ Scope & Purpose Enforcement');
    console.log('     ✓ Audit Logging (fail-closed)');
    console.log('');
    console.log('[STARTUP] Security guarantees:');
    console.log('     ✓ No super-admin role');
    console.log('     ✓ No raw data access after submission');
    console.log('     ✓ No HTTP-triggered aggregation');
    console.log('     ✓ Aggregation workers NOT loaded in API process');
    console.log('');
    
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log('='.repeat(70));
    console.log(`[STARTUP] Server listening on http://${host}:${port}`);
    console.log('='.repeat(70));
    console.log('');
    
    fastify.log.info(`Trust Census Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    console.error('[STARTUP] FATAL:', err.message);
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

