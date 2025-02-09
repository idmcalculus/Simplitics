/**
 * Security middleware for Simplitics API
 */

/**
 * Add security headers to response
 * @param {object} ctx - Elysia context
 */
export function addSecurityHeaders(ctx) {
  // Fallback if ctx.headers is missing
  if (!ctx.headers) ctx.headers = {};

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

  // Additional security headers
  const securityHeaders = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };

  // Merge these into ctx.headers
  Object.assign(ctx.headers, securityHeaders);

  return securityHeaders;
}

/**
 * Validate request origin
 * @param {object} ctx - Elysia context
 * @throws {Error} If origin is not allowed
 */
export function validateOrigin(ctx) {
  if (!ctx.headers) ctx.headers = {};

  // In some Elysia versions, ctx.request.headers is a standard Headers. 
  // If so, be mindful of how you extract "origin".

  const origin = ctx.request?.headers?.origin || ctx.request?.headers?.Origin;
  if (!origin) return;

  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://localhost:3000', 'http://localhost'];

  if (!allowedOrigins.includes(origin)) {
    throw new Error('Origin not allowed');
  }

  // If origin is allowed, set CORS headers
  ctx.headers['Access-Control-Allow-Origin'] = origin;
  ctx.headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, DELETE, OPTIONS';
  ctx.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Site-ID, X-API-Key';
  ctx.headers['Access-Control-Max-Age'] = '86400';
}

/**
 * Rate limiting middleware
 * @param {object} ctx - Elysia context
 * @throws {Error} If rate limit is exceeded
 */
export function rateLimit(ctx) {
  // If the derived property is missing, create it
  if (!ctx.rateLimit) ctx.rateLimit = new Map();
  if (!ctx.headers) ctx.headers = {};

  const clientIp = ctx.request?.headers?.['x-forwarded-for'] 
                || ctx.request?.headers?.['x-real-ip'] 
                || 'unknown';

  // Simple in-memory rate limiting
  const WINDOW_SIZE = 60 * 1000; // 1 minute
  const MAX_REQUESTS = 100;      // requests per minute

  const now = Date.now();
  const windowKey = Math.floor(now / WINDOW_SIZE);
  const requestKey = `${clientIp}:${windowKey}`;

  // Get current request count
  const requestCount = ctx.rateLimit.get(requestKey) || 0;
  if (requestCount >= MAX_REQUESTS) {
    throw new Error('Rate limit exceeded');
  }

  ctx.rateLimit.set(requestKey, requestCount + 1);

  ctx.headers['X-RateLimit-Limit'] = String(MAX_REQUESTS);
  ctx.headers['X-RateLimit-Remaining'] = String(MAX_REQUESTS - requestCount - 1);
  ctx.headers['X-RateLimit-Reset'] = String((windowKey + 1) * WINDOW_SIZE);
}

/**
 * Validate request payload size
 * @param {object} ctx - Elysia context
 * @throws {Error} If payload is too large
 */
export async function validatePayloadSize(ctx) {
  const { request } = ctx;
  const MAX_PAYLOAD_SIZE = 100 * 1024; // 100KB

  if (request.method === 'POST' || request.method === 'PATCH') {
    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > MAX_PAYLOAD_SIZE) {
      throw new Error('Payload too large');
    }

    // Double-check actual body size:
    const payload = await request.clone().text();
    if (payload.length > MAX_PAYLOAD_SIZE) {
      throw new Error('Payload too large');
    }
  }
}