import { describe, expect, it } from 'bun:test';
import {
  addSecurityHeaders,
  validateOrigin,
  rateLimit,
  validatePayloadSize
} from '../src/middleware/security';

describe('Security Middleware', () => {
  describe('Security Headers', () => {
    it('adds CSP and other security headers', () => {
      // Create a mock context
      const ctx = {
        request: new Request('http://localhost'),
        headers: {} // Our "response" headers object
      };

      addSecurityHeaders(ctx);

      expect(ctx.headers['Content-Security-Policy']).toBeDefined();
      expect(ctx.headers['X-Content-Type-Options']).toBe('nosniff');
      expect(ctx.headers['X-Frame-Options']).toBe('DENY');
      expect(ctx.headers['Strict-Transport-Security']).toBeDefined();
    });
  });

  describe('Origin Validation', () => {
    it('allows requests from allowed origins', () => {
      // Mock context with an allowed origin
      const ctx = {
        request: {
          // Depending on your Elysia version, you might or might not have a standard `Headers` here,
          // but for testing we can just mimic it as an object:
          headers: {
            origin: 'https://localhost:3000'
          }
        },
        headers: {}
      };

      validateOrigin(ctx);

      expect(ctx.headers['Access-Control-Allow-Origin']).toBe('https://localhost:3000');
    });

    it('rejects requests from disallowed origins', () => {
      const ctx = {
        request: {
          headers: {
            origin: 'https://evil.com'
          }
        },
        headers: {}
      };

      expect(() => validateOrigin(ctx)).toThrow('Origin not allowed');
    });
  });

  describe('Rate Limiting', () => {
    it('tracks request counts', () => {
      // Mock context
      const ctx = {
        request: {
          headers: { 'x-real-ip': '127.0.0.1' }
        },
        headers: {},
        // This is our derived "rateLimit" store
        rateLimit: new Map()
      };

      rateLimit(ctx);

      // The map should have 1 entry now
      expect(ctx.rateLimit.size).toBe(1);
    });

    it('rejects requests over limit', () => {
      const ctx = {
        request: {
          headers: { 'x-real-ip': '127.0.0.1' }
        },
        headers: {},
        rateLimit: new Map()
      };

      // Simulate hitting the limit:
      const windowKey = Math.floor(Date.now() / (60 * 1000));
      const requestKey = `127.0.0.1:${windowKey}`;
      ctx.rateLimit.set(requestKey, 100); // Already at max

      expect(() => rateLimit(ctx)).toThrow('Rate limit exceeded');
    });
  });

  describe('Payload Validation', () => {
    it('accepts valid payload sizes', async () => {
      const ctx = {
        request: new Request('http://localhost', {
          method: 'POST',
          headers: { 'Content-Length': '100' },
          body: 'x'.repeat(100)
        })
      };

      await expect(validatePayloadSize(ctx)).resolves.toBeUndefined();
    });

    it('rejects large payloads', async () => {
      const ctx = {
        request: new Request('http://localhost', {
          method: 'POST',
          headers: { 'Content-Length': '200000' },
          body: 'x'.repeat(200000)
        })
      };

      await expect(validatePayloadSize(ctx)).rejects.toThrow('Payload too large');
    });
  });
});