# Simplitics Frontend Library

A privacy-first analytics library with modular design for flexible integration.

## Installation

```bash
npm install simplitics
# or
bun add simplitics
```

## Usage

### Basic Usage (All Features)

```javascript
import Simplitics from 'simplitics';

const analytics = new Simplitics({
  siteId: 'your-site-id',
  automaticPageViews: true
});

analytics.init();
analytics.enableTracking();

// Track custom events
analytics.track('button_click', { buttonId: 'submit' });

// Track page views
analytics.trackPageView();

// Track sessions
analytics.trackSession();
```

### Modular Usage

You can import only the features you need to keep your bundle size small.

#### Basic Tracking Only

```javascript
import { BaseAnalytics } from 'simplitics';

const analytics = new BaseAnalytics({
  siteId: 'your-site-id'
});

analytics.init();
analytics.track('event', { value: 123 });
```

#### Privacy Enhancement Only

```javascript
import { BaseAnalytics, PrivacyEnhancer } from 'simplitics';

const analytics = new BaseAnalytics({ siteId: 'your-site-id' });
const privacy = new PrivacyEnhancer({
  hashUserIds: true
});

// Use privacy features directly
const sanitizedData = await privacy.sanitizeProperties({
  userId: '123',
  email: 'test@example.com',
  value: 456
});
```

#### Advanced Features Only

```javascript
import { BaseAnalytics, AdvancedAnalytics } from 'simplitics';

const baseAnalytics = new BaseAnalytics({ siteId: 'your-site-id' });
const advanced = new AdvancedAnalytics(baseAnalytics);

// Use advanced features
advanced.trackPageView();
advanced.trackSession();
```

## Features

### Base Analytics
- Event tracking
- Consent management
- Event queueing
- Basic configuration

### Privacy Enhancement
- PII removal
- User ID hashing
- URL parameter cleaning
- Configurable privacy settings

### Advanced Features
- Automatic page view tracking
- Session tracking
- Enhanced event properties

## Configuration Options

```javascript
const config = {
  // Required
  siteId: 'your-site-id',

  // Optional
  endpoint: 'https://api.simplitics.com/v1',
  consentRequired: true,
  hashUserIds: true,
  automaticPageViews: true
};
```

## Building from Source

```bash
bun install
bun run build
```

## Running Tests

```bash
bun test
```
