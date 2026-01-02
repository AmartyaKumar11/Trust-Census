import { z } from 'zod';
import { 
  SystemRoles, 
  VALID_ROLES, 
  isForbiddenRole,
  LEGACY_ROLE_MAPPING
} from '../rbac/roles.js';

/**
 * Validation Middleware
 * 
 * RESPONSIBILITY: Input validation schemas and validation middleware
 * 
 * MUST:
 * - Validate all inputs using Zod schemas
 * - Reject personal identifiers (Aadhaar, phone, biometrics, etc.)
 * - Enforce explicit caste categories only (no inference)
 * - Validate geographic codes format
 * - Prevent forbidden role creation (super-admin, etc.)
 * - Only accept the 5 valid system roles
 * 
 * MUST NEVER:
 * - Accept personal identifiers in any form
 * - Allow inferred or predicted caste classification
 * - Bypass validation for any input
 * - Accept forbidden roles (super-admin, etc.)
 * - Allow data that violates trust-first principles
 */

// Geographic code validation (no personal identifiers)
const geographicCodeSchema = z.object({
  stateCode: z.string().length(2).regex(/^[A-Z]{2}$/),
  districtCode: z.string().length(4).regex(/^[0-9]{4}$/),
  blockCode: z.string().length(6).regex(/^[0-9]{6}$/),
  villageCode: z.string().max(200).optional(), // Free-text village/ward name for reference
});

// Census submission schema
// Explicitly prohibits personal identifiers
export const censusSubmissionSchema = z.object({
  // Geographic identifiers only
  stateCode: z.string().length(2).regex(/^[A-Z]{2}$/),
  districtCode: z.string().length(4).regex(/^[0-9]{4}$/),
  blockCode: z.string().length(6).regex(/^[0-9]{6}$/),
  villageCode: z.string().max(200).optional(), // Free-text village/ward name for reference
  
  // Census data
  householdCount: z.number().int().min(0).max(1000000),
  populationCount: z.number().int().min(0).max(10000000),
  
  // Caste category - explicit only, no inference
  casteCategory: z.enum([
    'SC', 'ST', 'OBC', 'GENERAL', 'OTHER'
  ]),
  
  // Consent receipt ID - required for all submissions
  consentReceiptId: z.string().uuid(),
}).refine((data) => {
  // Additional validation: population should be >= household count
  return data.populationCount >= data.householdCount;
}, {
  message: 'Population count must be greater than or equal to household count'
});

/**
 * Aggregate computation schema
 * 
 * NOTE: HTTP-triggered aggregation is FORBIDDEN.
 * This schema is retained for future offline worker validation only.
 * The HTTP routes that would use this schema return 403 Forbidden.
 * 
 * Aggregation will be implemented as offline batch jobs that:
 * - Run on a separate worker service
 * - Use the aggregation_worker database role
 * - Store results in L2/L3 tables
 * 
 * @deprecated for HTTP use - aggregation via HTTP is forbidden
 */
export const aggregateComputationSchema = z.object({
  geographicLevel: z.enum(['state', 'district', 'block', 'village']),
  geographicCode: z.string().min(2).max(10),
  casteCategory: z.enum([
    'SC', 'ST', 'OBC', 'GENERAL', 'OTHER', 'ALL'
  ]).optional(),
});

/**
 * Valid roles for user creation
 * Includes both new role names and legacy role names for backward compatibility
 */
const validRolesForCreation = [
  // New role names
  SystemRoles.CITIZEN,
  SystemRoles.ENUMERATOR,
  SystemRoles.SUPERVISOR,
  SystemRoles.STATE_ANALYST,
  SystemRoles.CENTRAL_POLICY_VIEWER,
  // Legacy role names (for backward compatibility)
  'DATA_ENTRY',
  'AUDITOR',
  'ANALYST',
];

// User creation schema (strict role validation)
export const userCreationSchema = z.object({
  username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(12).max(128),
  role: z.string().refine((role) => {
    // Check if role is forbidden
    if (isForbiddenRole(role)) {
      return false;
    }
    // Check if role is in the valid list
    return validRolesForCreation.includes(role.toUpperCase());
  }, {
    message: `Invalid role. Valid roles are: ${VALID_ROLES.join(', ')}`
  }),
}).refine((data) => {
  // Explicitly prevent any forbidden role patterns
  const role = data.role.toUpperCase();
  return !isForbiddenRole(role);
}, {
  message: 'This role is not permitted in the system'
});

/**
 * Validation middleware factory
 */
export function validate(schema) {
  return async (request, reply) => {
    try {
      // Validate request body
      if (request.body) {
        request.body = schema.parse(request.body);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Generic error response - do not leak validation details
        return reply.code(400).send({
          error: 'Validation failed',
          // Only include field names, not detailed messages
          fields: error.errors.map(e => e.path.join('.'))
        });
      }
      throw error;
    }
  };
}

/**
 * Role validation function
 * Returns true if role is valid, false otherwise
 */
export function isValidRoleForCreation(role) {
  if (!role || typeof role !== 'string') {
    return false;
  }
  
  const normalizedRole = role.toUpperCase().trim();
  
  // Check if forbidden
  if (isForbiddenRole(normalizedRole)) {
    return false;
  }
  
  // Check if in valid list
  return validRolesForCreation.includes(normalizedRole);
}
