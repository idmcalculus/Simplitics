import { describe, expect, it, beforeEach, beforeAll } from 'bun:test';
import { PrivacyEnhancer } from '../../src/privacy';

describe('PrivacyEnhancer', () => {
  let privacy;

  // Mock crypto for hashing
  beforeAll(() => {
    global.crypto = {
      subtle: {
        digest: async (algorithm, data) => {
          // Simple mock that returns a fixed hash
          return new Uint8Array(32).fill(1);
        }
      }
    };
  });

  beforeEach(() => {
    privacy = new PrivacyEnhancer({
      hashUserIds: true
    });
  });

  describe('PII Removal', () => {
    it('removes PII from event properties', async () => {
      const properties = {
        email: 'test@example.com',
        value: 123,
        name: 'John Doe',
        phone: '+1234567890',
        address: '123 Main St',
        ip: '192.168.1.1',
        ssn: '123-45-6789'
      };

      const sanitized = await privacy.sanitizeProperties(properties);
      expect(sanitized.email).toBeUndefined();
      expect(sanitized.name).toBeUndefined();
      expect(sanitized.phone).toBeUndefined();
      expect(sanitized.address).toBeUndefined();
      expect(sanitized.ip).toBeUndefined();
      expect(sanitized.ssn).toBeUndefined();
      expect(sanitized.value).toBe(123);
    });

    it('preserves non-PII data', async () => {
      const properties = {
        value: 123,
        count: 456,
        isActive: true,
        tags: ['tag1', 'tag2']
      };

      const sanitized = await privacy.sanitizeProperties(properties);
      expect(sanitized).toEqual(properties);
    });
  });

  describe('ID Hashing', () => {
    it('hashes sensitive IDs when configured', async () => {
      const properties = {
        userId: '12345',
        customerId: 'CUST-001',
        accountId: 'ACC-123',
        email: 'test@example.com'
      };

      const sanitized = await privacy.sanitizeProperties(properties);
      expect(sanitized.userId).not.toBe('12345');
      expect(sanitized.customerId).not.toBe('CUST-001');
      expect(sanitized.accountId).not.toBe('ACC-123');
      expect(sanitized.userId).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
    });

    it('respects hashUserIds configuration', async () => {
      privacy = new PrivacyEnhancer({ hashUserIds: false });
      const properties = {
        userId: '12345',
        customerId: 'CUST-001'
      };

      const sanitized = await privacy.sanitizeProperties(properties);
      expect(sanitized.userId).toBe('12345');
      expect(sanitized.customerId).toBe('CUST-001');
    });
  });

  describe('URL Cleaning', () => {
    it('removes tracking parameters from URLs', async () => {
      const event = {
        type: 'pageview',
        url: 'http://example.com?utm_source=test&utm_medium=email&name=john'
      };

      const sanitized = await privacy.sanitizeProperties(event);
      expect(sanitized.url).toBe('http://example.com/?name=john');
    });

    it('handles invalid URLs gracefully', async () => {
      const event = {
        type: 'pageview',
        url: 'not-a-valid-url'
      };

      const sanitized = await privacy.sanitizeProperties(event);
      expect(sanitized.url).toBe('not-a-valid-url');
    });

    it('preserves non-tracking query parameters', async () => {
      const event = {
        url: 'http://example.com?id=123&utm_source=test&page=2&utm_medium=email'
      };

      const sanitized = await privacy.sanitizeProperties(event);
      expect(sanitized.url).toBe('http://example.com/?id=123&page=2');
    });
  });
});
