/**
 * Base Analytics Class
 * Provides core tracking functionality
 */

import { validateConfig, validateEventName, validateProperties } from './validation';

// Get the current URL safely
const getCurrentUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    // Ensure we're not leaking credentials in the URL
    const url = new URL(window.location.href);
    url.username = '';
    url.password = '';
    return url.toString();
  }
  return 'https://localhost';
};

export class BaseAnalytics {
  constructor(config = {}) {
    // Validate configuration
    validateConfig(config);

    // Set default endpoint with HTTPS
    if (!config.endpoint) {
      config.endpoint = 'https://api.simplitics.com/v1';
    }

    this.config = {
      endpoint: config.endpoint || 'https://api.simplitics.com/v1',
      siteId: config.siteId,
      consentRequired: config.consentRequired ?? true,
      ...config
    };

    this.initialized = false;
    this.queue = [];
    this.hasConsent = !this.config.consentRequired || localStorage.getItem('simplitics_consent') === 'true';
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.processQueue();
  }

  enableTracking() {
    this.hasConsent = true;
    localStorage.setItem('simplitics_consent', 'true');
    this.processQueue();
  }

  disableTracking() {
    this.hasConsent = false;
    localStorage.setItem('simplitics_consent', 'false');
  }

  async processQueue() {
    if (!this.hasConsent || !this.initialized) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    await Promise.all(events.map(event => this.sendEvent(event)));
  }

  async track(eventName, properties = {}) {
    // Validate inputs
    validateEventName(eventName);
    validateProperties(properties);
    
    const event = {
      type: eventName,
      properties,
      timestamp: new Date().toISOString(),
      url: getCurrentUrl()
    };

    if (!this.hasConsent || !this.initialized) {
      this.queue.push(event);
      return event;
    }

    await this.sendEvent(event);
    return event;
  }

  async sendEvent(event) {
    if (!this.config.endpoint || !this.config.siteId) {
      console.error('Simplitics: endpoint and siteId are required');
      return;
    }

    // Ensure HTTPS
    const endpoint = new URL(this.config.endpoint);
    if (!endpoint.protocol.startsWith('https')) {
      console.error('Simplitics: HTTPS is required for API endpoints');
      return;
    }

    try {
      const response = await fetch(`${this.config.endpoint}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-ID': this.config.siteId
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Simplitics: Failed to send event', error);
    }
  }
}
