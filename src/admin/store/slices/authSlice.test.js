/**
 * Auth Slice Tests
 * Testing authentication state management with TDD approach
 */

import authSlice, {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  setPermissions,
  clearError,
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure,
} from './authSlice';

describe('Auth Slice', () => {
  const initialState = {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    permissions: [],
    loading: false,
    error: null,
    lastActivity: null,
  };

  test('should return the initial state', () => {
    expect(authSlice(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('Login Actions', () => {
    test('should handle login start', () => {
      const actual = authSlice(initialState, loginStart());
      expect(actual.loading).toBe(true);
      expect(actual.error).toBe(null);
    });

    test('should handle login success', () => {
      const loginData = {
        user: {
          id: '1',
          email: 'admin@ganjes.io',
          name: 'Admin User',
          role: 'admin',
        },
        token: 'jwt-token',
        refreshToken: 'refresh-token',
        permissions: ['dashboard:view', 'users:manage'],
      };

      const actual = authSlice(
        { ...initialState, loading: true },
        loginSuccess(loginData)
      );

      expect(actual.loading).toBe(false);
      expect(actual.isAuthenticated).toBe(true);
      expect(actual.user).toEqual(loginData.user);
      expect(actual.token).toBe(loginData.token);
      expect(actual.refreshToken).toBe(loginData.refreshToken);
      expect(actual.permissions).toEqual(loginData.permissions);
      expect(actual.error).toBe(null);
      expect(actual.lastActivity).toBeDefined();
    });

    test('should handle login failure', () => {
      const errorMessage = 'Invalid credentials';
      const actual = authSlice(
        { ...initialState, loading: true },
        loginFailure(errorMessage)
      );

      expect(actual.loading).toBe(false);
      expect(actual.isAuthenticated).toBe(false);
      expect(actual.user).toBe(null);
      expect(actual.token).toBe(null);
      expect(actual.error).toBe(errorMessage);
    });
  });

  describe('Logout Actions', () => {
    test('should handle logout', () => {
      const authenticatedState = {
        ...initialState,
        user: { id: '1', email: 'admin@ganjes.io' },
        token: 'jwt-token',
        isAuthenticated: true,
        permissions: ['dashboard:view'],
      };

      const actual = authSlice(authenticatedState, logout());

      expect(actual).toEqual(initialState);
    });
  });

  describe('Permission Management', () => {
    test('should handle set permissions', () => {
      const permissions = ['users:view', 'proposals:manage', 'treasury:view'];
      const actual = authSlice(initialState, setPermissions(permissions));

      expect(actual.permissions).toEqual(permissions);
    });

    test('should handle clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const actual = authSlice(errorState, clearError());

      expect(actual.error).toBe(null);
    });
  });

  describe('Token Refresh Actions', () => {
    test('should handle refresh token start', () => {
      const actual = authSlice(initialState, refreshTokenStart());
      expect(actual.loading).toBe(true);
      expect(actual.error).toBe(null);
    });

    test('should handle refresh token success', () => {
      const newToken = 'new-jwt-token';
      const actual = authSlice(
        { ...initialState, loading: true },
        refreshTokenSuccess(newToken)
      );

      expect(actual.loading).toBe(false);
      expect(actual.token).toBe(newToken);
      expect(actual.lastActivity).toBeDefined();
      expect(actual.error).toBe(null);
    });

    test('should handle refresh token failure', () => {
      const errorMessage = 'Token refresh failed';
      const authenticatedState = {
        ...initialState,
        user: { id: '1' },
        token: 'old-token',
        isAuthenticated: true,
        loading: true,
      };

      const actual = authSlice(
        authenticatedState,
        refreshTokenFailure(errorMessage)
      );

      expect(actual.loading).toBe(false);
      expect(actual.isAuthenticated).toBe(false);
      expect(actual.user).toBe(null);
      expect(actual.token).toBe(null);
      expect(actual.error).toBe(errorMessage);
    });
  });

  describe('State Validation', () => {
    test('should maintain state immutability', () => {
      const state = { ...initialState };
      const newState = authSlice(state, loginStart());
      
      expect(state).not.toBe(newState);
      expect(state.loading).toBe(false);
      expect(newState.loading).toBe(true);
    });

    test('should handle multiple sequential actions', () => {
      let state = authSlice(initialState, loginStart());
      expect(state.loading).toBe(true);

      state = authSlice(state, loginFailure('Error'));
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Error');

      state = authSlice(state, clearError());
      expect(state.error).toBe(null);
    });
  });
});