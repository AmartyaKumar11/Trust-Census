import { getDB } from '../db/connection.js';
import { validate, censusSubmissionSchema } from '../middleware/validation.js';
import { logAuditEvent } from '../middleware/audit.js';
import { generateHash, validateNoPersonalData } from '../utils/security.js';

/**
 * Census Submission Routes
 * One-way data flow: data can be submitted but never retrieved in raw form
 * NO raw data access after submission
 */

export async function submissionRoutes(fastify) {
  // Submit census data
  // DATA_ENTRY role only
  fastify.post('/submissions', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('DATA_ENTRY'),
      validate(censusSubmissionSchema)
    ],
    schema: {
      description: 'Submit census data (one-way, no retrieval)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['stateCode', 'districtCode', 'blockCode', 'householdCount', 'populationCount', 'casteCategory'],
        properties: {
          stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
          districtCode: { type: 'string', pattern: '^[0-9]{4}$' },
          blockCode: { type: 'string', pattern: '^[0-9]{6}$' },
          villageCode: { type: 'string', pattern: '^[0-9]{10}$' },
          householdCount: { type: 'integer', minimum: 0 },
          populationCount: { type: 'integer', minimum: 0 },
          casteCategory: { 
            type: 'string',
            enum: ['SC', 'ST', 'OBC', 'GENERAL', 'OTHER']
          }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const submission = request.body;

    // Validate no personal data is present
    try {
      validateNoPersonalData(submission);
    } catch (error) {
      await logAuditEvent(fastify, {
        userId: request.user.id,
        actionType: 'SUBMISSION_REJECTED',
        resourceType: 'submission',
        resourceId: null,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        requestMethod: request.method,
        requestPath: request.url,
        statusCode: 400,
        metadata: { reason: error.message }
      });

      return reply.code(400).send({ error: error.message });
    }

    // Generate submission hash for integrity verification
    const submissionHash = generateHash({
      ...submission,
      submittedBy: request.user.id,
      timestamp: new Date().toISOString()
    });

    // Insert submission (one-way storage)
    const result = await db.query(
      `INSERT INTO census_submissions (
        state_code, district_code, block_code, village_code,
        household_count, population_count, caste_category,
        submitted_by, submission_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, submitted_at, submission_hash`,
      [
        submission.stateCode,
        submission.districtCode,
        submission.blockCode,
        submission.villageCode || null,
        submission.householdCount,
        submission.populationCount,
        submission.casteCategory,
        request.user.id,
        submissionHash
      ]
    );

    const created = result.rows[0];

    // Log audit event
    await logAuditEvent(fastify, {
      userId: request.user.id,
      actionType: 'SUBMISSION_CREATED',
      resourceType: 'submission',
      resourceId: created.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestMethod: request.method,
      requestPath: request.url,
      statusCode: 201,
      metadata: {
        geographicLevel: submission.villageCode ? 'village' : 'block',
        casteCategory: submission.casteCategory
      }
    });

    // Return only submission ID and hash (NO raw data)
    return reply.code(201).send({
      id: created.id,
      submittedAt: created.submitted_at,
      submissionHash: created.submission_hash,
      message: 'Submission recorded. Raw data is not accessible after submission.'
    });
  });

  // Verify submission integrity (hash only, no data)
  fastify.get('/submissions/:id/verify', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('DATA_ENTRY', 'AUDITOR')
    ],
    schema: {
      description: 'Verify submission integrity (hash only, no data access)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const { id } = request.params;

    // Only return hash and metadata, NO raw data
    const result = await db.query(
      `SELECT 
        id, 
        submitted_at, 
        submission_hash, 
        is_verified,
        state_code,
        district_code,
        block_code
      FROM census_submissions 
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Submission not found' });
    }

    const submission = result.rows[0];

    // Log audit event
    await logAuditEvent(fastify, {
      userId: request.user.id,
      actionType: 'SUBMISSION_VERIFIED',
      resourceType: 'submission',
      resourceId: id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      requestMethod: request.method,
      requestPath: request.url,
      statusCode: 200,
      metadata: {}
    });

    // Return only hash and metadata, NO raw census data
    return reply.send({
      id: submission.id,
      submittedAt: submission.submitted_at,
      submissionHash: submission.submission_hash,
      isVerified: submission.is_verified,
      geographicCodes: {
        stateCode: submission.state_code,
        districtCode: submission.district_code,
        blockCode: submission.block_code
      }
    });
  });
}

