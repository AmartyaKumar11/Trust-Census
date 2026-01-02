/**
 * Consent Routes
 * 
 * RESPONSIBILITY: Consent management endpoints (L0 data layer)
 * 
 * Consent is a LEGAL ARTIFACT that:
 * - Must exist BEFORE any census submission can be accepted
 * - Is completely INDEPENDENT of census data (L1)
 * - Contains NO caste data, NO personal identifiers
 * - Is IMMUTABLE (append-only, no UPDATE/DELETE)
 * - Is linked to submissions ONLY via receipt_id (non-identifying)
 * 
 * MUST:
 * - Allow Citizen to provide consent
 * - Allow Enumerator to record consent on behalf of Citizen
 * - Return receipt_id for linking with submissions
 * - Log consent capture in audit (without consent content)
 * 
 * MUST NEVER:
 * - Accept caste data in consent records
 * - Accept personal identifiers (Aadhaar, phone, name, address)
 * - Allow UPDATE or DELETE of consent records
 * - Expose consent content in audit logs
 * - Allow reverse lookup from submission to personal identity
 */

import {
  ConsentTextVersion,
  ConsentGivenByRole,
  ConsentError,
  createConsent,
  verifyConsentExists,
  getConsentStatus,
  getConsentByReceiptId,
} from '../consent/index.js';
import { logAuditEvent, AuditActionCategory, AuditOutcome } from '../audit/logger.js';

export async function consentRoutes(fastify) {
  /**
   * POST /consent/capture
   * 
   * Capture consent (Citizen or Enumerator)
   * Returns receipt_id for use in submission
   * 
   * This endpoint does NOT store caste data or personal identifiers
   */
  fastify.post('/consent/capture', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('CITIZEN', 'DATA_ENTRY', 'ENUMERATOR')
    ],
    schema: {
      description: 'Capture consent for census data collection. Returns receipt_id for submission.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['consentTextVersion', 'stateCode'],
        properties: {
          // Consent text version (references immutable legal text)
          consentTextVersion: {
            type: 'string',
            enum: Object.values(ConsentTextVersion)
          },
          // Geographic scope at consent
          stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
          districtCode: { type: 'string', pattern: '^[0-9]{4}$' },
          blockCode: { type: 'string', pattern: '^[0-9]{6}$' },
          villageCode: { type: 'string', maxLength: 200 } // Free-text village/ward name
          // NOTE: NO caste data, NO personal identifiers
        }
      }
    }
  }, async (request, reply) => {
    const { consentTextVersion, stateCode, districtCode, blockCode, villageCode } = request.body;
    const userRole = request.user.role;

    // Determine who is giving consent
    const givenByRole = (userRole === 'CITIZEN')
      ? ConsentGivenByRole.CITIZEN
      : ConsentGivenByRole.ENUMERATOR;

    // Enumerator ID (if applicable)
    const enumeratorId = (givenByRole === ConsentGivenByRole.ENUMERATOR)
      ? request.user.id
      : null;

    try {
      // Create consent record
      const consent = await createConsent({
        textVersion: consentTextVersion,
        givenByRole,
        stateCode,
        districtCode,
        blockCode,
        villageCode,
        enumeratorId,
      });

      // Log audit event (does NOT log consent content)
      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: userRole,
        actorId: request.user.id,
        actionCategory: AuditActionCategory.CONSENT_OPERATION,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.ALLOWED,
        statusCode: 201,
        ipAddress: request.ip,
        metadata: {
          operation: 'CONSENT_CAPTURED',
          givenByRole,
          // NOTE: We log that consent occurred, NOT the consent content
          // Receipt ID is logged for audit trail
          receiptIdGenerated: true,
          geographicScope: {
            state: stateCode,
            district: districtCode,
            block: blockCode,
          }
        }
      });

      // Return receipt_id for use in submission
      return reply.code(201).send({
        receiptId: consent.receiptId,
        timestamp: consent.timestamp,
        message: 'Consent captured. Use receiptId when submitting census data.'
      });

    } catch (error) {
      console.error('Consent capture failed:', error);

      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: userRole,
        actorId: request.user.id,
        actionCategory: AuditActionCategory.CONSENT_OPERATION,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.ERROR,
        statusCode: 500,
        ipAddress: request.ip,
        metadata: {
          operation: 'CONSENT_CAPTURE_FAILED',
        }
      });

      return reply.code(500).send({
        error: 'Failed to capture consent',
        code: ConsentError.CONSENT_CREATION_FAILED
      });
    }
  });

  /**
   * GET /consent/verify/:receiptId
   * 
   * Verify consent exists (for submission flow)
   * Returns minimal information - no consent content
   */
  fastify.get('/consent/verify/:receiptId', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('CITIZEN', 'DATA_ENTRY', 'ENUMERATOR', 'AUDITOR', 'SUPERVISOR')
    ],
    schema: {
      description: 'Verify consent exists for a receipt ID',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          receiptId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const { receiptId } = request.params;

    const exists = await verifyConsentExists(receiptId);

    await logAuditEvent({
      timestamp: new Date().toISOString(),
      actorRole: request.user.role,
      actorId: request.user.id,
      actionCategory: AuditActionCategory.CONSENT_OPERATION,
      requestMethod: request.method,
      requestPath: request.url,
      outcome: exists ? AuditOutcome.ALLOWED : AuditOutcome.DENIED,
      statusCode: exists ? 200 : 404,
      ipAddress: request.ip,
      metadata: {
        operation: 'CONSENT_VERIFY',
        found: exists,
      }
    });

    if (!exists) {
      return reply.code(404).send({
        error: 'Consent not found',
        code: ConsentError.CONSENT_NOT_FOUND
      });
    }

    return reply.send({
      receiptId,
      exists: true,
      message: 'Consent verified'
    });
  });

  /**
   * GET /citizen/consent
   * 
   * Get consent status for Citizen (own consent only)
   * Returns status without exposing consent content
   */
  fastify.get('/citizen/consent', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('CITIZEN')
    ],
    schema: {
      description: 'Get own consent status (Citizen only)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['receiptId'],
        properties: {
          receiptId: { type: 'string', format: 'uuid' }
        }
      }
    }
  }, async (request, reply) => {
    const { receiptId } = request.query;

    const status = await getConsentStatus(receiptId);

    await logAuditEvent({
      timestamp: new Date().toISOString(),
      actorRole: request.user.role,
      actorId: request.user.id,
      actionCategory: AuditActionCategory.CONSENT_OPERATION,
      requestMethod: request.method,
      requestPath: request.url,
      outcome: status ? AuditOutcome.ALLOWED : AuditOutcome.DENIED,
      statusCode: status ? 200 : 404,
      ipAddress: request.ip,
      metadata: {
        operation: 'CONSENT_STATUS_VIEW',
      }
    });

    if (!status) {
      return reply.code(404).send({
        error: 'Consent not found',
        code: ConsentError.CONSENT_NOT_FOUND
      });
    }

    return reply.send(status);
  });

  /**
   * GET /consent/status
   * 
   * Get consent status aggregates (Supervisor only)
   * Returns aggregate counts, NOT individual records
   */
  fastify.get('/consent/status', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('AUDITOR', 'SUPERVISOR')
    ],
    schema: {
      description: 'Get consent status aggregates (Supervisor only)',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
          districtCode: { type: 'string', pattern: '^[0-9]{4}$' }
        }
      }
    }
  }, async (request, reply) => {
    const { stateCode, districtCode } = request.query;

    // Import getDB here to avoid circular dependency
    const { getDB } = await import('../db/connection.js');
    const db = getDB();

    try {
      // Build query with optional filters
      let query = `
        SELECT 
          state_code,
          district_code,
          total_consents,
          citizen_consents,
          enumerator_recorded_consents,
          earliest_consent,
          latest_consent
        FROM consent_status_aggregates
        WHERE 1=1
      `;
      const params = [];

      if (stateCode) {
        params.push(stateCode);
        query += ` AND state_code = $${params.length}`;
      }

      if (districtCode) {
        params.push(districtCode);
        query += ` AND district_code = $${params.length}`;
      }

      const result = await db.query(query, params);

      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: request.user.role,
        actorId: request.user.id,
        actionCategory: AuditActionCategory.CONSENT_OPERATION,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.ALLOWED,
        statusCode: 200,
        ipAddress: request.ip,
        metadata: {
          operation: 'CONSENT_STATUS_AGGREGATES',
          filters: { stateCode, districtCode },
        }
      });

      return reply.send({
        aggregates: result.rows,
        count: result.rows.length
      });

    } catch (error) {
      console.error('Failed to get consent aggregates:', error);
      return reply.code(500).send({ error: 'Failed to retrieve consent status' });
    }
  });

  /**
   * POST /citizen/consent
   * 
   * Citizen provides consent (direct consent)
   * Alias for /consent/capture with CITIZEN role
   */
  fastify.post('/citizen/consent', {
    preHandler: [
      fastify.authenticate,
      fastify.requireRole('CITIZEN')
    ],
    schema: {
      description: 'Citizen provides consent for data collection',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['consentTextVersion', 'stateCode'],
        properties: {
          consentTextVersion: {
            type: 'string',
            enum: Object.values(ConsentTextVersion)
          },
          stateCode: { type: 'string', pattern: '^[A-Z]{2}$' },
          districtCode: { type: 'string', pattern: '^[0-9]{4}$' },
          blockCode: { type: 'string', pattern: '^[0-9]{6}$' },
          villageCode: { type: 'string', maxLength: 200 } // Free-text village/ward name
        }
      }
    }
  }, async (request, reply) => {
    const { consentTextVersion, stateCode, districtCode, blockCode, villageCode } = request.body;

    try {
      const consent = await createConsent({
        textVersion: consentTextVersion,
        givenByRole: ConsentGivenByRole.CITIZEN,
        stateCode,
        districtCode,
        blockCode,
        villageCode,
        enumeratorId: null,
      });

      await logAuditEvent({
        timestamp: new Date().toISOString(),
        actorRole: request.user.role,
        actorId: request.user.id,
        actionCategory: AuditActionCategory.CONSENT_OPERATION,
        requestMethod: request.method,
        requestPath: request.url,
        outcome: AuditOutcome.ALLOWED,
        statusCode: 201,
        ipAddress: request.ip,
        metadata: {
          operation: 'CITIZEN_CONSENT_PROVIDED',
          receiptIdGenerated: true,
        }
      });

      return reply.code(201).send({
        receiptId: consent.receiptId,
        timestamp: consent.timestamp,
        status: 'GRANTED',
        message: 'Consent provided successfully'
      });

    } catch (error) {
      console.error('Citizen consent failed:', error);
      return reply.code(500).send({
        error: 'Failed to provide consent',
        code: ConsentError.CONSENT_CREATION_FAILED
      });
    }
  });
}

