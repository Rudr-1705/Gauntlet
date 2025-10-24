import crypto from 'crypto';

/**
 * Generate SHA-256 hash of input string
 * @param {string} input - The string to hash
 * @returns {string} - The hex-encoded SHA-256 hash
 */
export function generateSHA256Hash(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input must be a non-empty string');
  }
  
  return crypto
    .createHash('sha256')
    .update(input.trim()) // Trim whitespace for consistency
    .digest('hex');
}

/**
 * Verify if an answer matches the correct answer hash
 * @param {string} answer - The answer to verify
 * @param {string} correctHash - The correct answer's SHA-256 hash
 * @returns {boolean} - True if answer matches
 */
export function verifyAnswerHash(answer, correctHash) {
  if (!answer || !correctHash) {
    return false;
  }
  
  const answerHash = generateSHA256Hash(answer);
  return answerHash === correctHash.toLowerCase();
}

/**
 * Compare two hashes for equality
 * @param {string} hash1 
 * @param {string} hash2 
 * @returns {boolean}
 */
export function compareHashes(hash1, hash2) {
  if (!hash1 || !hash2) {
    return false;
  }
  return hash1.toLowerCase() === hash2.toLowerCase();
}
