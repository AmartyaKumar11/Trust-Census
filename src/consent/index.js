/**
 * Consent Module Index
 * 
 * RESPONSIBILITY: Export all consent-related components
 * 
 * Consent is a first-class, immutable legal artifact that:
 * - Must exist BEFORE any census submission
 * - Is completely INDEPENDENT of census data (L1)
 * - Contains NO caste data, NO personal identifiers
 * - Is linked to submissions ONLY via receipt_id
 */

export {
  ConsentTextVersion,
  ConsentGivenByRole,
  ConsentError,
  generateConsentHash,
  createConsent,
  verifyConsentExists,
  getConsentByReceiptId,
  linkSubmissionToConsent,
  createConsentAndLink,
  verifySubmissionHasConsent,
  getConsentStatus,
} from './service.js';

