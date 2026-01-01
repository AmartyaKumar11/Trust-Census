/**
 * Scope and Purpose Enforcement Middleware
 * 
 * RESPONSIBILITY: Enforce geographic scope and purpose binding
 * 
 * This middleware runs AFTER RBAC and BEFORE route handlers.
 * It ensures that even valid roles can act ONLY within their assigned scope.
 * 
 * MUST:
 * - Validate geographic scope for all protected requests
 * - Validate purpose binding for all protected requests
 * - Deny requests outside actor's scope
 * - Deny requests with mismatched purpose
 * - Produce audit records on denial
 * 
 * MUST NEVER:
 * - Allow wildcard scopes
 * - Allow dynamic scope escalation
 * - Allow purpose override via request payload
 * - Rely solely on request parameters for validation
 * - Allow scope bypass via any mechanism
 */

import {
  GeographicLevel,
  FunctionalScope,
  PurposeCategory,
  ROLE_FUNCTIONAL_SCOPE,
  SCOPE_ALLOWED_PURPOSES,
  isForbiddenScope,
  isWithinGeographicScope,
  isPurposeAllowed,
  getFunctionalScopeForRole,
  getAllowedGeographicLevels,
} from './definitions.js';
import { logAuditEvent, AuditActionCategory, AuditOutcome } from '../audit/logger.js';

/**
 * Generic scope denied response
 * Does not leak scope logic
 */
const SCOPE_DENIED_RESPONSE = Object.freeze({
  error: 'Access denied'
});

/**
 * Route purpose declarations
 * Maps route patterns to their required purpose
 */
const ROUTE_PURPOSE_MAP = Object.freeze({
  // Submission routes
  'POST:/submissions': PurposeCategory.CENSUS_SUBMISSION,
  'GET:/submissions/:id/verify': PurposeCategory.SUBMISSION_VERIFY,
  
  // Aggregate routes
  'POST:/aggregates/compute': PurposeCategory.AGGREGATE_COMPUTE,
  'POST:/aggregates/compute/macro': PurposeCategory.AGGREGATE_COMPUTE,
  'GET:/aggregates': PurposeCategory.AGGREGATE_READ,
  'GET:/aggregates/:id': PurposeCategory.AGGREGATE_READ,
  'GET:/aggregates/:id/verify': PurposeCategory.AGGREGATE_READ,
  
  // Policy routes
  'GET:/policy/aggregates': PurposeCategory.POLICY_READ,
  'GET:/policy/aggregates/:id': PurposeCategory.POLICY_READ,
  
  // Audit routes
  'GET:/audit/logs': PurposeCategory.AUDIT_READ,
  'GET:/audit/logs/:id': PurposeCategory.AUDIT_READ,
  
  // Consent routes (L0)
  'POST:/consent/capture': PurposeCategory.CONSENT_MANAGE,
  'GET:/consent/verify/:receiptId': PurposeCategory.CONSENT_MANAGE,
  'GET:/consent/status': PurposeCategory.METADATA_READ, // Supervisor aggregate view
  'POST:/citizen/consent': PurposeCategory.CONSENT_MANAGE,
  'DELETE:/citizen/consent': PurposeCategory.CONSENT_MANAGE,
  'GET:/citizen/consent': PurposeCategory.CONSENT_MANAGE,
  
  // Metadata routes
  'GET:/submissions/metadata': PurposeCategory.METADATA_READ,
  
  // Auth routes (special handling)
  'POST:/auth/login': PurposeCategory.AUTHENTICATION,
  'POST:/auth/register': PurposeCategory.AUTHENTICATION,
  'GET:/auth/verify': PurposeCategory.AUTHENTICATION,
  
  // Health check
  'GET:/health': PurposeCategory.SYSTEM_HEALTH,
});

/**
 * Get purpose for a route
 */
function getRoutePurpose(method, path) {
  // Try exact match first
  const exactKey = `${method}:${path}`;
  if (ROUTE_PURPOSE_MAP[exactKey]) {
    return ROUTE_PURPOSE_MAP[exactKey];
  }
  
  // Try pattern matching for parameterized routes
  for (const [pattern, purpose] of Object.entries(ROUTE_PURPOSE_MAP)) {
    const [patternMethod, patternPath] = pattern.split(':');
    if (patternMethod !== method) continue;
    
    // Convert pattern to regex
    const regexPattern = patternPath
      .replace(/:[^/]+/g, '[^/]+')
      .replace(/\//g, '\\/');
    
    if (new RegExp(`^${regexPattern}$`).test(path)) {
      return purpose;
    }
  }
  
  return null;
}

/**
 * Extract geographic codes from request
 * Returns codes from URL params, query, and body
 */
function extractGeographicCodes(request) {
  const codes = {
    stateCode: null,
    districtCode: null,
    blockCode: null,
    villageCode: null,
    geographicLevel: null,
    geographicCode: null,
  };
  
  // From URL params
  if (request.params) {
    codes.stateCode = request.params.stateCode || codes.stateCode;
    codes.districtCode = request.params.districtCode || codes.districtCode;
    codes.blockCode = request.params.blockCode || codes.blockCode;
    codes.villageCode = request.params.villageCode || codes.villageCode;
  }
  
  // From query string
  if (request.query) {
    codes.stateCode = request.query.stateCode || codes.stateCode;
    codes.districtCode = request.query.districtCode || codes.districtCode;
    codes.blockCode = request.query.blockCode || codes.blockCode;
    codes.villageCode = request.query.villageCode || codes.villageCode;
    codes.geographicLevel = request.query.geographicLevel || codes.geographicLevel;
    codes.geographicCode = request.query.geographicCode || codes.geographicCode;
  }
  
  // From body (for POST requests)
  if (request.body && typeof request.body === 'object') {
    codes.stateCode = request.body.stateCode || codes.stateCode;
    codes.districtCode = request.body.districtCode || codes.districtCode;
    codes.blockCode = request.body.blockCode || codes.blockCode;
    codes.villageCode = request.body.villageCode || codes.villageCode;
    codes.geographicLevel = request.body.geographicLevel || codes.geographicLevel;
    codes.geographicCode = request.body.geographicCode || codes.geographicCode;
  }
  
  return codes;
}

/**
 * Get user scope from request
 * Scope is loaded during authentication and attached to request.user
 * This function does NOT load from database - it uses the immutable scope
 * that was attached during authentication
 * 
 * @param {object} request - Fastify request with user attached
 * @returns {object|null} - User scope or null if not assigned
 */
function getUserScopeFromRequest(request) {
  // Scope is attached during authentication
  // It is IMMUTABLE and cannot be modified via request
  if (!request.user || !request.user.scope) {
    return null;
  }
  
  const { scope } = request.user;
  
  if (!scope.functional || !scope.geographic) {
    return null;
  }
  
  return {
    functionalScope: scope.functional,
    level: scope.geographic.level,
    code: scope.geographic.code,
    codes: scope.geographic.codes || [],
  };
}

/**
 * Validate geographic scope
 */
function validateGeographicScope(userScope, requestedCodes, allowedLevels) {
  // If no geographic codes in request, scope check passes
  // (route may not require geographic scope)
  const hasGeographicRequest = 
    requestedCodes.stateCode ||
    requestedCodes.districtCode ||
    requestedCodes.blockCode ||
    requestedCodes.villageCode ||
    requestedCodes.geographicCode;
  
  if (!hasGeographicRequest) {
    return { valid: true };
  }
  
  // Check for forbidden patterns
  for (const code of Object.values(requestedCodes)) {
    if (code && isForbiddenScope(code)) {
      return { valid: false, reason: 'Forbidden scope pattern' };
    }
  }
  
  // If user has no scope assigned, deny
  if (!userScope) {
    return { valid: false, reason: 'No scope assigned' };
  }
  
  // Determine the most specific requested level and code
  let requestedLevel = null;
  let requestedCode = null;
  
  if (requestedCodes.villageCode) {
    requestedLevel = GeographicLevel.VILLAGE;
    requestedCode = requestedCodes.villageCode;
  } else if (requestedCodes.blockCode) {
    requestedLevel = GeographicLevel.BLOCK;
    requestedCode = requestedCodes.blockCode;
  } else if (requestedCodes.districtCode) {
    requestedLevel = GeographicLevel.DISTRICT;
    requestedCode = requestedCodes.districtCode;
  } else if (requestedCodes.stateCode) {
    requestedLevel = GeographicLevel.STATE;
    requestedCode = requestedCodes.stateCode;
  } else if (requestedCodes.geographicLevel && requestedCodes.geographicCode) {
    requestedLevel = requestedCodes.geographicLevel.toUpperCase();
    requestedCode = requestedCodes.geographicCode;
  }
  
  if (!requestedLevel || !requestedCode) {
    return { valid: true }; // No specific scope requested
  }
  
  // Check if requested level is allowed for the role
  if (allowedLevels.length > 0 && !allowedLevels.includes(requestedLevel)) {
    return { valid: false, reason: 'Geographic level not permitted' };
  }
  
  // Check if code is within user's scope
  if (!isWithinGeographicScope(userScope, requestedLevel, requestedCode)) {
    return { valid: false, reason: 'Outside assigned geographic scope' };
  }
  
  return { valid: true };
}

/**
 * Create scope enforcement middleware
 * 
 * @param {string} declaredPurpose - The purpose this route serves
 * @returns {Function} - Fastify preHandler function
 */
export function requireScope(declaredPurpose) {
  if (!declaredPurpose) {
    throw new Error('Scope middleware requires a declared purpose');
  }
  
  return async function scopeMiddleware(request, reply) {
    // Skip for unauthenticated requests (will be caught by auth middleware)
    if (!request.user) {
      return;
    }
    
    const userId = request.user.id;
    const userRole = request.user.role;
    
    // Get functional scope for role
    const functionalScope = getFunctionalScopeForRole(userRole);
    if (!functionalScope) {
      await logScopeDenial(request, 'No functional scope for role');
      return reply.code(403).send(SCOPE_DENIED_RESPONSE);
    }
    
    // Validate purpose binding
    if (!isPurposeAllowed(functionalScope, declaredPurpose)) {
      await logScopeDenial(request, 'Purpose not allowed for scope');
      return reply.code(403).send(SCOPE_DENIED_RESPONSE);
    }
    
    // Get user's geographic scope from request (loaded during auth)
    const userScope = getUserScopeFromRequest(request);
    
    // Get allowed geographic levels for role
    const allowedLevels = getAllowedGeographicLevels(userRole);
    
    // Extract geographic codes from request
    const requestedCodes = extractGeographicCodes(request);
    
    // Validate geographic scope
    const scopeValidation = validateGeographicScope(userScope, requestedCodes, allowedLevels);
    
    if (!scopeValidation.valid) {
      await logScopeDenial(request, scopeValidation.reason);
      return reply.code(403).send(SCOPE_DENIED_RESPONSE);
    }
    
    // Attach scope to request for use in handlers
    request.scope = Object.freeze({
      functional: functionalScope,
      geographic: userScope,
      purpose: declaredPurpose,
    });
  };
}

/**
 * Log scope denial for audit
 */
async function logScopeDenial(request, reason) {
  try {
    await logAuditEvent({
      timestamp: new Date().toISOString(),
      actorRole: request.user?.role || 'ANONYMOUS',
      actorId: request.user?.id || null,
      actionCategory: AuditActionCategory.ACCESS_DENIED,
      requestMethod: request.method,
      requestPath: request.url,
      outcome: AuditOutcome.DENIED,
      statusCode: 403,
      ipAddress: request.ip,
      metadata: {
        denialType: 'SCOPE_VIOLATION',
        // Do NOT log the specific reason (could leak scope logic)
      },
    });
  } catch (error) {
    console.error('Failed to log scope denial:', error);
  }
}

/**
 * Scope Plugin - Registers scope enforcement
 */
export async function scopePlugin(fastify) {
  /**
   * Decorate fastify with scope requirement function
   */
  fastify.decorate('requireScope', function (purpose) {
    return requireScope(purpose);
  });
  
  /**
   * Decorate with scope constants
   */
  fastify.decorate('PurposeCategory', PurposeCategory);
  fastify.decorate('FunctionalScope', FunctionalScope);
  fastify.decorate('GeographicLevel', GeographicLevel);
  
  /**
   * Add preHandler hook for automatic scope validation
   * This runs after authentication and RBAC
   */
  fastify.addHook('preHandler', async (request, reply) => {
    // Skip for public endpoints
    if (request.url === '/health') {
      return;
    }
    
    // Skip for auth endpoints
    if (request.url.startsWith('/auth/')) {
      return;
    }
    
    // Skip if no user (will be caught by auth)
    if (!request.user) {
      return;
    }
    
    // Get purpose for this route
    const purpose = getRoutePurpose(request.method, request.routerPath || request.url);
    
    // If route has no declared purpose, deny by default
    if (!purpose) {
      await logScopeDenial(request, 'No purpose declared for route');
      return reply.code(403).send(SCOPE_DENIED_RESPONSE);
    }
    
    // Get functional scope for role
    const functionalScope = getFunctionalScopeForRole(request.user.role);
    
    // Validate purpose binding
    if (!isPurposeAllowed(functionalScope, purpose)) {
      await logScopeDenial(request, 'Purpose not allowed');
      return reply.code(403).send(SCOPE_DENIED_RESPONSE);
    }
    
    // Get and validate geographic scope from request (loaded during auth)
    const userScope = getUserScopeFromRequest(request);
    const allowedLevels = getAllowedGeographicLevels(request.user.role);
    const requestedCodes = extractGeographicCodes(request);
    
    const scopeValidation = validateGeographicScope(userScope, requestedCodes, allowedLevels);
    
    if (!scopeValidation.valid) {
      await logScopeDenial(request, scopeValidation.reason);
      return reply.code(403).send(SCOPE_DENIED_RESPONSE);
    }
    
    // Attach scope to request
    request.scope = Object.freeze({
      functional: functionalScope,
      geographic: userScope,
      purpose: purpose,
    });
  });
  
  fastify.log.info('Scope and purpose enforcement initialized');
}

/**
 * Export definitions for use in other modules
 */
export {
  GeographicLevel,
  FunctionalScope,
  PurposeCategory,
} from './definitions.js';

