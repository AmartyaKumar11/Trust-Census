import crypto from 'crypto';

/**
 * Security Utilities
 * 
 * RESPONSIBILITY: Cryptographic functions and personal data validation
 * 
 * MUST:
 * - Generate SHA-256 hashes for data integrity
 * - Verify data integrity using hashes
 * - Validate that no personal identifiers are present
 * - Sanitize inputs to prevent injection attacks
 * 
 * MUST NEVER:
 * - Store or log sensitive data
 * - Bypass security checks
 * - Modify data in place (return sanitized copies)
 * - Accept personal identifiers (Aadhaar, phone, biometrics, etc.)
 * - Expose cryptographic keys or secrets
 */

/**
 * Generate SHA-256 hash for data integrity verification
 * Used to ensure data cannot be tampered with
 */
export function generateHash(data) {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Verify data integrity using hash
 */
export function verifyHash(data, expectedHash) {
  const computedHash = generateHash(data);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(expectedHash)
  );
}

/**
 * Sanitize data to prevent injection attacks
 * Removes any potential personal identifiers
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove any patterns that might be personal identifiers
  // No Aadhaar (12 digits), phone (10 digits), etc.
  return input
    .replace(/\b\d{12}\b/g, '') // Remove 12-digit numbers (Aadhaar-like)
    .replace(/\b\d{10}\b/g, '') // Remove 10-digit numbers (phone-like)
    .trim();
}

/**
 * Validate that no personal identifiers are present
 */
export function validateNoPersonalData(data) {
  const dataString = JSON.stringify(data).toLowerCase();
  
  const forbiddenPatterns = [
    'aadhaar',
    'uidai',
    'biometric',
    'fingerprint',
    'iris',
    'phone',
    'mobile',
    'email',
    'name',
    'address',
    'pincode',
  ];
  
  for (const pattern of forbiddenPatterns) {
    if (dataString.includes(pattern)) {
      throw new Error(`Personal identifier pattern detected: ${pattern}`);
    }
  }
  
  return true;
}

