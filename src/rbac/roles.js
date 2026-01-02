/**
 * Authoritative Role Definition
 * 
 * RESPONSIBILITY: Single source of truth for all system roles
 * 
 * This module defines the ONLY roles that may exist in the system.
 * Roles are fixed, immutable, and cannot be combined or escalated.
 * 
 * MUST:
 * - Define exactly 5 roles (Citizen, Enumerator, Supervisor, StateAnalyst, CentralPolicyViewer)
 * - Prevent any role combination or escalation
 * - Explicitly reject super-admin or override roles
 * - Provide role validation functions
 * 
 * MUST NEVER:
 * - Allow role combination
 * - Allow role escalation
 * - Define super-admin or override roles
 * - Allow default or fallback roles
 * - Allow implicit role assignment
 */

/**
 * System Roles
 * 
 * These are the ONLY roles permitted in the system.
 * No other roles may exist. No combinations are allowed.
 */
export const SystemRoles = Object.freeze({
  // Citizen: Individual whose census data is being collected
  // Access: L0 (own consent only)
  CITIZEN: 'CITIZEN',
  
  // Enumerator: Field data collection personnel
  // Access: L1 (write-only), L0 (submission confirmations)
  ENUMERATOR: 'ENUMERATOR',
  
  // Supervisor: Administrative personnel for oversight
  // Access: L0 (audit logs, metadata)
  SUPERVISOR: 'SUPERVISOR',
  
  // StateAnalyst: Personnel who compute and access aggregates
  // Access: L2, L3 (compute and read)
  STATE_ANALYST: 'STATE_ANALYST',
  
  // CentralPolicyViewer: Central/national level policy access
  // Access: L3 (read-only, national/state level)
  CENTRAL_POLICY_VIEWER: 'CENTRAL_POLICY_VIEWER',
});

/**
 * Role array for iteration and validation
 */
export const VALID_ROLES = Object.freeze(Object.values(SystemRoles));

/**
 * Forbidden role patterns
 * These role names are explicitly forbidden and will be rejected
 */
export const FORBIDDEN_ROLE_PATTERNS = Object.freeze([
  'SUPER_ADMIN',
  'SUPERADMIN',
  'ADMIN',
  'ADMINISTRATOR',
  'ROOT',
  'SYSTEM',
  'OVERRIDE',
  'BYPASS',
  'ALL',
  'MASTER',
  'GOD',
  'SUDO',
]);

/**
 * Legacy role mapping
 * Maps old role names to new role names for migration
 * Used during transition period only
 */
export const LEGACY_ROLE_MAPPING = Object.freeze({
  'DATA_ENTRY': SystemRoles.ENUMERATOR,
  'AUDITOR': SystemRoles.SUPERVISOR,
  'ANALYST': SystemRoles.STATE_ANALYST,
});

/**
 * Validate if a role is a valid system role
 * Accepts both new role names and legacy role names
 * 
 * @param {string} role - Role to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export function isValidRole(role) {
  if (!role || typeof role !== 'string') {
    return false;
  }
  
  const normalizedRole = role.toUpperCase().trim();
  
  // Check if it's a forbidden role pattern
  if (isForbiddenRole(normalizedRole)) {
    return false;
  }
  
  // Check if it's a valid system role
  if (VALID_ROLES.includes(normalizedRole)) {
    return true;
  }
  
  // Check if it's a legacy role that can be mapped
  if (LEGACY_ROLE_MAPPING[normalizedRole]) {
    return true;
  }
  
  return false;
}

/**
 * Check if a role is a forbidden role pattern
 * 
 * @param {string} role - Role to check
 * @returns {boolean} - True if forbidden, false otherwise
 */
export function isForbiddenRole(role) {
  if (!role || typeof role !== 'string') {
    return false;
  }
  
  const normalizedRole = role.toUpperCase().trim();
  
  // Check exact matches
  if (FORBIDDEN_ROLE_PATTERNS.includes(normalizedRole)) {
    return true;
  }
  
  // Check if role contains forbidden patterns
  for (const pattern of FORBIDDEN_ROLE_PATTERNS) {
    if (normalizedRole.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Normalize role name (handles legacy roles)
 * 
 * @param {string} role - Role to normalize
 * @returns {string|null} - Normalized role or null if invalid
 */
export function normalizeRole(role) {
  if (!role || typeof role !== 'string') {
    return null;
  }
  
  const normalizedRole = role.toUpperCase().trim();
  
  // Check if it's a forbidden role
  if (isForbiddenRole(normalizedRole)) {
    return null;
  }
  
  // Check if it's a valid system role
  if (VALID_ROLES.includes(normalizedRole)) {
    return normalizedRole;
  }
  
  // Check if it's a legacy role that can be mapped
  if (LEGACY_ROLE_MAPPING[normalizedRole]) {
    return LEGACY_ROLE_MAPPING[normalizedRole];
  }
  
  return null;
}

/**
 * Get role display name
 * 
 * @param {string} role - Role to get display name for
 * @returns {string} - Display name
 */
export function getRoleDisplayName(role) {
  const displayNames = {
    [SystemRoles.CITIZEN]: 'Citizen',
    [SystemRoles.ENUMERATOR]: 'Enumerator',
    [SystemRoles.SUPERVISOR]: 'Supervisor',
    [SystemRoles.STATE_ANALYST]: 'State Analyst',
    [SystemRoles.CENTRAL_POLICY_VIEWER]: 'Central Policy Viewer',
  };
  
  return displayNames[role] || 'Unknown';
}

/**
 * Validate that roles do not overlap or combine
 * 
 * @param {string[]} roles - Array of roles to check
 * @returns {boolean} - True if no overlap (single role), false if overlap
 */
export function hasNoRoleOverlap(roles) {
  if (!Array.isArray(roles)) {
    return false;
  }
  
  // A user must have exactly one role
  if (roles.length !== 1) {
    return false;
  }
  
  // The single role must be valid
  return isValidRole(roles[0]);
}

/**
 * Assert that a role is valid (throws if not)
 * 
 * @param {string} role - Role to assert
 * @throws {Error} - If role is invalid
 */
export function assertValidRole(role) {
  if (isForbiddenRole(role)) {
    throw new Error(`Forbidden role detected: ${role}. This role is not permitted in the system.`);
  }
  
  if (!isValidRole(role)) {
    throw new Error(`Invalid role: ${role}. Valid roles are: ${VALID_ROLES.join(', ')}`);
  }
}

