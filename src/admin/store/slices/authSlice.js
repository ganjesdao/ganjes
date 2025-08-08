/**
 * Auth Slice
 * Redux slice for authentication state management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TokenManager } from '../../../utils/secureStorage';
import { SecureFetch } from '../../../utils/securityHeaders';

// Function to get initial state from storage
const getInitialState = () => {
  try {
    const token = TokenManager.getAuthToken();
    const user = TokenManager.getUserInfo();

    if (token && user) {
      return {
        user: user,
        token: token,
        refreshToken: token, // Using same token as refresh for simplicity
        isAuthenticated: true,
        permissions: ['admin'],
        loading: false,
        error: null,
        lastActivity: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn('Failed to restore auth from storage:', error);
  }

  return {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    permissions: [],
    loading: false,
    error: null,
    lastActivity: null,
  };
};

// Initial state
const initialState = getInitialState();

// Async thunks for API calls
export const loginAsync = createAsyncThunk(
  'admin/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await SecureFetch.post(
        `${process.env.REACT_APP_BASE_API_URL}/admin/login`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status) {
        localStorage.setItem('token', data.token);
        return rejectWithValue(data.message || 'Login failed');
      }

      // Extract user info from token (you may want to decode JWT or get from separate endpoint)
      const user = {
        id: null, // Will be populated from token or separate API call
        email: email, // Use the email from login form
        name: 'Admin User', // Default name, can be updated later
      };

      // Store tokens securely (using token as both auth and refresh token for now)
      TokenManager.setAuthToken(data.token, data.token, 60);
      TokenManager.setUserInfo(user);

      return {
        user: user,
        token: data.token,
        refreshToken: data.token, // Use same token as refresh token
        permissions: ['admin'], // Default admin permissions
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const refreshTokenAsync = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      const refreshToken = auth.refreshToken || TokenManager.getRefreshToken();

      if (!refreshToken) {
        return rejectWithValue('No refresh token available');
      }

      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/auth/refresh`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Token refresh failed');
      }

      // Update stored token
      TokenManager.setAuthToken(data.token, refreshToken, 60);

      return data.token;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    try {
      const { auth } = getState();

      if (auth.refreshToken) {
        await SecureFetch.fetch(
          `${process.env.REACT_APP_BASE_API_URL}/admin/logout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${auth.token}`,
            },
            body: JSON.stringify({ refreshToken: auth.refreshToken }),
          }
        );
      }
    } catch (error) {
      console.warn('Logout API call failed:', error.message);
    } finally {
      // Always clear local storage
      TokenManager.logout();
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.permissions = action.payload.permissions;
      state.error = null;
      state.lastActivity = new Date().toISOString();
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.permissions = [];
      state.error = action.payload;
    },
    logout: (state) => {
      return { ...initialState };
    },
    setPermissions: (state, action) => {
      state.permissions = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    refreshTokenStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    refreshTokenSuccess: (state, action) => {
      state.loading = false;
      state.token = action.payload;
      state.lastActivity = new Date().toISOString();
      state.error = null;
    },
    refreshTokenFailure: (state, action) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.permissions = [];
      state.error = action.payload;
    },
    updateLastActivity: (state) => {
      state.lastActivity = new Date().toISOString();
    },
    restoreAuthFromStorage: (state) => {
      try {
        const token = TokenManager.getAuthToken();
        const user = TokenManager.getUserInfo();

        if (token && user) {
          state.user = user;
          state.token = token;
          state.refreshToken = token;
          state.isAuthenticated = true;
          state.permissions = ['admin'];
          state.error = null;
          state.lastActivity = new Date().toISOString();
        } else {
          // No valid session found, clear state
          state.user = null;
          state.token = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
          state.permissions = [];
          state.error = null;
        }
      } catch (error) {
        console.warn('Failed to restore auth from storage:', error);
        // Clear state on error
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.permissions = [];
        state.error = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login async actions
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.permissions = action.payload.permissions;
        state.error = null;
        state.lastActivity = new Date().toISOString();
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.permissions = [];
        state.error = action.payload;
      })
      // Refresh token async actions
      .addCase(refreshTokenAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshTokenAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload;
        state.lastActivity = new Date().toISOString();
        state.error = null;
      })
      .addCase(refreshTokenAsync.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.permissions = [];
        state.error = action.payload;
      })
      // Logout async actions
      .addCase(logoutAsync.fulfilled, (state) => {
        return { ...initialState };
      });
  },
});

// Export actions
export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  setPermissions,
  clearError,
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure,
  updateLastActivity,
  restoreAuthFromStorage,
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectPermissions = (state) => state.auth.permissions;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;

// Permission checking selector
export const selectHasPermission = (permission) => (state) => {
  return state.auth.permissions.includes(permission);
};

export const selectHasAnyPermission = (permissions) => (state) => {
  return permissions.some(permission =>
    state.auth.permissions.includes(permission)
  );
};

export const selectHasAllPermissions = (permissions) => (state) => {
  return permissions.every(permission =>
    state.auth.permissions.includes(permission)
  );
};

export default authSlice.reducer;