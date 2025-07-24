/**
 * Secure Storage Utility
 * Provides secure alternatives to localStorage/sessionStorage
 * with encryption and proper security practices
 */

import CryptoJS from 'crypto-js';

// Generate a secure key based on browser fingerprinting and session data
const generateSecureKey = () => {
  const browserInfo = {
    userAgent: navigator.userAgent.substring(0, 50), // Truncated for security
    language: navigator.language,
    platform: navigator.platform,
    timestamp: Date.now().toString(36), // Add time component
  };
  
  // Create a hash-based key (not for production - use proper key management)
  const keyMaterial = JSON.stringify(browserInfo);
  return CryptoJS.SHA256(keyMaterial).toString();
};

class SecureStorage {
  constructor() {
    this.key = generateSecureKey();
    this.prefix = 'gnjs_secure_';
  }

  /**
   * Encrypt and store sensitive data
   * @param {string} key - Storage key
   * @param {any} value - Data to store
   * @param {number} expiryMinutes - Expiry time in minutes (default: 60)
   */
  setItem(key, value, expiryMinutes = 60) {
    try {
      const now = new Date();
      const expiryTime = now.getTime() + (expiryMinutes * 60 * 1000);
      
      const dataToStore = {
        value: value,
        expiry: expiryTime,
        timestamp: now.getTime()
      };

      // Encrypt the data
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(dataToStore), 
        this.key
      ).toString();

      // Store with prefix to avoid conflicts
      sessionStorage.setItem(this.prefix + key, encrypted);
      
      return true;
    } catch (error) {
      console.warn('SecureStorage: Failed to store data', error.message);
      return false;
    }
  }

  /**
   * Retrieve and decrypt sensitive data
   * @param {string} key - Storage key
   * @returns {any|null} Decrypted data or null if not found/expired
   */
  getItem(key) {
    try {
      const encrypted = sessionStorage.getItem(this.prefix + key);
      
      if (!encrypted) {
        return null;
      }

      // Decrypt the data
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.key);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        // Decryption failed - possibly tampered data
        this.removeItem(key);
        return null;
      }

      const dataObject = JSON.parse(decryptedString);
      
      // Check if data has expired
      const now = new Date().getTime();
      if (now > dataObject.expiry) {
        this.removeItem(key);
        return null;
      }

      return dataObject.value;
    } catch (error) {
      console.warn('SecureStorage: Failed to retrieve data', error.message);
      this.removeItem(key); // Remove corrupted data
      return null;
    }
  }

  /**
   * Remove item from secure storage
   * @param {string} key - Storage key
   */
  removeItem(key) {
    try {
      sessionStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('SecureStorage: Failed to remove data', error.message);
    }
  }

  /**
   * Clear all secure storage items
   */
  clear() {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('SecureStorage: Failed to clear storage', error.message);
    }
  }

  /**
   * Check if an item exists and is not expired
   * @param {string} key - Storage key
   * @returns {boolean}
   */
  hasItem(key) {
    return this.getItem(key) !== null;
  }

  /**
   * Refresh item expiry without changing the value
   * @param {string} key - Storage key
   * @param {number} expiryMinutes - New expiry time in minutes
   */
  refreshExpiry(key, expiryMinutes = 60) {
    const value = this.getItem(key);
    if (value !== null) {
      this.setItem(key, value, expiryMinutes);
    }
  }
}

// Create and export singleton instance
const secureStorage = new SecureStorage();

export default secureStorage;

/**
 * Token Management Utilities
 * Specific utilities for managing authentication tokens securely
 */
export class TokenManager {
  static TOKEN_KEY = 'auth_token';
  static REFRESH_TOKEN_KEY = 'refresh_token';
  static USER_INFO_KEY = 'user_info';

  /**
   * Store authentication token securely
   * @param {string} token - JWT token
   * @param {string} refreshToken - Refresh token (optional)
   * @param {number} expiryMinutes - Token expiry in minutes
   */
  static setAuthToken(token, refreshToken = null, expiryMinutes = 60) {
    const success = secureStorage.setItem(this.TOKEN_KEY, token, expiryMinutes);
    
    if (refreshToken) {
      secureStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken, expiryMinutes * 2);
    }
    
    return success;
  }

  /**
   * Get authentication token
   * @returns {string|null} Token or null if not found/expired
   */
  static getAuthToken() {
    return secureStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get refresh token
   * @returns {string|null} Refresh token or null if not found/expired
   */
  static getRefreshToken() {
    return secureStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Store user information securely
   * @param {object} userInfo - User profile data
   */
  static setUserInfo(userInfo) {
    // Remove sensitive fields before storing
    const sanitizedUserInfo = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      role: userInfo.role,
      // Don't store sensitive data like passwords, tokens, etc.
    };
    
    return secureStorage.setItem(this.USER_INFO_KEY, sanitizedUserInfo, 120); // 2 hours
  }

  /**
   * Get user information
   * @returns {object|null} User info or null
   */
  static getUserInfo() {
    return secureStorage.getItem(this.USER_INFO_KEY);
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  static isAuthenticated() {
    return this.getAuthToken() !== null;
  }

  /**
   * Clear all authentication data
   */
  static logout() {
    secureStorage.removeItem(this.TOKEN_KEY);
    secureStorage.removeItem(this.REFRESH_TOKEN_KEY);
    secureStorage.removeItem(this.USER_INFO_KEY);
    
    // Clear any other authentication-related data
    secureStorage.clear();
  }

  /**
   * Refresh authentication token expiry
   * @param {number} expiryMinutes - New expiry time
   */
  static refreshTokenExpiry(expiryMinutes = 60) {
    secureStorage.refreshExpiry(this.TOKEN_KEY, expiryMinutes);
  }
}

/**
 * Security Headers and CSP Utilities
 */
export class SecurityUtils {
  /**
   * Validate token format (basic JWT validation)
   * @param {string} token - Token to validate
   * @returns {boolean} Whether token format is valid
   */
  static isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Basic JWT format check (3 parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // Check if each part is base64-like
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return parts.every(part => base64Regex.test(part));
  }

  /**
   * Sanitize string to prevent XSS
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  static sanitizeString(str) {
    if (typeof str !== 'string') {
      return '';
    }
    
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Generate CSRF token
   * @returns {string} CSRF token
   */
  static generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}