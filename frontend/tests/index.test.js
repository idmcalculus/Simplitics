import { describe, expect, it, beforeEach, beforeAll } from 'bun:test';
import Simplitics from '../src';

describe('Simplitics', () => {
  let analytics;
  let mockStorage = {};
  let fetchCalls = [];

  // Setup global mocks
  beforeAll(() => {
    // Mock document
    global.document = {
      referrer: 'http://localhost/referrer',
      title: 'Test Page',
      readyState: 'complete'
    };

    // Mock window
    global.window = {
      location: {
        href: 'http://localhost/current'
      },
      addEventListener: (event, callback) => {
        if (event === 'load') callback();
      }
    };

    // Mock localStorage
    global.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = value; }
    };

    // Mock sessionStorage
    global.sessionStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = value; }
    };

    // Mock crypto
    global.crypto = {
      subtle: {
        digest: async (algorithm, data) => {
          return new Uint8Array(32).fill(1);
        }
      },
      randomUUID: () => '12345678-1234-1234-1234-123456789012'
    };

    // Mock fetch
    global.fetch = async (url, options) => {
      fetchCalls.push({ url, options });
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };
  });

  beforeEach(() => {
    mockStorage = {};
    fetchCalls = [];
    analytics = new Simplitics({
      endpoint: 'https://test-api.simplitics.com',
      siteId: 'test-site',
      automaticPageViews: false,
      consentRequired: false
    });
    analytics.init();
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      // Clear fetch calls from init
      fetchCalls = [];
    });

    it('integrates privacy features with tracking', async () => {
      await analytics.track('test_event', {
        userId: '12345',
        email: 'test@example.com',
        value: 123
      });

      expect(fetchCalls.length).toBe(1);
      const call = fetchCalls[0];
      const body = JSON.parse(call.options.body);
      
      expect(body.properties.email).toBeUndefined();
      expect(body.properties.userId).not.toBe('12345');
      expect(body.properties.value).toBe(123);
    });

    it('enables automatic page view tracking on init', async () => {
      // Create new instance
      const newAnalytics = new Simplitics({
        endpoint: 'https://test-api.simplitics.com',
        siteId: 'test-site',
        automaticPageViews: true,
        consentRequired: false
      });

      fetchCalls = [];
      newAnalytics.init();
      
      // Wait for setTimeout in enableAutomaticPageViews
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(fetchCalls.length).toBe(1);
      const call = fetchCalls[0];
      const body = JSON.parse(call.options.body);
      
      expect(body.type).toBe('pageview');
      expect(body.properties.title).toBe('Test Page');
    });

    it('combines all features correctly', async () => {
      await analytics.trackSession();
      await analytics.track('custom_event', {
        userId: '12345',
        utm_source: 'test',
        value: 123
      });

      expect(fetchCalls.length).toBe(2); // session, custom_event
      const customEvent = JSON.parse(fetchCalls[1].options.body);
      
      expect(customEvent.type).toBe('custom_event');
      expect(customEvent.properties.userId).not.toBe('12345');
      expect(customEvent.properties.utm_source).toBeUndefined();
      expect(customEvent.properties.value).toBe(123);
    });
  });
});
