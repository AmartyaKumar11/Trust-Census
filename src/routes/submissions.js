import { getDB } from '../db/connection.js';
import { validate, censusSubmissionSchema } from '../middleware/validation.js';
import { logAuditEvent } from '../audit/logger.js';
import { generateHash, validateNoPersonalData } from '../utils/security.js';
import {
  ConsentTextVersion,
  ConsentGivenByRole,
  ConsentError,
  createConsent,
  verifyConsentExists,
  linkSubmissionToConsent,
} from '../consent/index.js';

/**
 * Census Submission Routes
 * 
 * RESPONSIBILITY: One-way data submission endpoints (DATA_ENTRY role)
 * 
 * MUST:
 * - Accept census data submissions WITH CONSENT
 * - Require consent BEFORE or atomically WITH submission
 * - Store data with one-way encryption/anonymization
 * - Return only submission ID and hash (NO raw data)
 * - Validate no personal identifiers
 * - Generate integrity hashes
 * - Require DATA_ENTRY role
 * 
 * MUST NEVER:
 * - Accept submissions WITHOUT consent
 * - Return raw census data after submission
 * - Allow data retrieval in raw form
 * - Accept personal identifiers
 * - Allow other roles to submit data
 * - Export or download submissions
 * - Store caste data in consent records
 */

export async function submissionRoutes(fastify) {
  // Submit census data WITH CONSENT
  // DATA_ENTRY role only
  // Consent is REQUIRED - submission fails if consent fails
  fastify.post('/submissions', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('DATA_ENTRY'),
      validate(censusSubmissionSchema)
    ],
    schema: {
      description: 'Submit census data with consent (one-way, no retrieval). Consent is REQUIRED.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['stateCode', 'districtCode', 'blockCode', 'householdCount', 'populationCount', 'casteCategory', 'consentReceiptId'],
        properties: {
          // Geographic identifiers
          stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
          districtCode: { type: 'string', pattern: '^[0-9]{4}$' },
          blockCode: { type: 'string', pattern: '^[0-9]{6}$' },
          villageCode: { type: 'string', pattern: '^[0-9]{10}$' },
          // Census data
          householdCount: { type: 'integer', minimum: 0 },
          populationCount: { type: 'integer', minimum: 0 },
          casteCategory: { 
            type: 'string',
            enum: ['SC', 'ST', 'OBC', 'GENERAL', 'OTHER']
          },
          // CONSENT: Required receipt ID from prior consent capture
          // This links submission to consent WITHOUT storing caste data in consent
          consentReceiptId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const submission = request.body;
    const { consentReceiptId } = submission;

    // CONSENT CHECK: Verify consent exists BEFORE processing submission
    // This is a HARD REQUIREMENT - no consent = no submission
    const consentExists = await verifyConsentExists(consentReceiptId);
    if (!consentExists) {
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
        metadata: { reason: 'CONSENT_REQUIRED' }
      });

      return reply.code(400).send({ 
        error: 'Consent is required before submission',
        code: ConsentError.CONSENT_REQUIRED
      });
    }

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
      stateCode: submission.stateCode,
      districtCode: submission.districtCode,
      blockCode: submission.blockCode,
      villageCode: submission.villageCode,
      householdCount: submission.householdCount,
      populationCount: submission.populationCount,
      casteCategory: submission.casteCategory,
      submittedBy: request.user.id,
      timestamp: new Date().toISOString()
    });

    // Use transaction to ensure atomicity of submission + consent link
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Insert submission (one-way storage)
      const result = await client.query(
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

      // Link submission to consent (via receipt_id only)
      // This creates the ONLY link between submission and consent
      // NO caste data is stored in consent, NO personal identity is linked
      await client.query(
        `INSERT INTO submission_consent_links (
          submission_id,
          consent_receipt_id
        ) VALUES ($1, $2)`,
        [created.id, consentReceiptId]
      );

      await client.query('COMMIT');

      // Log audit event (does NOT log consent content)
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
          // NOTE: casteCategory is logged for audit, but NOT in consent
          casteCategory: submission.casteCategory,
          // Consent receipt is logged to prove consent existed
          consentVerified: true
        }
      });

      // Return only submission ID and hash (NO raw data)
      return reply.code(201).send({
        id: created.id,
        submittedAt: created.submitted_at,
        submissionHash: created.submission_hash,
        consentReceiptId: consentReceiptId,
        message: 'Submission recorded with consent. Raw data is not accessible after submission.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Submission failed:', error);
      
      await logAuditEvent(fastify, {
        userId: request.user.id,
        actionType: 'SUBMISSION_FAILED',
        resourceType: 'submission',
        resourceId: null,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        requestMethod: request.method,
        requestPath: request.url,
        statusCode: 500,
        metadata: { reason: 'TRANSACTION_FAILED' }
      });

      return reply.code(500).send({ error: 'Submission failed' });
    } finally {
      client.release();
    }
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

