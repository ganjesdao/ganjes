/**
 * Secure Login Component
 * Enhanced login form with comprehensive security measures
 */

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { InputValidator, SecurityValidator } from '../utils/validation';
import { TokenManager } from '../utils/secureStorage';
import { SecureFetch, CSRFProtection } from '../utils/securityHeaders';
import { toast } from 'react-toastify';

const SecureLogin = ({ userType = 'proposer', redirectPath = '/dashboard' }) => {
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTime, setBlockTime] = useState(0);
  
  // Refs
  const passwordRef = useRef(null);
  const formRef = useRef(null);
  const navigate = useNavigate();
  
  // Constants
  const MAX_LOGIN_ATTEMPTS = 5;
  const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes
  const baseurl = process.env.REACT_APP_BASE_API_URL;

  // Check if user is already authenticated
  useEffect(() => {
    if (TokenManager.isAuthenticated()) {
      navigate(redirectPath);
    }
  }, [navigate, redirectPath]);

  // Check for existing login blocks
  useEffect(() => {
    checkLoginBlock();
  }, []);

  // Block countdown timer
  useEffect(() => {
    let timer;
    if (isBlocked && blockTime > 0) {
      timer = setInterval(() => {
        setBlockTime(prev => {
          if (prev <= 1000) {
            setIsBlocked(false);
            setLoginAttempts(0);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isBlocked, blockTime]);

  /**
   * Check if login is currently blocked
   */
  const checkLoginBlock = () => {
    const blockData = localStorage.getItem(`login_block_${userType}`);
    if (blockData) {
      const { blockedUntil, attempts } = JSON.parse(blockData);
      const now = Date.now();
      
      if (now < blockedUntil) {
        setIsBlocked(true);
        setBlockTime(blockedUntil - now);
        setLoginAttempts(attempts);
      } else {
        // Block expired, clear it
        localStorage.removeItem(`login_block_${userType}`);
        setLoginAttempts(0);
      }
    }
  };

  /**
   * Handle login attempt blocking
   */
  const handleFailedAttempt = () => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const blockedUntil = Date.now() + BLOCK_DURATION;
      localStorage.setItem(`login_block_${userType}`, JSON.stringify({
        blockedUntil,
        attempts: newAttempts
      }));
      
      setIsBlocked(true);
      setBlockTime(BLOCK_DURATION);
      
      toast.error('Too many failed attempts. Please try again in 15 minutes.');
    } else {
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - newAttempts;
      toast.warning(`Invalid credentials. ${remainingAttempts} attempts remaining.`);
    }
  };

  /**
   * Clear login attempts on successful login
   */
  const clearLoginAttempts = () => {
    localStorage.removeItem(`login_block_${userType}`);
    setLoginAttempts(0);
    setIsBlocked(false);
    setBlockTime(0);
  };

  /**
   * Handle input changes with validation
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Check for suspicious patterns
    if (SecurityValidator.hasSuspiciousPatterns(value)) {
      setErrors(prev => ({
        ...prev,
        [name]: 'Input contains invalid characters'
      }));
      return;
    }
    
    // Clear previous errors
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const validation = InputValidator.validateUserLogin(formData);
    
    if (!validation.isValid) {
      const errorObj = {};
      validation.errors.forEach(error => {
        errorObj[error.field] = error.message;
      });
      setErrors(errorObj);
      return false;
    }
    
    setErrors({});
    return true;
  };

  /**
   * Handle secure form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent submission if blocked
    if (isBlocked) {
      toast.error('Login is temporarily blocked. Please wait.');
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Rate limiting check
    if (!SecurityValidator.checkRateLimit(`login_${userType}`, 3, 60000)) {
      toast.error('Too many requests. Please wait a minute.');
      return;
    }

    setIsLoading(true);

    try {
      // Determine endpoint based on user type
      const endpoint = userType === 'investor' ? '/investor/login' : '/proposer/login';
      
      // Prepare request data
      const requestData = {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        userType: userType,
        timestamp: Date.now(),
      };

      // Make secure API call
      const response = await SecureFetch.fetch(`${baseurl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (response.ok && result.status) {
        // Successful login
        clearLoginAttempts();
        
        // Store token securely
        const tokenExpiry = result.expiresIn ? result.expiresIn / 60 : 60; // Convert to minutes
        TokenManager.setAuthToken(result.token, result.refreshToken, tokenExpiry);
        
        // Store user info
        if (result.user) {
          TokenManager.setUserInfo(result.user);
        }
        
        // Clear form
        setFormData({ email: '', password: '' });
        
        // Show success message
        toast.success('Login successful!');
        
        // Redirect after short delay
        setTimeout(() => {
          navigate(redirectPath);
        }, 1000);
        
      } else {
        // Handle different error scenarios
        handleFailedAttempt();
        
        if (result.message) {
          toast.error(result.message);
        } else {
          toast.error('Login failed. Please check your credentials.');
        }
      }
    } catch (error) {
      console.error('Login error:', error.message);
      handleFailedAttempt();
      
      if (error.message.includes('fetch')) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle password visibility toggle
   */
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  /**
   * Format block time remaining
   */
  const formatBlockTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow">
            <Card.Header className="text-center bg-primary text-white">
              <h4 className="mb-0">
                {userType === 'investor' ? 'Investor Login' : 'Proposer Login'}
              </h4>
            </Card.Header>
            <Card.Body>
              {isBlocked && (
                <Alert variant="danger">
                  <strong>Account Temporarily Blocked</strong>
                  <br />
                  Too many failed login attempts. 
                  <br />
                  Time remaining: {formatBlockTime(blockTime)}
                </Alert>
              )}

              {loginAttempts > 0 && !isBlocked && (
                <Alert variant="warning">
                  Warning: {loginAttempts}/{MAX_LOGIN_ATTEMPTS} failed attempts.
                  Account will be blocked after {MAX_LOGIN_ATTEMPTS} failures.
                </Alert>
              )}

              <Form ref={formRef} onSubmit={handleSubmit} noValidate>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    isInvalid={!!errors.email}
                    placeholder="Enter your email"
                    autoComplete="email"
                    disabled={isLoading || isBlocked}
                    maxLength={254}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      isInvalid={!!errors.password}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={isLoading || isBlocked}
                      maxLength={128}
                      required
                    />
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="position-absolute top-50 end-0 translate-middle-y me-2"
                      onClick={togglePasswordVisibility}
                      disabled={isLoading || isBlocked}
                      style={{ border: 'none', background: 'transparent' }}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Button>
                  </div>
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isLoading || isBlocked}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-2"
                        />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </div>
              </Form>

              <div className="text-center mt-3">
                <small className="text-muted">
                  Don't have an account?{' '}
                  <a 
                    href={userType === 'investor' ? '/investor-register' : '/register'}
                    className="text-decoration-none"
                  >
                    Sign up here
                  </a>
                </small>
              </div>

              <div className="text-center mt-2">
                <small className="text-muted">
                  <a href="/forgot-password" className="text-decoration-none">
                    Forgot your password?
                  </a>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SecureLogin;