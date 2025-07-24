/**
 * Input Validation and Sanitization Utilities
 * Comprehensive validation for all user inputs with security focus
 */

import Joi from 'joi';
import DOMPurify from 'dompurify';
import { ethers } from 'ethers';

/**
 * Validation Schemas
 */
export const ValidationSchemas = {
  // User authentication schemas
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .min(3)
    .max(254)
    .lowercase()
    .trim()
    .required(),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters'
    }),

  name: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .trim()
    .required()
    .messages({
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes'
    }),

  // Blockchain-related schemas
  ethereumAddress: Joi.string()
    .pattern(/^0x[a-fA-F0-9]{40}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid Ethereum address format'
    }),

  tokenAmount: Joi.string()
    .pattern(/^\d+(\.\d{1,18})?$/)
    .custom((value, helpers) => {
      try {
        const parsed = ethers.parseEther(value);
        if (parsed < 0) {
          return helpers.error('any.invalid');
        }
        return value;
      } catch (error) {
        return helpers.error('any.invalid');
      }
    })
    .required()
    .messages({
      'any.invalid': 'Invalid token amount format'
    }),

  // Proposal schemas
  proposalDescription: Joi.string()
    .min(10)
    .max(1000)
    .trim()
    .required()
    .custom((value) => {
      // Additional XSS protection
      const cleaned = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
      if (cleaned !== value) {
        throw new Error('Description contains invalid characters');
      }
      return cleaned;
    }),

  proposalTitle: Joi.string()
    .min(3)
    .max(100)
    .trim()
    .required()
    .custom((value) => {
      const cleaned = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
      if (cleaned !== value) {
        throw new Error('Title contains invalid characters');
      }
      return cleaned;
    }),

  projectUrl: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(500)
    .optional()
    .allow(''),

  // Numeric validation
  proposalId: Joi.number()
    .integer()
    .min(1)
    .max(999999999)
    .required(),

  voteSupport: Joi.boolean().required(),

  investmentAmount: Joi.string()
    .pattern(/^\d+(\.\d{1,18})?$/)
    .custom((value, helpers) => {
      try {
        const parsed = ethers.parseEther(value);
        if (parsed <= 0) {
          return helpers.error('any.invalid');
        }
        return value;
      } catch (error) {
        return helpers.error('any.invalid');
      }
    })
    .required(),
};

/**
 * Sanitization Functions
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS
   * @param {string} html - HTML content to sanitize
   * @param {object} options - DOMPurify options
   * @returns {string} Sanitized HTML
   */
  static sanitizeHtml(html, options = {}) {
    if (typeof html !== 'string') {
      return '';
    }

    const defaultOptions = {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
      FORBID_SCRIPTS: true,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
      ...options
    };

    return DOMPurify.sanitize(html, defaultOptions);
  }

  /**
   * Sanitize plain text to prevent injection
   * @param {string} text - Text to sanitize
   * @returns {string} Sanitized text
   */
  static sanitizeText(text) {
    if (typeof text !== 'string') {
      return '';
    }

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Sanitize URL to prevent malicious redirects
   * @param {string} url - URL to sanitize
   * @returns {string|null} Sanitized URL or null if invalid
   */
  static sanitizeUrl(url) {
    if (typeof url !== 'string') {
      return null;
    }

    try {
      const parsed = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      // Block common malicious patterns
      const maliciousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i,
        /ftp:/i
      ];

      if (maliciousPatterns.some(pattern => pattern.test(url))) {
        return null;
      }

      return parsed.href;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sanitize Ethereum address
   * @param {string} address - Ethereum address
   * @returns {string|null} Sanitized address or null if invalid
   */
  static sanitizeEthereumAddress(address) {
    if (typeof address !== 'string') {
      return null;
    }

    // Remove whitespace and convert to lowercase
    const cleaned = address.trim().toLowerCase();

    // Validate format
    if (!/^0x[a-f0-9]{40}$/.test(cleaned)) {
      return null;
    }

    return cleaned;
  }
}

/**
 * Validation Functions
 */
export class InputValidator {
  /**
   * Validate input against schema
   * @param {any} input - Input to validate
   * @param {Joi.Schema} schema - Joi schema
   * @returns {object} Validation result
   */
  static validate(input, schema) {
    const result = schema.validate(input, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    return {
      isValid: !result.error,
      value: result.value,
      errors: result.error ? result.error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      })) : []
    };
  }

  /**
   * Validate user registration data
   * @param {object} userData - User data to validate
   * @returns {object} Validation result
   */
  static validateUserRegistration(userData) {
    const schema = Joi.object({
      email: ValidationSchemas.email,
      password: ValidationSchemas.password,
      confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Password confirmation does not match'
      }),
      name: ValidationSchemas.name,
      terms: Joi.boolean().valid(true).required().messages({
        'any.only': 'You must accept the terms and conditions'
      })
    });

    return this.validate(userData, schema);
  }

  /**
   * Validate user login data
   * @param {object} loginData - Login data to validate
   * @returns {object} Validation result
   */
  static validateUserLogin(loginData) {
    const schema = Joi.object({
      email: ValidationSchemas.email,
      password: Joi.string().min(1).required() // Less strict for login
    });

    return this.validate(loginData, schema);
  }

  /**
   * Validate proposal creation data
   * @param {object} proposalData - Proposal data to validate
   * @returns {object} Validation result
   */
  static validateProposalCreation(proposalData) {
    const schema = Joi.object({
      title: ValidationSchemas.proposalTitle,
      description: ValidationSchemas.proposalDescription,
      fundingGoal: ValidationSchemas.tokenAmount,
      projectUrl: ValidationSchemas.projectUrl
    });

    return this.validate(proposalData, schema);
  }

  /**
   * Validate voting data
   * @param {object} voteData - Vote data to validate
   * @returns {object} Validation result
   */
  static validateVoteData(voteData) {
    const schema = Joi.object({
      proposalId: ValidationSchemas.proposalId,
      support: ValidationSchemas.voteSupport,
      investmentAmount: ValidationSchemas.investmentAmount
    });

    return this.validate(voteData, schema);
  }

  /**
   * Validate Ethereum transaction data
   * @param {object} txData - Transaction data to validate
   * @returns {object} Validation result
   */
  static validateTransactionData(txData) {
    const schema = Joi.object({
      to: ValidationSchemas.ethereumAddress,
      value: ValidationSchemas.tokenAmount.optional(),
      gasLimit: Joi.number().integer().min(21000).max(10000000).optional(),
      gasPrice: ValidationSchemas.tokenAmount.optional()
    });

    return this.validate(txData, schema);
  }

  /**
   * Batch validate multiple inputs
   * @param {object} inputs - Object with key-value pairs to validate
   * @param {object} schemas - Object with corresponding schemas
   * @returns {object} Combined validation result
   */
  static batchValidate(inputs, schemas) {
    const results = {};
    let isValid = true;
    const allErrors = [];

    for (const [key, value] of Object.entries(inputs)) {
      if (schemas[key]) {
        const result = this.validate(value, schemas[key]);
        results[key] = result;
        
        if (!result.isValid) {
          isValid = false;
          allErrors.push(...result.errors.map(err => ({ ...err, field: `${key}.${err.field}` })));
        }
      }
    }

    return {
      isValid,
      results,
      errors: allErrors
    };
  }
}

/**
 * Security Validation Utilities
 */
export class SecurityValidator {
  /**
   * Check for common injection patterns
   * @param {string} input - Input to check
   * @returns {boolean} True if suspicious patterns found
   */
  static hasSuspiciousPatterns(input) {
    if (typeof input !== 'string') {
      return false;
    }

    const suspiciousPatterns = [
      // SQL injection patterns
      /(\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bunion\b)/i,
      // XSS patterns
      /<script[^>]*>|<\/script>|javascript:|data:text\/html|vbscript:/i,
      // Command injection patterns
      /(\||&|;|\$\(|\`)/,
      // Path traversal
      /\.\.[\/\\]/,
      // NoSQL injection
      /\$where|\$ne|\$regex/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate file upload security
   * @param {File} file - File to validate
   * @param {object} options - Validation options
   * @returns {object} Validation result
   */
  static validateFileUpload(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
    } = options;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`);
    }

    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension ${extension} not allowed`);
    }

    // Check for suspicious file names
    if (this.hasSuspiciousPatterns(file.name)) {
      errors.push('File name contains suspicious characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Rate limiting check (client-side)
   * @param {string} key - Unique key for the action
   * @param {number} limit - Number of attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {boolean} True if action is allowed
   */
  static checkRateLimit(key, limit = 5, windowMs = 60000) {
    const now = Date.now();
    const storageKey = `rate_limit_${key}`;
    
    try {
      const stored = localStorage.getItem(storageKey);
      const data = stored ? JSON.parse(stored) : { count: 0, resetTime: now + windowMs };

      // Reset if window has passed
      if (now > data.resetTime) {
        data.count = 0;
        data.resetTime = now + windowMs;
      }

      // Check if limit exceeded
      if (data.count >= limit) {
        return false;
      }

      // Increment counter
      data.count++;
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      return true;
    } catch (error) {
      // If storage fails, allow the action
      console.warn('Rate limiting check failed:', error.message);
      return true;
    }
  }
}

export default {
  ValidationSchemas,
  InputSanitizer,
  InputValidator,
  SecurityValidator
};