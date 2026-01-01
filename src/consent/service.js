/**
 * Consent Service
 * 
 * RESPONSIBILITY: Manage consent as a first-class, immutable legal artifact
 * 
 * Consent is a LEGAL ARTIFACT that:
 * - Must exist BEFORE any census submission can be accepted
 * - Is completely INDEPENDENT of census data (L1)
 * - Contains NO caste data, NO personal identifiers
 * - Is IMMUTABLE (append-only, no UPDATE/DELETE)
 * - Is linked to submissions ONLY via receipt_id (non-identifying)
 * 
 * MUST:
 * - Create immutable consent records
 * - Verify consent exists before submission
 * - Link submissions to consent via receipt_id only
 * - Generate consent hashes for integrity
 * 
 * MUST NEVER:
 * - Store caste data in consent records
 * - Store personal identifiers (Aadhaar, phone, name, address)
 * - Allow UPDATE or DELETE of consent records
 * - Expose consent content in audit logs
 * - Allow reverse lookup from submission to personal identity
 */

import { getDB } from '../db/connection.js';
import crypto from 'crypto';

/**
 * Consent text versions (must match database enum)
 */
export const ConsentTextVersion = Object.freeze({
  V1_2024_INITIAL: 'V1_2024_INITIAL',
  V2_2024_REVISED: 'V2_2024_REVISED',
});

/**
 * Consent given by role (must match database enum)
 */
export const ConsentGivenByRole = Object.freeze({
  CITIZEN: 'CITIZEN',
  ENUMERATOR: 'ENUMERATOR',
});

/**
 * Consent error types
 */
export const ConsentError = Object.freeze({
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  CONSENT_NOT_FOUND: 'CONSENT_NOT_FOUND',
  CONSENT_INVALID: 'CONSENT_INVALID',
  CONSENT_CREATION_FAILED: 'CONSENT_CREATION_FAILED',
  CONSENT_LINK_FAILED: 'CONSENT_LINK_FAILED',
});

/**
 * Generate consent hash for integrity verification
 * 
 * @param {object} consentData - Consent data to hash
 * @returns {string} - SHA-256 hash
 */
export function generateConsentHash(consentData) {
  const hashInput = JSON.stringify({
    textVersion: consentData.textVersion,
    givenByRole: consentData.givenByRole,
    geographicScope: {
      state: consentData.stateCode,
      district: consentData.districtCode,
      block: consentData.blockCode,
      village: consentData.villageCode,
    },
    timestamp: consentData.timestamp || new Date().toISOString(),
  });
  
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Create a consent record
 * 
 * @param {object} params - Consent parameters
 * @param {string} params.textVersion - Consent text version
 * @param {string} params.givenByRole - Who gave consent (CITIZEN or ENUMERATOR)
 * @param {string} params.stateCode - State code
 * @param {string} params.districtCode - District code (optional)
 * @param {string} params.blockCode - Block code (optional)
 * @param {string} params.villageCode - Village code (optional)
 * @param {string} params.enumeratorId - Enumerator user ID (required if givenByRole is ENUMERATOR)
 * @returns {Promise<{receiptId: string, consentId: string, timestamp: string}>}
 */
export async function createConsent({
  textVersion,
  givenByRole,
  stateCode,
  districtCode,
  blockCode,
  villageCode,
  enumeratorId,
}) {
  const db = getDB();
  
  // Validate required fields
  if (!textVersion || !ConsentTextVersion[textVersion]) {
    throw new Error(ConsentError.CONSENT_INVALID);
  }
  
  if (!givenByRole || !ConsentGivenByRole[givenByRole]) {
    throw new Error(ConsentError.CONSENT_INVALID);
  }
  
  if (!stateCode || !/^[A-Z]{2}$/.test(stateCode)) {
    throw new Error(ConsentError.CONSENT_INVALID);
  }
  
  // If enumerator gave consent, enumerator ID is required
  if (givenByRole === ConsentGivenByRole.ENUMERATOR && !enumeratorId) {
    throw new Error(ConsentError.CONSENT_INVALID);
  }
  
  // Generate consent hash
  const timestamp = new Date().toISOString();
  const consentHash = generateConsentHash({
    textVersion,
    givenByRole,
    stateCode,
    districtCode,
    blockCode,
    villageCode,
    timestamp,
  });
  
  try {
    const result = await db.query(
      `INSERT INTO consent_records (
        consent_text_version,
        consent_given_by_role,
        geographic_scope_state,
        geographic_scope_district,
        geographic_scope_block,
        geographic_scope_village,
        recorded_by_enumerator_id,
        consent_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING consent_id, receipt_id, consent_timestamp`,
      [
        textVersion,
        givenByRole,
        stateCode,
        districtCode || null,
        blockCode || null,
        villageCode || null,
        enumeratorId || null,
        consentHash,
      ]
    );
    
    const created = result.rows[0];
    
    return {
      consentId: created.consent_id,
      receiptId: created.receipt_id,
      timestamp: created.consent_timestamp,
      hash: consentHash,
    };
  } catch (error) {
    console.error('Failed to create consent record:', error);
    throw new Error(ConsentError.CONSENT_CREATION_FAILED);
  }
}

/**
 * Verify that consent exists for a receipt ID
 * 
 * @param {string} receiptId - Consent receipt ID
 * @returns {Promise<boolean>}
 */
export async function verifyConsentExists(receiptId) {
  const db = getDB();
  
  if (!receiptId) {
    return false;
  }
  
  try {
    const result = await db.query(
      `SELECT EXISTS (
        SELECT 1 FROM consent_records
        WHERE receipt_id = $1
      ) AS exists`,
      [receiptId]
    );
    
    return result.rows[0].exists;
  } catch (error) {
    console.error('Failed to verify consent:', error);
    return false;
  }
}

/**
 * Get consent record by receipt ID (metadata only, for verification)
 * 
 * @param {string} receiptId - Consent receipt ID
 * @returns {Promise<object|null>}
 */
export async function getConsentByReceiptId(receiptId) {
  const db = getDB();
  
  if (!receiptId) {
    return null;
  }
  
  try {
    const result = await db.query(
      `SELECT 
        consent_id,
        receipt_id,
        consent_text_version,
        consent_timestamp,
        consent_given_by_role,
        geographic_scope_state,
        geographic_scope_district,
        geographic_scope_block,
        consent_hash
      FROM consent_records
      WHERE receipt_id = $1`,
      [receiptId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const record = result.rows[0];
    
    return {
      consentId: record.consent_id,
      receiptId: record.receipt_id,
      textVersion: record.consent_text_version,
      timestamp: record.consent_timestamp,
      givenByRole: record.consent_given_by_role,
      geographicScope: {
        state: record.geographic_scope_state,
        district: record.geographic_scope_district,
        block: record.geographic_scope_block,
      },
      hash: record.consent_hash,
    };
  } catch (error) {
    console.error('Failed to get consent record:', error);
    return null;
  }
}

/**
 * Link a submission to a consent record
 * 
 * @param {string} submissionId - Submission UUID
 * @param {string} receiptId - Consent receipt ID
 * @returns {Promise<boolean>}
 */
export async function linkSubmissionToConsent(submissionId, receiptId) {
  const db = getDB();
  
  if (!submissionId || !receiptId) {
    throw new Error(ConsentError.CONSENT_LINK_FAILED);
  }
  
  // First verify consent exists
  const consentExists = await verifyConsentExists(receiptId);
  if (!consentExists) {
    throw new Error(ConsentError.CONSENT_NOT_FOUND);
  }
  
  try {
    await db.query(
      `INSERT INTO submission_consent_links (
        submission_id,
        consent_receipt_id
      ) VALUES ($1, $2)`,
      [submissionId, receiptId]
    );
    
    return true;
  } catch (error) {
    console.error('Failed to link submission to consent:', error);
    throw new Error(ConsentError.CONSENT_LINK_FAILED);
  }
}

/**
 * Create consent and link to submission atomically
 * This is the primary method for the submission flow
 * 
 * @param {object} consentParams - Consent parameters
 * @param {string} submissionId - Submission UUID
 * @returns {Promise<{receiptId: string}>}
 */
export async function createConsentAndLink(consentParams, submissionId) {
  const db = getDB();
  
  // Start transaction
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create consent record
    const timestamp = new Date().toISOString();
    const consentHash = generateConsentHash({
      ...consentParams,
      timestamp,
    });
    
    const consentResult = await client.query(
      `INSERT INTO consent_records (
        consent_text_version,
        consent_given_by_role,
        geographic_scope_state,
        geographic_scope_district,
        geographic_scope_block,
        geographic_scope_village,
        recorded_by_enumerator_id,
        consent_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING consent_id, receipt_id, consent_timestamp`,
      [
        consentParams.textVersion,
        consentParams.givenByRole,
        consentParams.stateCode,
        consentParams.districtCode || null,
        consentParams.blockCode || null,
        consentParams.villageCode || null,
        consentParams.enumeratorId || null,
        consentHash,
      ]
    );
    
    const consent = consentResult.rows[0];
    
    // Link submission to consent
    await client.query(
      `INSERT INTO submission_consent_links (
        submission_id,
        consent_receipt_id
      ) VALUES ($1, $2)`,
      [submissionId, consent.receipt_id]
    );
    
    await client.query('COMMIT');
    
    return {
      receiptId: consent.receipt_id,
      consentId: consent.consent_id,
      timestamp: consent.consent_timestamp,
      hash: consentHash,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to create consent and link:', error);
    throw new Error(ConsentError.CONSENT_CREATION_FAILED);
  } finally {
    client.release();
  }
}

/**
 * Verify submission has consent
 * 
 * @param {string} submissionId - Submission UUID
 * @returns {Promise<{hasConsent: boolean, receiptId: string|null}>}
 */
export async function verifySubmissionHasConsent(submissionId) {
  const db = getDB();
  
  if (!submissionId) {
    return { hasConsent: false, receiptId: null };
  }
  
  try {
    const result = await db.query(
      `SELECT consent_receipt_id 
       FROM submission_consent_links
       WHERE submission_id = $1`,
      [submissionId]
    );
    
    if (result.rows.length === 0) {
      return { hasConsent: false, receiptId: null };
    }
    
    return {
      hasConsent: true,
      receiptId: result.rows[0].consent_receipt_id,
    };
  } catch (error) {
    console.error('Failed to verify submission consent:', error);
    return { hasConsent: false, receiptId: null };
  }
}

/**
 * Get consent status for a citizen (by receipt ID)
 * For Citizen role to view their own consent status
 * 
 * @param {string} receiptId - Consent receipt ID
 * @returns {Promise<object|null>}
 */
export async function getConsentStatus(receiptId) {
  const consent = await getConsentByReceiptId(receiptId);
  
  if (!consent) {
    return null;
  }
  
  // Return status without sensitive details
  return {
    receiptId: consent.receiptId,
    status: 'GRANTED',
    textVersion: consent.textVersion,
    timestamp: consent.timestamp,
    geographicScope: consent.geographicScope,
  };
}

