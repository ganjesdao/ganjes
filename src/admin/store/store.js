/**
 * Admin Redux Store Configuration
 * Centralized state management for admin dashboard
 */

import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import dashboardSlice from './slices/dashboardSlice';
import userManagementSlice from './slices/userManagementSlice';
import proposalManagementSlice from './slices/proposalManagementSlice';
import financialManagementSlice from './slices/financialManagementSlice';
import securitySlice from './slices/securitySlice';

// Define initial state structure
export const getInitialState = () => ({
  auth: {
    user: null,
    token: null,
    isAuthenticated: false,
    permissions: [],
    loading: false,
    error: null,
  },
  dashboard: {
    metrics: {},
    loading: false,
    error: null,
    lastUpdated: null,
  },
  userManagement: {
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
  },
  proposalManagement: {
    proposals: [],
    currentProposal: null,
    filters: {
      status: 'all',
      category: 'all',
      dateRange: null,
    },
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
    },
  },
  financialManagement: {
    treasury: {
      balance: '0',
      allocation: [],
    },
    transactions: [],
    reports: [],
    loading: false,
    error: null,
  },
  security: {
    events: [],
    alerts: [],
    auditLogs: [],
    loading: false,
    error: null,
  },
});

// Configure the admin store
export const adminStore = configureStore({
  reducer: {
    auth: authSlice,
    dashboard: dashboardSlice,
    userManagement: userManagementSlice,
    proposalManagement: proposalManagementSlice,
    financialManagement: financialManagementSlice,
    security: securitySlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['register'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof adminStore.getState>;
export type AppDispatch = typeof adminStore.dispatch;

export default adminStore;