import React, { useEffect } from 'react';
import { TokenManager } from '../utils/secureStorage';

function Auth({ onProfileDataFetched, onAuthError }) {
  const baseurl = process.env.REACT_APP_BASE_API_URL;

  // Function to clear local data and redirect to Signin
  const handleLogout = () => {
    TokenManager.logout(); // Use secure logout
    window.location.href = "/signin";
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      const authToken = TokenManager.getAuthToken(); // Use secure token retrieval

      if (!authToken) {
        handleLogout();
        return;
      }

      try {
        const response = await fetch(`${baseurl}/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.status === 429) {
          console.warn("Rate limit exceeded.");
          return;
        }

        if (!response.ok) {
          handleLogout();
          return;
        }

        const result = await response.json();

        if (result.status) {
          // Store user info securely and extend token expiry
          TokenManager.setUserInfo(result.user);
          TokenManager.refreshTokenExpiry(60);
          onProfileDataFetched(result);
        } else {
          handleLogout();
        }
      } catch (error) {
        console.error('Fetch error:', error);
        handleLogout();
      }
    };

    fetchProfileData();
  }, []); // Empty array ensures that useEffect only runs once, preventing the infinite loop.

  return null;
}

export default Auth;
