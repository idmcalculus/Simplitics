import { describe, expect, it, beforeEach, beforeAll } from 'bun:test';
import { AdvancedAnalytics } from '../../src/advanced';
import { BaseAnalytics } from '../../src/core/base';

describe('AdvancedAnalytics', () => {
  let advanced;
  let baseAnalytics;
  let mockStorage = {};
  let sessionStorage = {};
  let fetchCalls = [];

  // Setup global mocks
  beforeAll(() => {
    // Mock document
    global.document = {
      referrer: 'http://localhost/referrer',
      title: 'Test Page'
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
      getItem: (key) => sessionStorage[key] || null,
      setItem: (key, value) => { sessionStorage[key] = value; }
    };

    // Mock crypto.randomUUID
    global.crypto = {
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
    sessionStorage = {};
    fetchCalls = [];
    baseAnalytics = new BaseAnalytics({
      endpoint: 'https://test-api.simplitics.com',
      siteId: 'test-site',
      consentRequired: false
    });
    baseAnalytics.init();
    advanced = new AdvancedAnalytics(baseAnalytics);
  });

  describe('Page View Tracking', () => {
    it('tracks page views with correct properties', async () => {
      await advanced.trackPageView();

      expect(fetchCalls.length).toBe(1);
      const call = fetchCalls[0];
      const body = JSON.parse(call.options.body);
      
      expect(body.type).toBe('pageview');
      expect(body.properties.url).toBe('http://localhost/current');
      expect(body.properties.referrer).toBe('http://localhost/referrer');
      expect(body.properties.title).toBe('Test Page');
    });

    it('enables automatic page view tracking', async () => {
      let pageViewCount = 0;
      baseAnalytics.track = () => { pageViewCount++; };
      
      advanced.enableAutomaticPageViews();
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for setTimeout
      expect(pageViewCount).toBe(1);
    });
  });

  describe('Session Tracking', () => {
    it('generates and stores session ID', async () => {
      await advanced.trackSession();
      expect(sessionStorage['simplitics_session']).toBe('12345678-1234-1234-1234-123456789012');
    });

    it('reuses existing session ID', async () => {
      const existingSessionId = '98765432-9876-9876-9876-987654321098';
      sessionStorage['simplitics_session'] = existingSessionId;
      
      await advanced.trackSession();
      expect(advanced.getSessionId()).toBe(existingSessionId);
    });

    it('tracks session start event', async () => {
      await advanced.trackSession();

      expect(fetchCalls.length).toBe(1);
      const call = fetchCalls[0];
      const body = JSON.parse(call.options.body);
      
      expect(body.type).toBe('session_start');
      expect(body.properties.sessionId).toBe('12345678-1234-1234-1234-123456789012');
      expect(body.properties.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
