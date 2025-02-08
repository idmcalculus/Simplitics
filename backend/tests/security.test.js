import { describe, expect, it } from 'bun:test';
import { addSecurityHeaders, validateOrigin, rateLimit, validatePayloadSize } from '../src/middleware/security';

describe('Security Middleware', () => {
  describe('Security Headers', () => {
    it('adds CSP and other security headers', () => {
      const request = new Request('http://localhost');
      const store = { headers: {} };

      addSecurityHeaders(request, store);

      expect(store.headers['Content-Security-Policy']).toBeDefined();
      expect(store.headers['X-Content-Type-Options']).toBe('nosniff');
      expect(store.headers['X-Frame-Options']).toBe('DENY');
      expect(store.headers['Strict-Transport-Security']).toBeDefined();
    });
  });

  describe('Origin Validation', () => {
    it('allows requests from allowed origins', () => {
      const request = new Request('http://localhost', {
        headers: { 'Origin': 'https://localhost:3000' }
      });
      const store = { headers: {} };

      validateOrigin(request, store);

      expect(store.headers['Access-Control-Allow-Origin']).toBe('https://localhost:3000');
    });

    it('rejects requests from disallowed origins', () => {
      const request = new Request('http://localhost', {
        headers: { 'Origin': 'https://evil.com' }
      });
      const store = { headers: {} };

      expect(() => validateOrigin(request, store)).toThrow('Origin not allowed');
    });
  });

  describe('Rate Limiting', () => {
    it('tracks request counts', () => {
      const request = new Request('http://localhost', {
        headers: { 'X-Real-IP': '127.0.0.1' }
      });
      const store = { headers: {} };

      rateLimit(request, store);

      expect(store.headers['X-RateLimit-Limit']).toBe('100');
      expect(store.headers['X-RateLimit-Remaining']).toBe('99');
    });

    it('rejects requests over limit', () => {
      const request = new Request('http://localhost', {
        headers: { 'X-Real-IP': '127.0.0.1' }
      });
      const store = { headers: {}, rateLimit: new Map() };

      // Simulate hitting rate limit
      store.rateLimit.set('127.0.0.1:' + Math.floor(Date.now() / 60000), 100);

      expect(() => rateLimit(request, store)).toThrow('Rate limit exceeded');
    });
  });

  describe('Payload Validation', () => {
    it('accepts valid payload sizes', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Length': '100' },
        body: 'x'.repeat(100)
      });

      await expect(validatePayloadSize(request)).resolves.toBeUndefined();
    });

    it('rejects large payloads', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Length': '200000' },
        body: 'x'.repeat(200000)
      });

      await expect(validatePayloadSize(request)).rejects.toThrow('Payload too large');
    });
  });
});
