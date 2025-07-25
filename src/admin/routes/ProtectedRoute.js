/**
 * Protected Route Component
 * Ensures user is authenticated before accessing admin routes
 */

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { TokenManager } from '../../utils/secureStorage';
import { loginSuccess } from '../store/slices/authSlice';
import { selectIsAuthenticated, selectAuthLoading } from '../store/slices/authSlice';

// Loading component
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '100vh',
    flexDirection: 'column'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <p style={{ marginTop: '16px', color: '#666' }}>Loading admin panel...</p>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user has stored auth token
        const storedToken = TokenManager.getAuthToken();
        const storedUser = TokenManager.getUserInfo();
        
        if (storedToken && storedUser) {
          // Restore user session from stored data
          dispatch(loginSuccess({
            user: storedUser,
            token: storedToken,
            refreshToken: TokenManager.getRefreshToken() || storedToken,
            permissions: storedUser.permissions || ['admin']
          }));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        TokenManager.logout();
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Show loading spinner while initializing or during auth operations
  if (isInitializing || loading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/admin/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Render protected content
  return children;
};

export default ProtectedRoute;