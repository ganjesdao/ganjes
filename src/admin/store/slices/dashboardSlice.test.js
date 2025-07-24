/**
 * Dashboard Slice Tests
 * Testing dashboard state management with TDD approach
 */

import dashboardSlice, {
  fetchMetricsStart,
  fetchMetricsSuccess,
  fetchMetricsFailure,
  updateMetric,
  clearError,
  setFilters,
  resetDashboard,
} from './dashboardSlice';

describe('Dashboard Slice', () => {
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

  test('should return the initial state', () => {
    expect(dashboardSlice(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('Metrics Fetching', () => {
    test('should handle fetch metrics start', () => {
      const actual = dashboardSlice(initialState, fetchMetricsStart());
      expect(actual.loading).toBe(true);
      expect(actual.error).toBe(null);
    });

    test('should handle fetch metrics success', () => {
      const metricsData = {
        metrics: {
          totalUsers: 1500,
          activeProposals: 25,
          treasuryBalance: '1000000',
          monthlyGrowth: 15.5,
        },
        systemHealth: {
          status: 'healthy',
          uptime: 99.9,
          responseTime: 250,
        },
        recentActivities: [
          {
            id: '1',
            type: 'user_registration',
            description: 'New user registered',
            timestamp: '2025-07-24T10:00:00Z',
          },
        ],
        alerts: [
          {
            id: '1',
            type: 'warning',
            message: 'High memory usage detected',
            severity: 'medium',
          },
        ],
      };

      const actual = dashboardSlice(
        { ...initialState, loading: true },
        fetchMetricsSuccess(metricsData)
      );

      expect(actual.loading).toBe(false);
      expect(actual.metrics).toEqual(metricsData.metrics);
      expect(actual.systemHealth).toEqual(metricsData.systemHealth);
      expect(actual.recentActivities).toEqual(metricsData.recentActivities);
      expect(actual.alerts).toEqual(metricsData.alerts);
      expect(actual.error).toBe(null);
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle fetch metrics failure', () => {
      const errorMessage = 'Failed to fetch metrics';
      const actual = dashboardSlice(
        { ...initialState, loading: true },
        fetchMetricsFailure(errorMessage)
      );

      expect(actual.loading).toBe(false);
      expect(actual.error).toBe(errorMessage);
      expect(actual.metrics).toEqual(initialState.metrics);
    });
  });

  describe('Metric Updates', () => {
    test('should handle individual metric updates', () => {
      const metricUpdate = {
        key: 'totalUsers',
        value: 1600,
      };

      const actual = dashboardSlice(initialState, updateMetric(metricUpdate));

      expect(actual.metrics.totalUsers).toBe(1600);
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle multiple metric updates', () => {
      let state = dashboardSlice(initialState, updateMetric({
        key: 'totalUsers',
        value: 1600,
      }));

      state = dashboardSlice(state, updateMetric({
        key: 'activeProposals',
        value: 30,
      }));

      expect(state.metrics.totalUsers).toBe(1600);
      expect(state.metrics.activeProposals).toBe(30);
    });
  });

  describe('Filter Management', () => {
    test('should handle setting filters', () => {
      const filters = {
        timeRange: '7d',
        category: 'proposals',
      };

      const actual = dashboardSlice(initialState, setFilters(filters));

      expect(actual.filters).toEqual(filters);
    });

    test('should handle partial filter updates', () => {
      const stateWithFilters = {
        ...initialState,
        filters: {
          timeRange: '24h',
          category: 'all',
        },
      };

      const actual = dashboardSlice(
        stateWithFilters,
        setFilters({ timeRange: '30d' })
      );

      expect(actual.filters).toEqual({
        timeRange: '30d',
        category: 'all',
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const actual = dashboardSlice(errorState, clearError());

      expect(actual.error).toBe(null);
    });
  });

  describe('Dashboard Reset', () => {
    test('should handle dashboard reset', () => {
      const modifiedState = {
        ...initialState,
        metrics: { totalUsers: 1000 },
        loading: true,
        error: 'Some error',
      };

      const actual = dashboardSlice(modifiedState, resetDashboard());

      expect(actual).toEqual(initialState);
    });
  });

  describe('State Immutability', () => {
    test('should maintain state immutability', () => {
      const state = { ...initialState };
      const newState = dashboardSlice(state, fetchMetricsStart());
      
      expect(state).not.toBe(newState);
      expect(state.loading).toBe(false);
      expect(newState.loading).toBe(true);
    });

    test('should not mutate nested objects', () => {
      const state = {
        ...initialState,
        metrics: { totalUsers: 100 },
      };

      const newState = dashboardSlice(state, updateMetric({
        key: 'totalUsers',
        value: 200,
      }));

      expect(state.metrics.totalUsers).toBe(100);
      expect(newState.metrics.totalUsers).toBe(200);
      expect(state.metrics).not.toBe(newState.metrics);
    });
  });

  describe('Real-time Updates', () => {
    test('should handle real-time metric updates correctly', () => {
      const baseState = {
        ...initialState,
        metrics: {
          totalUsers: 1000,
          activeProposals: 20,
          treasuryBalance: '500000',
          monthlyGrowth: 10,
        },
      };

      // Simulate real-time update
      const actual = dashboardSlice(baseState, updateMetric({
        key: 'activeProposals',
        value: 25,
      }));

      expect(actual.metrics.activeProposals).toBe(25);
      expect(actual.metrics.totalUsers).toBe(1000); // Other metrics unchanged
      expect(actual.lastUpdated).toBeDefined();
    });
  });
});