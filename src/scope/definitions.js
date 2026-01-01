/**
 * Scope and Purpose Definitions
 * 
 * RESPONSIBILITY: Define immutable scope and purpose categories
 * 
 * This module defines the ONLY scope and purpose categories permitted in the system.
 * Scopes and purposes are fixed, immutable, and cannot be escalated.
 * 
 * MUST:
 * - Define geographic scope levels (state, district, block, village)
 * - Define functional scope categories (SUBMISSION, OVERSIGHT, ANALYSIS, POLICY_VIEW)
 * - Define purpose categories for each route type
 * - Prevent scope escalation or wildcard scopes
 * 
 * MUST NEVER:
 * - Allow wildcard scopes (e.g., "*" or "ALL")
 * - Allow dynamic scope escalation
 * - Allow scope combination beyond hierarchy
 * - Allow purpose override via request payload
 */

/**
 * Geographic Scope Levels
 * Hierarchical: NATIONAL > STATE > DISTRICT > BLOCK > VILLAGE
 */
export const GeographicLevel = Object.freeze({
  NATIONAL: 'NATIONAL',
  STATE: 'STATE',
  DISTRICT: 'DISTRICT',
  BLOCK: 'BLOCK',
  VILLAGE: 'VILLAGE',
});

/**
 * Geographic level hierarchy (higher index = more specific)
 */
export const GEOGRAPHIC_HIERARCHY = Object.freeze([
  GeographicLevel.NATIONAL,
  GeographicLevel.STATE,
  GeographicLevel.DISTRICT,
  GeographicLevel.BLOCK,
  GeographicLevel.VILLAGE,
]);

/**
 * Functional Scope Categories
 * Each actor is assigned exactly one functional scope
 */
export const FunctionalScope = Object.freeze({
  // Enumerator: Can submit census data
  SUBMISSION: 'SUBMISSION',
  
  // Supervisor: Can view audit logs and metadata
  OVERSIGHT: 'OVERSIGHT',
  
  // StateAnalyst: Can compute and read aggregates
  ANALYSIS: 'ANALYSIS',
  
  // CentralPolicyViewer: Can view policy-level aggregates
  POLICY_VIEW: 'POLICY_VIEW',
  
  // Citizen: Can manage own consent
  CONSENT: 'CONSENT',
});

/**
 * Purpose Categories
 * Each route declares its required purpose
 */
export const PurposeCategory = Object.freeze({
  // Data submission purposes
  CENSUS_SUBMISSION: 'CENSUS_SUBMISSION',
  SUBMISSION_VERIFY: 'SUBMISSION_VERIFY',
  
  // Aggregate purposes
  AGGREGATE_COMPUTE: 'AGGREGATE_COMPUTE',
  AGGREGATE_READ: 'AGGREGATE_READ',
  
  // Audit purposes
  AUDIT_READ: 'AUDIT_READ',
  METADATA_READ: 'METADATA_READ',
  
  // Policy purposes
  POLICY_READ: 'POLICY_READ',
  
  // Consent purposes
  CONSENT_MANAGE: 'CONSENT_MANAGE',
  
  // Authentication purposes
  AUTHENTICATION: 'AUTHENTICATION',
  
  // System purposes
  SYSTEM_HEALTH: 'SYSTEM_HEALTH',
});

/**
 * Role to Functional Scope mapping
 * Each role has exactly one functional scope
 */
export const ROLE_FUNCTIONAL_SCOPE = Object.freeze({
  CITIZEN: FunctionalScope.CONSENT,
  ENUMERATOR: FunctionalScope.SUBMISSION,
  SUPERVISOR: FunctionalScope.OVERSIGHT,
  STATE_ANALYST: FunctionalScope.ANALYSIS,
  CENTRAL_POLICY_VIEWER: FunctionalScope.POLICY_VIEW,
  // Legacy role mappings
  DATA_ENTRY: FunctionalScope.SUBMISSION,
  AUDITOR: FunctionalScope.OVERSIGHT,
  ANALYST: FunctionalScope.ANALYSIS,
});

/**
 * Functional Scope to Allowed Purposes mapping
 * Each functional scope permits specific purposes
 */
export const SCOPE_ALLOWED_PURPOSES = Object.freeze({
  [FunctionalScope.SUBMISSION]: [
    PurposeCategory.CENSUS_SUBMISSION,
    PurposeCategory.SUBMISSION_VERIFY,
    PurposeCategory.AUTHENTICATION,
  ],
  [FunctionalScope.OVERSIGHT]: [
    PurposeCategory.AUDIT_READ,
    PurposeCategory.METADATA_READ,
    PurposeCategory.AUTHENTICATION,
  ],
  [FunctionalScope.ANALYSIS]: [
    PurposeCategory.AGGREGATE_COMPUTE,
    PurposeCategory.AGGREGATE_READ,
    PurposeCategory.AUTHENTICATION,
  ],
  [FunctionalScope.POLICY_VIEW]: [
    PurposeCategory.POLICY_READ,
    PurposeCategory.AUTHENTICATION,
  ],
  [FunctionalScope.CONSENT]: [
    PurposeCategory.CONSENT_MANAGE,
    PurposeCategory.AUTHENTICATION,
  ],
});

/**
 * Role to Allowed Geographic Levels mapping
 * Defines which geographic levels each role can access
 */
export const ROLE_GEOGRAPHIC_LEVELS = Object.freeze({
  // Citizen: No geographic scope (own data only)
  CITIZEN: [],
  
  // Enumerator: Block and Village level
  ENUMERATOR: [GeographicLevel.BLOCK, GeographicLevel.VILLAGE],
  DATA_ENTRY: [GeographicLevel.BLOCK, GeographicLevel.VILLAGE],
  
  // Supervisor: All levels (for audit oversight)
  SUPERVISOR: [GeographicLevel.STATE, GeographicLevel.DISTRICT, GeographicLevel.BLOCK, GeographicLevel.VILLAGE],
  AUDITOR: [GeographicLevel.STATE, GeographicLevel.DISTRICT, GeographicLevel.BLOCK, GeographicLevel.VILLAGE],
  
  // StateAnalyst: State and District level
  STATE_ANALYST: [GeographicLevel.STATE, GeographicLevel.DISTRICT, GeographicLevel.BLOCK, GeographicLevel.VILLAGE],
  ANALYST: [GeographicLevel.STATE, GeographicLevel.DISTRICT, GeographicLevel.BLOCK, GeographicLevel.VILLAGE],
  
  // CentralPolicyViewer: National and State level only
  CENTRAL_POLICY_VIEWER: [GeographicLevel.NATIONAL, GeographicLevel.STATE],
});

/**
 * Forbidden scope patterns
 * These patterns are explicitly forbidden and will be rejected
 */
export const FORBIDDEN_SCOPE_PATTERNS = Object.freeze([
  '*',
  'ALL',
  'ANY',
  'WILDCARD',
  'GLOBAL',
  'UNIVERSAL',
]);

/**
 * Check if a scope pattern is forbidden
 */
export function isForbiddenScope(scope) {
  if (!scope || typeof scope !== 'string') {
    return false;
  }
  
  const normalizedScope = scope.toUpperCase().trim();
  return FORBIDDEN_SCOPE_PATTERNS.includes(normalizedScope);
}

/**
 * Validate geographic code format
 */
export function validateGeographicCode(level, code) {
  if (!level || !code) {
    return false;
  }
  
  // Check for forbidden patterns
  if (isForbiddenScope(code)) {
    return false;
  }
  
  switch (level) {
    case GeographicLevel.NATIONAL:
      return code === 'IN'; // Only India
    case GeographicLevel.STATE:
      return /^[A-Z]{2}$/.test(code); // 2-letter state code
    case GeographicLevel.DISTRICT:
      return /^[0-9]{4}$/.test(code); // 4-digit district code
    case GeographicLevel.BLOCK:
      return /^[0-9]{6}$/.test(code); // 6-digit block code
    case GeographicLevel.VILLAGE:
      return /^[0-9]{10}$/.test(code); // 10-digit village code
    default:
      return false;
  }
}

/**
 * Check if a geographic code is within scope
 * 
 * @param {object} actorScope - Actor's assigned scope
 * @param {string} requestedLevel - Requested geographic level
 * @param {string} requestedCode - Requested geographic code
 * @returns {boolean} - True if within scope
 */
export function isWithinGeographicScope(actorScope, requestedLevel, requestedCode) {
  if (!actorScope || !requestedLevel || !requestedCode) {
    return false;
  }
  
  // Check for forbidden patterns
  if (isForbiddenScope(requestedCode)) {
    return false;
  }
  
  // Actor must have the requested level in their allowed levels
  const actorLevelIndex = GEOGRAPHIC_HIERARCHY.indexOf(actorScope.level);
  const requestedLevelIndex = GEOGRAPHIC_HIERARCHY.indexOf(requestedLevel);
  
  // Cannot access higher level than assigned
  if (requestedLevelIndex < actorLevelIndex) {
    return false;
  }
  
  // Check if requested code is within actor's assigned codes
  // For hierarchical scopes, a state code covers all districts/blocks/villages within it
  if (actorScope.level === GeographicLevel.STATE) {
    // State-level scope: check if requested code starts with or is the state code
    if (requestedLevel === GeographicLevel.STATE) {
      return requestedCode === actorScope.code;
    }
    // For lower levels, we need to verify the hierarchy (would need lookup table)
    // For now, we require explicit assignment at each level
    return actorScope.codes?.includes(requestedCode) || false;
  }
  
  if (actorScope.level === GeographicLevel.DISTRICT) {
    if (requestedLevel === GeographicLevel.DISTRICT) {
      return requestedCode === actorScope.code;
    }
    return actorScope.codes?.includes(requestedCode) || false;
  }
  
  if (actorScope.level === GeographicLevel.BLOCK) {
    if (requestedLevel === GeographicLevel.BLOCK) {
      return requestedCode === actorScope.code;
    }
    if (requestedLevel === GeographicLevel.VILLAGE) {
      return actorScope.codes?.includes(requestedCode) || false;
    }
    return false;
  }
  
  if (actorScope.level === GeographicLevel.VILLAGE) {
    return requestedLevel === GeographicLevel.VILLAGE && requestedCode === actorScope.code;
  }
  
  if (actorScope.level === GeographicLevel.NATIONAL) {
    // National level can access all
    return true;
  }
  
  return false;
}

/**
 * Check if a purpose is allowed for a functional scope
 */
export function isPurposeAllowed(functionalScope, purpose) {
  if (!functionalScope || !purpose) {
    return false;
  }
  
  const allowedPurposes = SCOPE_ALLOWED_PURPOSES[functionalScope];
  if (!allowedPurposes) {
    return false;
  }
  
  return allowedPurposes.includes(purpose);
}

/**
 * Get functional scope for a role
 */
export function getFunctionalScopeForRole(role) {
  if (!role) {
    return null;
  }
  
  const normalizedRole = role.toUpperCase().trim();
  return ROLE_FUNCTIONAL_SCOPE[normalizedRole] || null;
}

/**
 * Get allowed geographic levels for a role
 */
export function getAllowedGeographicLevels(role) {
  if (!role) {
    return [];
  }
  
  const normalizedRole = role.toUpperCase().trim();
  return ROLE_GEOGRAPHIC_LEVELS[normalizedRole] || [];
}

