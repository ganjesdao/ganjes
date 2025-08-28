/**
 * Security Headers and CSP Configuration
 * Enhanced security configuration for the application
 */

/**
 * Content Security Policy Configuration
 */
export const CSP_CONFIG = {
  // Base directives
  'default-src': ["'self'"],

  // Script sources - be restrictive but allow necessary external scripts
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for React inline scripts - consider removing in production
    "'unsafe-eval'", // Required for React dev tools - remove in production
    'https://cdn.jsdelivr.net', // For external libraries
    'https://unpkg.com', // For external libraries
  ],

  // Style sources
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components and CSS-in-JS
    'https://fonts.googleapis.com',
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
  ],

  // Font sources
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'data:', // For base64 encoded fonts
  ],

  // Image sources
  'img-src': [
    "'self'",
    'data:', // For base64 images
    'blob:', // For generated images
    'https:', // Allow HTTPS images (be more restrictive in production)
  ],

  // Media sources
  'media-src': ["'self'"],

  // Object sources
  'object-src': ["'none'"], // Block plugins like Flash

  // Frame sources (for embedding)
  'frame-src': [
    "'self'",
    // Add specific domains if you need to embed content
  ],

  // Connect sources (for AJAX, WebSocket, etc.)
  'connect-src': [
    "'self'",
    'https://api.ganjes.world', // Your API domain
    'https://mainnet.infura.io',
    'https://sepolia.infura.io',
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed2.binance.org',
    'https://data-seed-prebsc-1-s1.binance.org:8545',
    'wss:', // For WebSocket connections
  ],

  // Form action targets
  'form-action': ["'self'"],

  // Frame ancestors (who can embed this page)
  'frame-ancestors': ["'none'"], // Prevent clickjacking

  // Base URI restrictions
  'base-uri': ["'self'"],

  // Upgrade insecure requests
  'upgrade-insecure-requests': true,

  // Block mixed content
  'block-all-mixed-content': true,
};

/**
 * Generate CSP header string
 */
export function generateCSPHeader() {
  const directives = [];

  Object.entries(CSP_CONFIG).forEach(([key, value]) => {
    if (typeof value === 'boolean' && value) {
      directives.push(key);
    } else if (Array.isArray(value)) {
      directives.push(`${key} ${value.join(' ')}`);
    }
  });

  return directives.join('; ');
}

/**
 * Security Headers Configuration
 */
export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': generateCSPHeader(),

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS filtering
  'X-XSS-Protection': '1; mode=block',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Strict Transport Security (HTTPS only)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
  ].join(', '),

  // Cross-Origin policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Apply security headers to HTML document (client-side)
 */
export function applyClientSideSecurityHeaders() {
  // Create and append CSP meta tag if not already present
  if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
    const cspMeta = document.createElement('meta');
    cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
    cspMeta.setAttribute('content', generateCSPHeader());

  }

  // Add other security meta tags
  const securityMetas = [
    { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
    { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
    { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
    { 'http-equiv': 'Referrer-Policy', content: 'strict-origin-when-cross-origin' },
  ];

  securityMetas.forEach(meta => {
    const httpEquiv = meta['http-equiv'];
    if (!document.querySelector(`meta[http-equiv="${httpEquiv}"]`)) {
      const metaTag = document.createElement('meta');
      Object.keys(meta).forEach(key => {
        metaTag.setAttribute(key, meta[key]);
      });
      //  document.head.appendChild(metaTag);
    }
  });
}

/**
 * CSRF Protection Utilities
 */
export class CSRFProtection {
  static TOKEN_HEADER = 'X-CSRF-Token';
  static TOKEN_META = 'csrf-token';

  /**
   * Generate CSRF token
   */
  static generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Set CSRF token in meta tag
   */
  static setToken(token) {
    let metaTag = document.querySelector(`meta[name="${this.TOKEN_META}"]`);
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = this.TOKEN_META;
      document.head.appendChild(metaTag);
    }
    metaTag.content = token;

    // Store in session for API calls
    sessionStorage.setItem('csrf_token', token);
  }

  /**
   * Get CSRF token
   */
  static getToken() {
    // First try session storage
    let token = sessionStorage.getItem('csrf_token');
    if (token) return token;

    // Then try meta tag
    const metaTag = document.querySelector(`meta[name="${this.TOKEN_META}"]`);
    if (metaTag) return metaTag.content;

    // Generate new token if none exists
    token = this.generateToken();
    this.setToken(token);
    return token;
  }

  /**
   * Add CSRF token to fetch headers
   */
  static addToHeaders(headers = {}) {
    return {
      ...headers,
      [this.TOKEN_HEADER]: this.getToken(),
    };
  }
}

/**
 * Secure Fetch Wrapper
 */
export class SecureFetch {
  /**
   * Enhanced fetch with security features
   */
  static async fetch(url, options = {}) {
    // Set default security headers
    const secureHeaders = {
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache',
      ...options.headers,
    };

    // Add CSRF token for state-changing requests
    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
      Object.assign(secureHeaders, CSRFProtection.addToHeaders());
    }

    // Validate URL
    try {
      const parsedUrl = new URL(url, window.location.origin);

      // Only allow same-origin or whitelisted domains
      const allowedDomains = [
        window.location.origin,
        'https://api.ganjes.world',
        'https://mainnet.infura.io',
        'https://sepolia.infura.io',
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
      ];

      const isAllowed = allowedDomains.some(domain => parsedUrl.origin === domain || parsedUrl.href.startsWith(domain));

      if (!isAllowed) {
        throw new Error('Request to unauthorized domain');
      }
    } catch (error) {
      throw new Error(`Invalid request URL: ${error.message}`);
    }

    // Set security options
    const secureOptions = {
      ...options,
      headers: secureHeaders,
      credentials: 'same-origin', // Only send cookies to same origin
      mode: 'cors',
      cache: 'no-store', // Don't cache sensitive data
    };

    try {
      // Use the original fetch to avoid infinite recursion
      const originalFetch = window.__originalFetch || fetch;
      const response = await originalFetch(url, secureOptions);
      // Check for security headers in response
      this.validateResponseHeaders(response);

      return response;
    } catch (error) {
      console.error('Secure fetch failed:', error.message);
      throw error;
    }
  }
  /**
   * Convenience method for GET requests
   */
  static async get(url, options = {}) {
    return this.fetch(url, { ...options, method: 'GET' });
  }
  /**
   * Convenience method for POST requests
   */
  static async post(url, options = {}) {
    return this.fetch(url, { ...options, method: 'POST' });
  }

  /**
   * Convenience method for PUT requests
   */
  static async put(url, options = {}) {
    return this.fetch(url, { ...options, method: 'PUT' });
  }

  /**
   * Convenience method for DELETE requests
   */
  static async delete(url, options = {}) {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }

  /**
   * Validate security headers in response
   */
  static validateResponseHeaders(response) {
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
    ];

    const warnings = [];
    securityHeaders.forEach(header => {
      if (!response.headers.get(header)) {
        warnings.push(`Missing security header: ${header}`);
      }
    });

    if (warnings.length > 0) {
      console.warn('Response missing security headers:', warnings);
    }
  }
}

/**
 * Initialize security features
 */
export function initializeSecurity() {
  // Apply client-side security headers
  applyClientSideSecurityHeaders();

  // Initialize CSRF protection
  CSRFProtection.setToken(CSRFProtection.generateToken());

  // Store original fetch for SecureFetch to use, but don't override global fetch
  // This prevents infinite recursion while still allowing SecureFetch to work
  if (typeof window !== 'undefined' && !window.__originalFetch) {
    window.__originalFetch = window.fetch;
  }

  // NOTE: Global fetch override disabled to prevent stack overflow
  // Components should use SecureFetch.fetch directly when needed

  // Set up security event listeners
  setupSecurityEventListeners();
}

/**
 * Security event listeners
 */
function setupSecurityEventListeners() {
  // Detect potential XSS attempts
  window.addEventListener('error', (event) => {
    if (event.error && event.error.stack && event.error.stack.includes('script')) {
      console.warn('Potential XSS attempt detected:', event.error.message);
    }
  });

  // Monitor for suspicious DOM changes
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'SCRIPT') {
              console.warn('Script element added to DOM:', node.src || 'inline script');
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Detect clipboard access attempts
  document.addEventListener('paste', (event) => {
    console.info('Clipboard paste detected');
  });

  // Monitor for potential clickjacking
  if (window.top !== window.self) {
    console.warn('Page loaded in frame - potential clickjacking attempt');
  }
}

export default {
  SECURITY_HEADERS,
  CSP_CONFIG,
  generateCSPHeader,
  applyClientSideSecurityHeaders,
  CSRFProtection,
  SecureFetch,
  initializeSecurity,
};