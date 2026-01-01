/**
 * RBAC Module Index
 * 
 * RESPONSIBILITY: Export all RBAC components
 * 
 * This module provides role-based access control for the Trust-First
 * Caste Census Management System.
 * 
 * Components:
 * - roles.js: Authoritative role definitions
 * - middleware.js: Deny-by-default RBAC middleware
 */

// Role definitions
export {
  SystemRoles,
  VALID_ROLES,
  FORBIDDEN_ROLE_PATTERNS,
  LEGACY_ROLE_MAPPING,
  isValidRole,
  isForbiddenRole,
  normalizeRole,
  getRoleDisplayName,
  hasNoRoleOverlap,
  assertValidRole,
} from './roles.js';

// Middleware
export {
  requireRoles,
  requireAuthenticated,
  rbacPlugin,
} from './middleware.js';

