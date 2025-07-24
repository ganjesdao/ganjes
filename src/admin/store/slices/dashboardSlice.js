/**
 * Dashboard Slice
 * Redux slice for dashboard state management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SecureFetch } from '../../../utils/securityHeaders';

// Initial state
const initialState = {
  metrics: {
    totalUsers: 0,
    activeProposals: 0,
    treasuryBalance: '0',
    monthlyGrowth: 0,
  },
  systemHealth: null,
  recentActivities: [],
  alerts: [],
  filters: {
    timeRange: '24h',
    category: 'all',
  },
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchDashboardMetrics = createAsyncThunk(
  'dashboard/fetchMetrics',
  async (filters = {}, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const queryParams = new URLSearchParams({
        timeRange: filters.timeRange || '24h',
        category: filters.category || 'all',
        ...filters,
      });

      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/dashboard/overview?${queryParams}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to fetch dashboard metrics');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const fetchDetailedMetrics = createAsyncThunk(
  'dashboard/fetchDetailedMetrics',
  async ({ timeRange, metrics }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/dashboard/metrics`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timeRange,
            metrics,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to fetch detailed metrics');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// Dashboard slice
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    fetchMetricsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchMetricsSuccess: (state, action) => {
      state.loading = false;
      state.metrics = action.payload.metrics || state.metrics;
      state.systemHealth = action.payload.systemHealth || state.systemHealth;
      state.recentActivities = action.payload.recentActivities || state.recentActivities;
      state.alerts = action.payload.alerts || state.alerts;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
    },
    fetchMetricsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateMetric: (state, action) => {
      const { key, value } = action.payload;
      if (state.metrics.hasOwnProperty(key)) {
        state.metrics[key] = value;
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateMetrics: (state, action) => {
      state.metrics = { ...state.metrics, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    updateSystemHealth: (state, action) => {
      state.systemHealth = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    addRecentActivity: (state, action) => {
      state.recentActivities = [action.payload, ...state.recentActivities.slice(0, 9)];
      state.lastUpdated = new Date().toISOString();
    },
    updateRecentActivities: (state, action) => {
      state.recentActivities = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    addAlert: (state, action) => {
      state.alerts = [action.payload, ...state.alerts];
      state.lastUpdated = new Date().toISOString();
    },
    removeAlert: (state, action) => {
      state.alerts = state.alerts.filter(alert => alert.id !== action.payload);
      state.lastUpdated = new Date().toISOString();
    },
    updateAlerts: (state, action) => {
      state.alerts = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    resetDashboard: (state) => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch dashboard metrics
      .addCase(fetchDashboardMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.metrics = action.payload.keyMetrics || state.metrics;
        state.systemHealth = action.payload.systemHealth || state.systemHealth;
        state.recentActivities = action.payload.recentActivities || state.recentActivities;
        state.alerts = action.payload.alerts || state.alerts;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch detailed metrics
      .addCase(fetchDetailedMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDetailedMetrics.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.metrics) {
          state.metrics = { ...state.metrics, ...action.payload.metrics };
        }
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDetailedMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  fetchMetricsStart,
  fetchMetricsSuccess,
  fetchMetricsFailure,
  updateMetric,
  updateMetrics,
  updateSystemHealth,
  addRecentActivity,
  updateRecentActivities,
  addAlert,
  removeAlert,
  updateAlerts,
  setFilters,
  clearError,
  resetDashboard,
} = dashboardSlice.actions;

// Selectors
export const selectDashboard = (state) => state.dashboard;
export const selectDashboardMetrics = (state) => state.dashboard.metrics;
export const selectSystemHealth = (state) => state.dashboard.systemHealth;
export const selectRecentActivities = (state) => state.dashboard.recentActivities;
export const selectAlerts = (state) => state.dashboard.alerts;
export const selectDashboardFilters = (state) => state.dashboard.filters;
export const selectDashboardLoading = (state) => state.dashboard.loading;
export const selectDashboardError = (state) => state.dashboard.error;
export const selectLastUpdated = (state) => state.dashboard.lastUpdated;

// Computed selectors
export const selectCriticalAlerts = (state) => 
  state.dashboard.alerts.filter(alert => alert.severity === 'critical');

export const selectHealthStatus = (state) => {
  const health = state.dashboard.systemHealth;
  if (!health) return 'unknown';
  
  if (health.uptime >= 99.9 && health.responseTime <= 500) return 'healthy';
  if (health.uptime >= 99.5 && health.responseTime <= 1000) return 'warning';
  return 'critical';
};

export const selectMetricTrend = (metricKey) => (state) => {
  // This would be enhanced with historical data
  const currentValue = state.dashboard.metrics[metricKey];
  return {
    current: currentValue,
    trend: 'neutral', // This would be calculated from historical data
    change: 0,
  };
};

export default dashboardSlice.reducer;