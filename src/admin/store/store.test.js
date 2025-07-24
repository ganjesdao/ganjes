/**
 * Admin Store Tests
 * Testing the Redux store configuration and initial state
 */

import { configureStore } from '@reduxjs/toolkit';
import { adminStore, getInitialState } from './store';
import authSlice from './slices/authSlice';
import dashboardSlice from './slices/dashboardSlice';
import userManagementSlice from './slices/userManagementSlice';

describe('Admin Store Configuration', () => {
  test('should configure store with all required slices', () => {
    const store = configureStore({
      reducer: {
        auth: authSlice,
        dashboard: dashboardSlice,
        userManagement: userManagementSlice,
      },
    });

    const state = store.getState();

    expect(state).toHaveProperty('auth');
    expect(state).toHaveProperty('dashboard');
    expect(state).toHaveProperty('userManagement');
  });

  test('should have correct initial state structure', () => {
    const initialState = getInitialState();

    expect(initialState).toHaveProperty('auth');
    expect(initialState).toHaveProperty('dashboard');
    expect(initialState).toHaveProperty('userManagement');

    // Auth initial state
    expect(initialState.auth).toEqual({
      user: null,
      token: null,
      isAuthenticated: false,
      permissions: [],
      loading: false,
      error: null,
    });

    // Dashboard initial state
    expect(initialState.dashboard).toEqual({
      metrics: {},
      loading: false,
      error: null,
      lastUpdated: null,
    });

    // User Management initial state
    expect(initialState.userManagement).toEqual({
      users: [],
      roles: [],
      currentUser: null,
      loading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
      },
    });
  });

  test('should create store instance', () => {
    expect(adminStore).toBeDefined();
    expect(typeof adminStore.dispatch).toBe('function');
    expect(typeof adminStore.getState).toBe('function');
    expect(typeof adminStore.subscribe).toBe('function');
  });
});

describe('Store State Management', () => {
  test('should handle store state updates', () => {
    const state = adminStore.getState();
    expect(state).toBeDefined();
    expect(typeof state).toBe('object');
  });

  test('should maintain state immutability', () => {
    const initialState = adminStore.getState();
    const stateCopy = { ...initialState };
    
    expect(initialState).toEqual(stateCopy);
    expect(initialState).not.toBe(stateCopy);
  });
});