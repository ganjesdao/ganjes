/**
 * Test script to verify admin login functionality
 * Run this to test the authentication flow with the API response format
 */

import { TokenManager } from '../utils/secureStorage';

// Simulate the API response you provided
const mockApiResponse = {
  "token": "1616|kMaEzFLSqBSUrbq0Otz8q31Qfb0BpW27xaCimHIb",
  "message": "Login Successfully", 
  "status": true
};

// Test the token storage and retrieval
function testTokenManagement() {
  console.log('Testing token management...');
  
  // Test storing the token
  const success = TokenManager.setAuthToken(mockApiResponse.token, mockApiResponse.token, 60);
  console.log('Token stored successfully:', success);
  
  // Test retrieving the token
  const retrievedToken = TokenManager.getAuthToken();
  console.log('Retrieved token:', retrievedToken);
  console.log('Tokens match:', retrievedToken === mockApiResponse.token);
  
  // Test authentication check
  const isAuth = TokenManager.isAuthenticated();
  console.log('Is authenticated:', isAuth);
  
  // Test user info storage
  const testUser = {
    id: null,
    email: 'admin@ganjes.io',
    name: 'Admin User'
  };
  
  TokenManager.setUserInfo(testUser);
  const retrievedUser = TokenManager.getUserInfo();
  console.log('User info stored and retrieved:', retrievedUser);
  
  // Cleanup
  TokenManager.logout();
  console.log('After logout - is authenticated:', TokenManager.isAuthenticated());
}

// Run the test
testTokenManagement();