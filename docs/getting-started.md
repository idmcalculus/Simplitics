# Getting Started with Simplitics

Simplitics is a privacy-first analytics library that helps you track user interactions while respecting their privacy and complying with GDPR/CCPA regulations.

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

## Usage

### Frontend

```javascript
const analytics = new Simplitics({
  endpoint: 'https://your-api.example.com',
  siteId: 'your-site-id'
});

// Initialize the library
analytics.init();

// Enable tracking (after user consent)
analytics.enableTracking();

// Track custom events
analytics.track('button_click', { buttonId: 'signup' });
```

### Backend

```bash
# Start the development server
bun run dev:backend

# Start the production server
bun run start:backend
```

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
