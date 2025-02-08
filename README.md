# Simplitics

Simplitics is a privacy-first analytics library designed for simplicity and developer-friendliness. It provides modular, secure, and privacy-focused analytics for modern web applications.

## Features

- 🔒 Privacy-focused: Built with user privacy at its core
- 🚀 Simple deployment: One-click deployment via Docker
- 📊 Basic analytics: Track page views and custom events
- 🛡️ GDPR & CCPA compliant: Built-in consent management
- 🌐 Self-hostable: Full control over your data
- ⚡ Lightweight: Minimal impact on performance

## Project Structure

```
/simplitics
├── /frontend           # Frontend library
│   ├── /src           # Source code
│   ├── /dist          # Built files
│   └── /tests         # Frontend tests
├── /backend           # Backend server
│   ├── /src           # Source code
│   └── /tests         # Backend tests
├── /docs              # Documentation
└── README.md          # This file
```

## Installation

### Frontend Library

```bash
bun add simplitics
```

### Backend Server

```bash
git clone https://github.com/yourusername/simplitics.git
cd simplitics
bun install
```

## Quick Start

### 1. Install the Library

```bash
bun add simplitics
# or
npm install simplitics
# or
yarn add simplitics
```

### 2. Initialize Simplitics

```javascript
import { Simplitics } from 'simplitics';

// Initialize with basic configuration
const analytics = new Simplitics({
  siteId: 'your-site-id',
  endpoint: 'https://your-api-endpoint.com',
  automaticPageViews: true,  // Enable automatic page view tracking
  consentRequired: true      // Enable GDPR compliance
});

// Initialize the library
analytics.init();
```

### 3. Track Events

```javascript
// Track a custom event
analytics.track('button_click', {
  buttonId: 'signup',
  location: 'header'
});

// Track a page view manually (if automatic tracking is disabled)
analytics.advanced.trackPageView();
```

## Integration Guide

### Modular Features

Simplitics is built with modularity in mind. Import only what you need:

```javascript
import { BaseAnalytics } from 'simplitics/core';
import { PrivacyEnhancer } from 'simplitics/privacy';
import { AdvancedAnalytics } from 'simplitics/advanced';
```

### Privacy Features

1. **PII Removal**
```javascript
// Configure PII removal
analytics.privacy.removePII({
  fields: ['email', 'phone'],
  patterns: [/\w+@\w+\.\w+/]  // Custom patterns
});
```

2. **ID Hashing**
```javascript
// Enable secure ID hashing
analytics.privacy.enableIdHashing({
  algorithm: 'sha256',
  salt: 'your-salt-value'
});
```

### Consent Management

```javascript
// Check consent status
if (!analytics.hasConsent()) {
  // Show consent banner
  showConsentBanner();
}

// Enable tracking when user gives consent
analytics.enableTracking();

// Disable tracking when user revokes consent
analytics.disableTracking();
```

### Advanced Features

1. **Session Tracking**
```javascript
// Enable session tracking
analytics.advanced.enableSessionTracking({
  timeout: 30 * 60 * 1000  // 30 minutes
});
```

2. **Custom Event Properties**
```javascript
// Add global properties to all events
analytics.addGlobalProperties({
  theme: 'dark',
  userType: 'premium'
});
```

### Security Best Practices

1. **Use HTTPS**
Always use HTTPS for your API endpoint:
```javascript
const analytics = new Simplitics({
  endpoint: 'https://your-secure-endpoint.com',
  // ...
});
```

2. **Set Content Security Policy**
Add these CSP headers to your website:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src 'self';
  connect-src 'self' https://your-api-endpoint.com;
  img-src 'self';
  style-src 'self';
">
```

### Error Handling

```javascript
try {
  await analytics.track('purchase', {
    amount: 99.99,
    currency: 'USD'
  });
} catch (error) {
  console.error('Analytics error:', error.message);
}
```

### Testing Mode

```javascript
// Enable testing mode
const analytics = new Simplitics({
  siteId: 'test-site',
  endpoint: 'https://test-api.simplitics.com',
  testMode: true
});
```

### Backend Integration

1. **Set up the server**
```bash
# Clone the repository
git clone https://github.com/yourusername/simplitics.git

# Install dependencies
cd simplitics/backend
bun install

# Start the server
bun run start
```

2. **Environment Configuration**
```env
PORT=3000
ALLOWED_ORIGINS=https://your-website.com
MAX_REQUEST_SIZE=100kb
RATE_LIMIT=100
```

See our [Getting Started Guide](docs/getting-started.md) for more detailed instructions.

## Development

```bash
# Install dependencies
bun install

# Start frontend development
bun run dev:frontend

# Start backend development
bun run dev:backend

# Run tests
bun test

# Build for production
bun run build:frontend
```

## Documentation

Detailed documentation can be found in the [docs](docs) directory.

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.