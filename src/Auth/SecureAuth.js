import React, { useEffect, useCallback, useRef } from 'react';
import { TokenManager, SecurityUtils } from '../utils/secureStorage';
import Joi from 'joi';

// Validation schema for API responses
const profileResponseSchema = Joi.object({
  status: Joi.boolean().required(),
  user: Joi.object({
    id: Joi.number().required(),
    email: Joi.string().email().required(),
    name: Joi.string().min(1).max(100).required(),
    role: Joi.string().valid('user', 'admin', 'proposer', 'investor').required(),
  }).when('status', { is: true, then: Joi.required() }),
  message: Joi.string().optional(),
});

function SecureAuth({ onProfileDataFetched, onAuthError }) {
  const baseurl = process.env.REACT_APP_BASE_API_URL;
  const retryAttempts = useRef(0);
  const maxRetries = 3;
  const authCheckInterval = useRef(null);

  // Secure logout function with proper cleanup
  const handleSecureLogout = useCallback((reason = 'session_expired') => {
    try {
      // Clear all authentication data
      TokenManager.logout();
      
      // Clear any sensitive data from memory
      if (authCheckInterval.current) {
        clearInterval(authCheckInterval.current);
        authCheckInterval.current = null;
      }
      
      // Reset retry counter
      retryAttempts.current = 0;
      
      // Log security event (without sensitive data)
      console.info(`User logged out: ${reason}`);
      
      // Notify parent component
      if (onAuthError) {
        onAuthError({ type: 'logout', reason });
      }
      
      // Redirect to sign-in page
      window.location.href = "/signin";
    } catch (error) {
      console.error('Error during secure logout:', error.message);
      // Force redirect even if cleanup fails
      window.location.href = "/signin";
    }
  }, [onAuthError]);

  // Fetch profile data with enhanced security
  const fetchProfileData = useCallback(async () => {
    const authToken = TokenManager.getAuthToken();

    if (!authToken) {
      handleSecureLogout('no_token');
      return;
    }

    // Validate token format before making request
    if (!SecurityUtils.isValidTokenFormat(authToken)) {
      handleSecureLogout('invalid_token_format');
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${baseurl}/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
        credentials: 'same-origin', // Enhanced security
      });

      clearTimeout(timeoutId);

      // Handle different response status codes
      switch (response.status) {
        case 429:
          console.warn("Rate limit exceeded - retrying after delay");
          setTimeout(() => {
            if (retryAttempts.current < maxRetries) {
              retryAttempts.current++;
              fetchProfileData();
            } else {
              handleSecureLogout('rate_limit_exceeded');
            }
          }, 5000); // Wait 5 seconds before retry
          return;

        case 401:
          handleSecureLogout('unauthorized');
          return;

        case 403:
          handleSecureLogout('forbidden');
          return;

        case 500:
        case 502:
        case 503:
          if (retryAttempts.current < maxRetries) {
            retryAttempts.current++;
            setTimeout(() => fetchProfileData(), 2000 * retryAttempts.current);
            return;
          }
          handleSecureLogout('server_error');
          return;

        default:
          if (!response.ok) {
            handleSecureLogout('response_error');
            return;
          }
      }

      const result = await response.json();

      // Validate response structure
      const validation = profileResponseSchema.validate(result);
      if (validation.error) {
        console.error('Invalid response format:', validation.error.message);
        handleSecureLogout('invalid_response');
        return;
      }

      if (result.status) {
        // Reset retry counter on success
        retryAttempts.current = 0;
        
        // Store user info securely
        TokenManager.setUserInfo(result.user);
        
        // Refresh token expiry
        TokenManager.refreshTokenExpiry(60); // Extend for 1 hour
        
        // Sanitize data before passing to parent
        const sanitizedResult = {
          ...result,
          user: {
            id: result.user.id,
            email: SecurityUtils.sanitizeString(result.user.email),
            name: SecurityUtils.sanitizeString(result.user.name),
            role: result.user.role,
          }
        };
        
        if (onProfileDataFetched) {
          onProfileDataFetched(sanitizedResult);
        }
      } else {
        handleSecureLogout('profile_verification_failed');
      }
    } catch (error) {
      // Handle different types of errors securely
      if (error.name === 'AbortError') {
        console.warn('Request timeout - retrying...');
        if (retryAttempts.current < maxRetries) {
          retryAttempts.current++;
          setTimeout(() => fetchProfileData(), 1000);
        } else {
          handleSecureLogout('request_timeout');
        }
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        // Network error
        if (retryAttempts.current < maxRetries) {
          retryAttempts.current++;
          setTimeout(() => fetchProfileData(), 3000);
        } else {
          handleSecureLogout('network_error');
        }
      } else {
        // Log error without sensitive information
        console.error('Authentication error:', error.message);
        handleSecureLogout('auth_error');
      }
    }
  }, [baseurl, handleSecureLogout, onProfileDataFetched]);

  // Set up periodic token validation
  const setupTokenValidation = useCallback(() => {
    // Check token validity every 5 minutes
    authCheckInterval.current = setInterval(() => {
      if (!TokenManager.isAuthenticated()) {
        handleSecureLogout('token_expired');
      }
    }, 5 * 60 * 1000); // 5 minutes
  }, [handleSecureLogout]);

  // Enhanced useEffect with proper cleanup
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (isMounted) {
        await fetchProfileData();
        setupTokenValidation();
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      isMounted = false;
      if (authCheckInterval.current) {
        clearInterval(authCheckInterval.current);
        authCheckInterval.current = null;
      }
    };
  }, [fetchProfileData, setupTokenValidation]);

  // Handle page visibility changes for security
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - could implement additional security measures
        return;
      }
      
      // Page is visible - verify token is still valid
      if (!TokenManager.isAuthenticated()) {
        handleSecureLogout('session_invalid');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleSecureLogout]);

  // Handle browser storage events (detect token tampering)
  useEffect(() => {
    const handleStorageChange = (event) => {
      // Check if our secure storage was tampered with
      if (event.key && event.key.startsWith('gnjs_secure_')) {
        if (!TokenManager.isAuthenticated()) {
          handleSecureLogout('token_tampered');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleSecureLogout]);

  // Component doesn't render anything (null component)
  return null;
}

export default SecureAuth;