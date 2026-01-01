/**
 * Scope Module Index
 * 
 * RESPONSIBILITY: Export all scope and purpose enforcement components
 * 
 * This module provides scope and purpose enforcement for the Trust-First
 * Caste Census Management System.
 * 
 * Components:
 * - definitions.js: Scope and purpose category definitions
 * - middleware.js: Scope enforcement middleware
 */

// Definitions
export {
  GeographicLevel,
  GEOGRAPHIC_HIERARCHY,
  FunctionalScope,
  PurposeCategory,
  ROLE_FUNCTIONAL_SCOPE,
  SCOPE_ALLOWED_PURPOSES,
  ROLE_GEOGRAPHIC_LEVELS,
  FORBIDDEN_SCOPE_PATTERNS,
  isForbiddenScope,
  validateGeographicCode,
  isWithinGeographicScope,
  isPurposeAllowed,
  getFunctionalScopeForRole,
  getAllowedGeographicLevels,
} from './definitions.js';

// Middleware
export {
  requireScope,
  scopePlugin,
} from './middleware.js';

