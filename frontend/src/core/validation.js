/**
 * Input validation utilities for Simplitics
 */

const VALID_EVENT_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const MAX_EVENT_NAME_LENGTH = 100;
const MAX_PROPERTY_VALUE_LENGTH = 1000;
const MAX_PROPERTIES_COUNT = 100;

/**
 * Validate event name format
 * @param {string} eventName - Name of the event to validate
 * @throws {Error} If event name is invalid
 */
export function validateEventName(eventName) {
  if (!eventName || typeof eventName !== 'string') {
    throw new Error('Event name must be a non-empty string');
  }

  if (eventName.length > MAX_EVENT_NAME_LENGTH) {
    throw new Error(`Event name must not exceed ${MAX_EVENT_NAME_LENGTH} characters`);
  }

  if (!VALID_EVENT_NAME_PATTERN.test(eventName)) {
    throw new Error('Event name must contain only letters, numbers, and underscores');
  }
}

/**
 * Validate event properties
 * @param {Object} properties - Properties to validate
 * @throws {Error} If properties are invalid
 */
export function validateProperties(properties) {
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new Error('Properties must be a non-null object');
  }

  const propertyCount = Object.keys(properties).length;
  if (propertyCount > MAX_PROPERTIES_COUNT) {
    throw new Error(`Properties count must not exceed ${MAX_PROPERTIES_COUNT}`);
  }

  for (const [key, value] of Object.entries(properties)) {
    // Validate property keys
    if (!VALID_EVENT_NAME_PATTERN.test(key)) {
      throw new Error(`Property key "${key}" must contain only letters, numbers, and underscores`);
    }

    // Validate property values
    validatePropertyValue(key, value);
  }
}

/**
 * Validate a single property value
 * @param {string} key - Property key
 * @param {any} value - Property value
 * @throws {Error} If value is invalid
 */
function validatePropertyValue(key, value) {
  if (value === null || value === undefined) {
    throw new Error(`Property "${key}" cannot be null or undefined`);
  }

  if (typeof value === 'function') {
    throw new Error(`Property "${key}" cannot be a function`);
  }

  if (typeof value === 'object') {
    // Convert objects to strings for length check
    value = JSON.stringify(value);
  }

  const stringValue = String(value);
  if (stringValue.length > MAX_PROPERTY_VALUE_LENGTH) {
    throw new Error(`Property "${key}" value must not exceed ${MAX_PROPERTY_VALUE_LENGTH} characters`);
  }
}

/**
 * Validate configuration object
 * @param {Object} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be a non-null object');
  }

  if (!config.siteId || typeof config.siteId !== 'string') {
    throw new Error('siteId is required and must be a string');
  }

  if (config.endpoint) {
    try {
      const url = new URL(config.endpoint);
      if (!url.protocol.startsWith('https')) {
        throw new Error('API endpoint must use HTTPS');
      }
    } catch (e) {
      throw new Error('Invalid API endpoint URL');
    }
  }

  // Validate boolean flags
  ['consentRequired', 'hashUserIds', 'automaticPageViews'].forEach(flag => {
    if (flag in config && typeof config[flag] !== 'boolean') {
      throw new Error(`${flag} must be a boolean value`);
    }
  });
}
