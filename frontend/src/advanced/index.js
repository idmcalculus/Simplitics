/**
 * Advanced Analytics Module
 * Provides enhanced tracking features like page views and session tracking
 */

export class AdvancedAnalytics {
  constructor(baseAnalytics) {
    this.analytics = baseAnalytics;
  }

  async trackPageView() {
    return this.analytics.track('pageview', {
      url: window.location.href,
      referrer: document.referrer,
      title: document.title
    });
  }

  enableAutomaticPageViews() {
    if (typeof window === 'undefined') return;

    const trackPage = () => {
      // Small delay to ensure analytics is fully initialized
      setTimeout(() => this.trackPageView(), 0);
    };

    // Track immediately if document is already loaded
    if (document.readyState === 'complete') {
      trackPage();
    } else {
      // Wait for document to load
      window.addEventListener('load', trackPage);
    }
  }

  async trackSession() {
    const sessionId = this.getSessionId();
    return this.analytics.track('session_start', {
      sessionId,
      startTime: new Date().toISOString()
    });
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('simplitics_session');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('simplitics_session', sessionId);
    }
    return sessionId;
  }
}
