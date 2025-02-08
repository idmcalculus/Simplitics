/**
 * Simplitics - Privacy-First Analytics Library
 * @license MIT
 */

import { BaseAnalytics } from './core/base';
import { PrivacyEnhancer } from './privacy';
import { AdvancedAnalytics } from './advanced';

class Simplitics extends BaseAnalytics {
  constructor(config = {}) {
    super(config);
    this.privacy = new PrivacyEnhancer(config);
    this.advanced = new AdvancedAnalytics(this);
  }

  async track(eventName, properties = {}) {
    // Apply privacy enhancements before tracking
    const sanitizedProps = await this.privacy.sanitizeProperties(properties);
    return super.track(eventName, sanitizedProps);
  }

  // Expose advanced features
  trackPageView() {
    return this.advanced.trackPageView();
  }

  trackSession() {
    return this.advanced.trackSession();
  }

  init() {
    if (this.config.automaticPageViews) {
      this.advanced.enableAutomaticPageViews();
    }
    super.init();
  }
}

// Export individual modules for granular imports
export { BaseAnalytics } from './core/base';
export { PrivacyEnhancer } from './privacy';
export { AdvancedAnalytics } from './advanced';

// Export default class for full functionality
export { Simplitics as default };
