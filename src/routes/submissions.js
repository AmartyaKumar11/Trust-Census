import { getDB } from '../db/connection.js';
import { validate, censusSubmissionSchema } from '../middleware/validation.js';
import { logAuditEvent, AuditActionCategory, AuditOutcome } from '../audit/logger.js';
import { generateHash, validateNoPersonalData } from '../utils/security.js';
import {
  ConsentError,
  verifyConsentExists,
} from '../consent/index.js';

/**
 * Census Submission Routes
 * 
 * RESPONSIBILITY: WRITE-ONLY data submission endpoints (DATA_ENTRY role)
 * 
 * L1 (Raw Census Submissions) is an IRREVERSIBLE DATA SINK:
 * - Data can ONLY be written (POST)
 * - Data can NEVER be read back via API
 * - Data can NEVER be updated or deleted
 * - Only a receipt_id is returned after submission
 * 
 * MUST:
 * - Accept census data submissions WITH CONSENT
 * - Require consent BEFORE submission (atomic linkage)
 * - Return ONLY receipt_id and timestamp (NO census data)
 * - Validate no personal identifiers
 * - Generate integrity hashes (stored, not returned)
 * - Require DATA_ENTRY role
 * - Log submission attempt (without raw content)
 * 
 * MUST NEVER:
 * - Accept submissions WITHOUT consent
 * - Return raw census data after submission
 * - Allow data retrieval in any form
 * - Allow data listing, searching, or filtering
 * - Allow data updates or deletions
 * - Echo back census data in responses
 * - Log raw submission content
 * - Accept personal identifiers
 * - Export or download submissions
 */

/**
 * Generic error responses (no data leakage)
 */
const SUBMISSION_ERRORS = Object.freeze({
  CONSENT_REQUIRED: { error: 'Consent is required before submission', code: 'CONSENT_REQUIRED' },
  VALIDATION_FAILED: { error: 'Submission validation failed', code: 'VALIDATION_FAILED' },
  SUBMISSION_FAILED: { error: 'Submission failed', code: 'SUBMISSION_FAILED' },
});

export async function submissionRoutes(fastify) {
  /**
   * POST /submissions
   * 
   * Submit census data (WRITE-ONLY)
   * 
   * This is the ONLY endpoint that writes to L1.
   * Returns ONLY a receipt_id - NO census data is echoed back.
   * Submission content is NEVER returned via any API.
   * 
   * Requires:
   * - Valid authentication (DATA_ENTRY role)
   * - Valid consent receipt_id
   * - Valid census data (no personal identifiers)
   * 
   * Returns:
   * - receipt_id (submission ID for reference)
   * - timestamp (server-generated)
   * - consentReceiptId (proves consent existed)
   * 
   * Does NOT return:
   * - Census data (caste, household, population)
   * - Geographic codes
   * - Submission hash
   */
  fastify.post('/submissions', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('DATA_ENTRY'),
      validate(censusSubmissionSchema)
    ],
    schema: {
      description: 'Submit census data (WRITE-ONLY, irreversible). Returns only receipt_id.',
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
          consentReceiptId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        201: {
          description: 'Submission accepted (receipt only, no data echo)',
          type: 'object',
          properties: {
            receiptId: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            consentReceiptId: { type: 'string', format: 'uuid' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const submission = request.body;
    const { consentReceiptId } = submission;

    // STEP 1: Verify consent exists BEFORE any processing
    // This is a HARD REQUIREMENT - no consent = no submission
    const consentExists = await verifyConsentExists(consentReceiptId);
    if (!consentExists) {
      // Log attempt without raw content
      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: request.user.role,
        actorId: request.user.id,
        actionCategory: AuditActionCategory.SUBMISSION,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.DENIED,
        statusCode: 400,
        ipAddress: request.ip,
        metadata: {
          reason: 'CONSENT_NOT_FOUND',
          // NOTE: Do NOT log census data
        }
      });

      return reply.code(400).send(SUBMISSION_ERRORS.CONSENT_REQUIRED);
    }

    // STEP 2: Validate no personal data is present
    try {
      validateNoPersonalData(submission);
    } catch (error) {
      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: request.user.role,
        actorId: request.user.id,
        actionCategory: AuditActionCategory.VALIDATION_FAILURE,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.DENIED,
        statusCode: 400,
        ipAddress: request.ip,
        metadata: {
          reason: 'PERSONAL_DATA_DETECTED',
          // NOTE: Do NOT log the actual data
        }
      });

      return reply.code(400).send(SUBMISSION_ERRORS.VALIDATION_FAILED);
    }

    // STEP 3: Generate submission hash for integrity (stored, not returned)
    const timestamp = new Date().toISOString();
    const submissionHash = generateHash({
      stateCode: submission.stateCode,
      districtCode: submission.districtCode,
      blockCode: submission.blockCode,
      villageCode: submission.villageCode,
      householdCount: submission.householdCount,
      populationCount: submission.populationCount,
      casteCategory: submission.casteCategory,
      submittedBy: request.user.id,
      timestamp: timestamp
    });

    // STEP 4: Atomic write - submission + consent link in single transaction
    const client = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Insert submission (WRITE-ONLY, irreversible)
      const result = await client.query(
        `INSERT INTO census_submissions (
          state_code, district_code, block_code, village_code,
          household_count, population_count, caste_category,
          submitted_by, submission_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, submitted_at`,
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

      // Link submission to consent (atomic)
      await client.query(
        `INSERT INTO submission_consent_links (
          submission_id,
          consent_receipt_id
        ) VALUES ($1, $2)`,
        [created.id, consentReceiptId]
      );

      await client.query('COMMIT');

      // Log success (WITHOUT raw content)
      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: request.user.role,
        actorId: request.user.id,
        actionCategory: AuditActionCategory.SUBMISSION,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.ALLOWED,
        statusCode: 201,
        ipAddress: request.ip,
        metadata: {
          submissionRecorded: true,
          consentVerified: true,
          // NOTE: Do NOT log census data (caste, household, population)
          // NOTE: Do NOT log geographic codes
        }
      });

      // Return ONLY receipt_id and timestamp
      // NO census data is echoed back
      // NO submission hash is returned
      // NO geographic codes are returned
      return reply.code(201).send({
        receiptId: created.id,
        timestamp: created.submitted_at,
        consentReceiptId: consentReceiptId,
        message: 'Submission recorded. Data is write-only and cannot be retrieved.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Submission transaction failed:', error.message);
      
      // Log failure (WITHOUT raw content)
      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: request.user.role,
        actorId: request.user.id,
        actionCategory: AuditActionCategory.SUBMISSION,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.ERROR,
        statusCode: 500,
        ipAddress: request.ip,
        metadata: {
          reason: 'TRANSACTION_FAILED',
          // NOTE: Do NOT log error details that might contain data
        }
      });

      return reply.code(500).send(SUBMISSION_ERRORS.SUBMISSION_FAILED);
    } finally {
      client.release();
    }
  });

  /**
   * EXPLICITLY FORBIDDEN ENDPOINTS
   * 
   * The following endpoints are STRUCTURALLY FORBIDDEN and will NEVER be implemented:
   * 
   * - GET /submissions - Bulk retrieval of raw submissions
   * - GET /submissions/:id - Individual raw submission retrieval
   * - PUT /submissions/:id - Update raw submission
   * - PATCH /submissions/:id - Partial update raw submission
   * - DELETE /submissions/:id - Delete raw submission
   * - GET /submissions/:id/verify - Verify by reading stored data (REMOVED)
   * - GET /submissions/history - Submission history with data
   * - GET /submissions/export - Export submissions
   * - GET /submissions/download - Download submissions
   * - GET /submissions/search - Search submissions
   * - GET /submissions/filter - Filter submissions
   * 
   * These endpoints violate the L1 write-only invariant and will NEVER exist.
   * Any attempt to access these paths will result in 404 (not found).
   * 
   * The ONLY way to verify a submission is via the receipt_id returned at creation.
   * The receipt_id proves the submission was accepted but does NOT allow data retrieval.
   */

  /**
   * GET /submissions/receipt/:receiptId
   * 
   * Verify a submission receipt exists (NO DATA ACCESS)
   * 
   * This endpoint ONLY confirms that a submission with the given receipt_id exists.
   * It does NOT return any census data, geographic codes, or submission content.
   * 
   * Returns:
   * - exists: boolean
   * - timestamp: when the submission was recorded
   * - consentLinked: whether consent is linked
   * 
   * Does NOT return:
   * - Any census data
   * - Geographic codes
   * - Submission hash
   * - Caste category
   * - Household/population counts
   */
  fastify.get('/submissions/receipt/:receiptId', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('DATA_ENTRY', 'AUDITOR', 'SUPERVISOR')
    ],
    schema: {
      description: 'Verify submission receipt exists (NO data access)',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          receiptId: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: {
          description: 'Receipt verification (no data)',
          type: 'object',
          properties: {
            exists: { type: 'boolean' },
            timestamp: { type: 'string', format: 'date-time' },
            consentLinked: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const { receiptId } = request.params;

    // Check if submission exists (NO DATA RETRIEVAL)
    const result = await db.query(
      `SELECT 
        cs.submitted_at,
        EXISTS (
          SELECT 1 FROM submission_consent_links scl 
          WHERE scl.submission_id = cs.id
        ) as consent_linked
      FROM census_submissions cs
      WHERE cs.id = $1`,
      [receiptId]
    );

    // Log the verification attempt
    await logAuditEvent({
      timestamp: new Date().toISOString(),
      actorRole: request.user.role,
      actorId: request.user.id,
      actionCategory: AuditActionCategory.SUBMISSION_VERIFY,
      requestMethod: request.method,
      requestPath: request.url,
      outcome: result.rows.length > 0 ? AuditOutcome.ALLOWED : AuditOutcome.DENIED,
      statusCode: result.rows.length > 0 ? 200 : 404,
      ipAddress: request.ip,
      metadata: {
        receiptVerified: result.rows.length > 0,
        // NOTE: Do NOT log the receipt_id (could be used for enumeration)
      }
    });

    if (result.rows.length === 0) {
      return reply.code(404).send({ 
        exists: false,
        message: 'Receipt not found'
      });
    }

    const record = result.rows[0];

    // Return ONLY existence confirmation
    // NO census data, NO geographic codes, NO submission content
    return reply.send({
      exists: true,
      timestamp: record.submitted_at,
      consentLinked: record.consent_linked
    });
  });

  /**
   * GET /submissions/metadata
   * 
   * Get submission metadata for Supervisor oversight (NO RAW DATA)
   * 
   * This endpoint provides aggregate counts and statistics.
   * It does NOT return individual submission records or raw data.
   */
  fastify.get('/submissions/metadata', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('AUDITOR', 'SUPERVISOR')
    ],
    schema: {
      description: 'Get submission metadata (aggregate counts, no raw data)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
          districtCode: { type: 'string', pattern: '^[0-9]{4}$' }
        }
      },
      response: {
        200: {
          description: 'Submission metadata (aggregate counts)',
          type: 'object',
          properties: {
            totalSubmissions: { type: 'integer' },
            submissionsWithConsent: { type: 'integer' },
            earliestSubmission: { type: 'string', format: 'date-time' },
            latestSubmission: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const db = getDB();
    const { stateCode, districtCode } = request.query;

    // Build query for aggregate counts (NO individual records)
    let query = `
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(scl.id) as submissions_with_consent,
        MIN(cs.submitted_at) as earliest_submission,
        MAX(cs.submitted_at) as latest_submission
      FROM census_submissions cs
      LEFT JOIN submission_consent_links scl ON cs.id = scl.submission_id
      WHERE 1=1
    `;
    const params = [];

    if (stateCode) {
      params.push(stateCode);
      query += ` AND cs.state_code = $${params.length}`;
    }

    if (districtCode) {
      params.push(districtCode);
      query += ` AND cs.district_code = $${params.length}`;
    }

    const result = await db.query(query, params);

    // Log the metadata access
    await logAuditEvent({
      timestamp: new Date().toISOString(),
      actorRole: request.user.role,
      actorId: request.user.id,
      actionCategory: AuditActionCategory.SUBMISSION_VERIFY,
      requestMethod: request.method,
      requestPath: request.url,
      outcome: AuditOutcome.ALLOWED,
      statusCode: 200,
      ipAddress: request.ip,
      metadata: {
        operation: 'METADATA_READ',
        filters: { stateCode, districtCode },
      }
    });

    const stats = result.rows[0];

    // Return ONLY aggregate counts
    // NO individual records, NO raw data
    return reply.send({
      totalSubmissions: parseInt(stats.total_submissions),
      submissionsWithConsent: parseInt(stats.submissions_with_consent),
      earliestSubmission: stats.earliest_submission,
      latestSubmission: stats.latest_submission
    });
  });
}
