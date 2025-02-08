/**
 * Security middleware for Simplitics API
 */

/**
 * Add security headers to response
 * @param {Request} request - The incoming request
 * @param {Object} store - The Elysia store object
 */
export function addSecurityHeaders(request, store) {
  // Set strict CSP headers
  const csp = [
    "default-src 'none'",
    "script-src 'self'",
    "connect-src 'self'",
    "img-src 'self'",
    "style-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  // Set security headers
  store.set.headers['Content-Security-Policy'] = csp;
  store.set.headers['X-Content-Type-Options'] = 'nosniff';
  store.set.headers['X-Frame-Options'] = 'DENY';
  store.set.headers['X-XSS-Protection'] = '1; mode=block';
  store.set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  store.set.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  store.set.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()';
}

/**
 * Validate request origin
 * @param {Request} request - The incoming request
 * @param {Object} store - The Elysia store object
 * @throws {Error} If origin is not allowed
 */
export function validateOrigin(request, store) {
  const origin = request.headers.get('Origin');
  if (!origin) return; // Skip for non-CORS requests

  // Get allowed origins from environment or config
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://localhost:3000'];

  if (!allowedOrigins.includes(origin)) {
    throw new Error('Origin not allowed');
  }

  // Set CORS headers for allowed origins
  store.set.headers['Access-Control-Allow-Origin'] = origin;
  store.set.headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS';
  store.set.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Site-ID';
  store.set.headers['Access-Control-Max-Age'] = '86400';
}

/**
 * Rate limiting middleware
 * @param {Request} request - The incoming request
 * @param {Object} store - The Elysia store object
 * @throws {Error} If rate limit is exceeded
 */
export function rateLimit(request, store) {
  // Get client IP
  const clientIp = request.headers.get('X-Forwarded-For') || 
                  request.headers.get('X-Real-IP') || 
                  'unknown';

  // Simple in-memory rate limiting
  // In production, use Redis or similar for distributed rate limiting
  const WINDOW_SIZE = 60 * 1000; // 1 minute
  const MAX_REQUESTS = 100; // requests per minute

  const now = Date.now();
  const windowKey = Math.floor(now / WINDOW_SIZE);
  const requestKey = `${clientIp}:${windowKey}`;

  // Get current request count
  const requestCount = store.rateLimit?.get(requestKey) || 0;

  if (requestCount >= MAX_REQUESTS) {
    throw new Error('Rate limit exceeded');
  }

  // Initialize rate limit store if needed
  if (!store.rateLimit) {
    store.rateLimit = new Map();
  }

  // Update request count
  store.rateLimit.set(requestKey, requestCount + 1);

  // Set rate limit headers
  store.set.headers['X-RateLimit-Limit'] = MAX_REQUESTS;
  store.set.headers['X-RateLimit-Remaining'] = MAX_REQUESTS - requestCount - 1;
  store.set.headers['X-RateLimit-Reset'] = (windowKey + 1) * WINDOW_SIZE;
}

/**
 * Validate request payload size
 * @param {Request} request - The incoming request
 * @throws {Error} If payload is too large
 */
export async function validatePayloadSize(request) {
  const MAX_PAYLOAD_SIZE = 100 * 1024; // 100KB

  if (request.method === 'POST') {
    const contentLength = parseInt(request.headers.get('Content-Length') || '0');
    if (contentLength > MAX_PAYLOAD_SIZE) {
      throw new Error('Payload too large');
    }

    // Double-check actual payload size
    const payload = await request.clone().text();
    if (payload.length > MAX_PAYLOAD_SIZE) {
      throw new Error('Payload too large');
    }
  }
}
