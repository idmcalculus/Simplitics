import { describe, expect, it, beforeEach, beforeAll } from 'bun:test';
import { BaseAnalytics } from '../../src/core/base';

describe('BaseAnalytics', () => {
  let analytics;
  let mockStorage = {};
  let fetchCalls = [];
  let mockResponses = new Map();

  // Setup global mocks
  beforeAll(() => {
    // Mock localStorage
    global.localStorage = {
      getItem: (key) => mockStorage[key] || null,
      setItem: (key, value) => { mockStorage[key] = value; },
      clear: () => { mockStorage = {}; },
      removeItem: (key) => { delete mockStorage[key]; }
    };

    // Mock fetch with configurable responses
    global.fetch = async (url, options) => {
      fetchCalls.push({ url, options });
      const response = mockResponses.get(url) || {
        status: 200,
        body: {}
      };
      
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    };
  });

  beforeEach(() => {
    mockStorage = {};
    fetchCalls = [];
    mockResponses.clear();
    analytics = new BaseAnalytics({
      endpoint: 'https://test-api.simplitics.com',
      siteId: 'test-site'
    });
  });

  describe('Initialization and Configuration', () => {
    it('initializes with default config', () => {
      expect(analytics.config.consentRequired).toBe(true);
      expect(analytics.hasConsent).toBe(false);
      expect(analytics.initialized).toBe(false);
    });

    it('allows custom configuration', () => {
      const customAnalytics = new BaseAnalytics({
        endpoint: 'https://custom-api.example.com',
        siteId: 'custom-site',
        consentRequired: false
      });
      expect(customAnalytics.config.endpoint).toBe('https://custom-api.example.com');
      expect(customAnalytics.config.siteId).toBe('custom-site');
      expect(customAnalytics.config.consentRequired).toBe(false);
    });

    it('throws error if siteId is not provided', () => {
      expect(() => new BaseAnalytics({})).toThrow();
    });
  });

  describe('Consent Management', () => {
    it('enables tracking', () => {
      analytics.enableTracking();
      expect(analytics.hasConsent).toBe(true);
      expect(mockStorage).toHaveProperty('simplitics_consent', 'true');
    });

    it('disables tracking', () => {
      analytics.disableTracking();
      expect(analytics.hasConsent).toBe(false);
      expect(mockStorage).toHaveProperty('simplitics_consent', 'false');
    });

    it('persists consent state across instances', () => {
      analytics.enableTracking();
      const newAnalytics = new BaseAnalytics({
        endpoint: 'https://test-api.simplitics.com',
        siteId: 'test-site'
      });
      expect(newAnalytics.hasConsent).toBe(true);
    });

    it('respects consentRequired setting', () => {
      const noConsentAnalytics = new BaseAnalytics({
        endpoint: 'https://test-api.simplitics.com',
        siteId: 'test-site',
        consentRequired: false
      });
      expect(noConsentAnalytics.hasConsent).toBe(true);
    });
  });

  describe('Event Tracking', () => {
    it('queues events when consent is not given', async () => {
      analytics.hasConsent = false;
      await analytics.track('test_event', { value: 123 });
      expect(analytics.queue.length).toBe(1);
      expect(fetchCalls.length).toBe(0);
    });

    it('sends events when consent is given', async () => {
      analytics.init();
      analytics.enableTracking();
      await analytics.track('test_event', { value: 123 });
      
      expect(fetchCalls.length).toBe(1);
      const call = fetchCalls[0];
      expect(call.url).toBe('https://test-api.simplitics.com/events');
      expect(call.options).toEqual({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-ID': 'test-site'
        },
        body: expect.any(String)
      });
    });

    it('processes queued events when consent is given', async () => {
      analytics.hasConsent = false;
      await analytics.track('event1', { value: 1 });
      await analytics.track('event2', { value: 2 });
      expect(analytics.queue.length).toBe(2);

      analytics.init();
      analytics.enableTracking();
      await analytics.processQueue();

      expect(analytics.queue.length).toBe(0);
      expect(fetchCalls.length).toBe(2);
    });

    it('handles API errors gracefully', async () => {
      mockResponses.set('https://test-api.simplitics.com/events', {
        status: 500,
        body: { error: 'Internal Server Error' }
      });

      analytics.init();
      analytics.enableTracking();
      
      // Should not throw
      await analytics.track('test_event', { value: 123 });
    });
  });
});
