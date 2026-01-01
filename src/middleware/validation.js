import { z } from 'zod';

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
 * - Prevent super-admin role creation
 * 
 * MUST NEVER:
 * - Accept personal identifiers in any form
 * - Allow inferred or predicted caste classification
 * - Bypass validation for any input
 * - Accept super-admin role
 * - Allow data that violates trust-first principles
 */

// Geographic code validation (no personal identifiers)
const geographicCodeSchema = z.object({
  stateCode: z.string().length(2).regex(/^[A-Z]{2}$/),
  districtCode: z.string().length(4).regex(/^[0-9]{4}$/),
  blockCode: z.string().length(6).regex(/^[0-9]{6}$/),
  villageCode: z.string().length(10).regex(/^[0-9]{10}$/).optional(),
});

// Census submission schema
// Explicitly prohibits personal identifiers
export const censusSubmissionSchema = z.object({
  // Geographic identifiers only
  stateCode: z.string().length(2).regex(/^[A-Z]{2}$/),
  districtCode: z.string().length(4).regex(/^[0-9]{4}$/),
  blockCode: z.string().length(6).regex(/^[0-9]{6}$/),
  villageCode: z.string().length(10).regex(/^[0-9]{10}$/).optional(),
  
  // Census data
  householdCount: z.number().int().min(0).max(1000000),
  populationCount: z.number().int().min(0).max(10000000),
  
  // Caste category - explicit only, no inference
  casteCategory: z.enum([
    'SC', 'ST', 'OBC', 'GENERAL', 'OTHER'
  ]),
}).refine((data) => {
  // Additional validation: population should be >= household count
  return data.populationCount >= data.householdCount;
}, {
  message: 'Population count must be greater than or equal to household count'
});

// Aggregate computation schema
export const aggregateComputationSchema = z.object({
  geographicLevel: z.enum(['state', 'district', 'block', 'village']),
  geographicCode: z.string().min(2).max(10),
  casteCategory: z.enum([
    'SC', 'ST', 'OBC', 'GENERAL', 'OTHER', 'ALL'
  ]).optional(),
});

// User creation schema (no super-admin)
export const userCreationSchema = z.object({
  username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(12).max(128),
  role: z.enum(['DATA_ENTRY', 'AUDITOR', 'ANALYST']),
}).refine((data) => {
  // Explicitly prevent super-admin
  return data.role !== 'SUPER_ADMIN';
}, {
  message: 'Super-admin role is not permitted'
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
        return reply.code(400).send({
          error: 'Validation failed',
          details: error.errors
        });
      }
      throw error;
    }
  };
}

