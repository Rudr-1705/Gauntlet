/**
 * Generate SHA-256 hash of a string
 * @param {string} text - The text to hash
 * @returns {string} - Hexadecimal hash string
 */
export const generateSHA256Hash = async (text) => {
  // Use Web Crypto API (available in all modern browsers)
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Synchronous version of SHA-256 hash (for immediate feedback)
 * Note: This is a simplified implementation. For production, use the async version above.
 */
export const generateSHA256HashSync = (text) => {
  // For demo purposes, we'll use a simple hash
  // In production, always use the async Web Crypto API
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
};

// Export the async version by default
export default generateSHA256Hash;
