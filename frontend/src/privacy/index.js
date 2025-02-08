/**
 * Privacy Enhancement Module
 * Provides PII removal and data hashing functionality
 */

export class PrivacyEnhancer {
  constructor(config = {}) {
    this.config = {
      hashUserIds: config.hashUserIds ?? true,
      ...config
    };
  }

  async sanitizeProperties(properties) {
    const sanitized = { ...properties };
    
    // Remove common PII fields
    const piiFields = ['email', 'phone', 'name', 'address', 'ip', 'password', 'ssn'];
    piiFields.forEach(field => {
      delete sanitized[field];
    });

    // Hash sensitive IDs if configured
    if (this.config.hashUserIds) {
      const sensitiveIds = ['userId', 'customerId', 'accountId'];
      for (const field of sensitiveIds) {
        if (sanitized[field]) {
          sanitized[field] = await this.hashValue(sanitized[field]);
        }
      }
    }

    // Clean URLs and properties of tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    
    // Remove tracking params from properties
    trackingParams.forEach(param => {
      delete sanitized[param];
    });

    // Clean URL if present
    if (sanitized.url) {
      try {
        const url = new URL(sanitized.url);
        const params = new URLSearchParams(url.search);
        
        trackingParams.forEach(param => params.delete(param));
        url.search = params.toString();
        sanitized.url = url.toString().replace(/\/$/, ''); // Remove trailing slash
      } catch (e) {
        // Invalid URL, keep original
      }
    }

    return sanitized;
  }

  async hashValue(value) {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
