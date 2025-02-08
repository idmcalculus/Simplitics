import validator from 'validator';

/**
 * Sanitize input to prevent XSS and injection attacks
 * @param {any} input - Input to sanitize
 * @returns {any} Sanitized input
 */
export function sanitizeInput(input) {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // Escape HTML entities and remove dangerous content
    return validator.escape(
      validator.stripLow(
        validator.trim(input)
      )
    );
  }

  if (typeof input === 'object') {
    if (Array.isArray(input)) {
      return input.map(item => sanitizeInput(item));
    }
    
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        sanitizeInput(key),
        sanitizeInput(value)
      ])
    );
  }

  // Numbers, booleans, etc. are safe as-is
  return input;
}

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Remove any unwanted characters
    url = validator.trim(url);
    
    // Ensure URL is valid
    if (!validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true
    })) {
      return null;
    }
    
    // Parse URL to remove credentials and normalize
    const parsed = new URL(url);
    parsed.username = '';
    parsed.password = '';
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate
 * @returns {string|null} Sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  
  email = validator.trim(email.toLowerCase());
  
  return validator.isEmail(email) ? email : null;
}

/**
 * Sanitize SQL query parameters
 * @param {string} param - Parameter to sanitize
 * @returns {string} Sanitized parameter
 */
export function sanitizeSqlParam(param) {
  if (!param || typeof param !== 'string') return '';
  
  // Remove SQL injection patterns
  return param.replace(/[';\\]/g, '');
}
