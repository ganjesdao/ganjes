import React, { useEffect } from 'react';

function Auth({ onProfileDataFetched }) {
  const baseurl = process.env.REACT_APP_BASE_API_URL;

  // Function to clear local data and redirect to Signin
  const handleLogout = () => {
    sessionStorage.removeItem('authToken'); // Ensure token is removed
    localStorage.clear();
    window.location.href = "/signin";
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      const authToken = sessionStorage.getItem('authToken');

      if (!authToken) {
        handleLogout();
        return;
      }

      try {
        const response = await fetch(`${baseurl}/investor/profile`, {
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
