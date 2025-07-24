/**
 * Security Slice
 * Redux slice for security monitoring and audit management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SecureFetch } from '../../../utils/securityHeaders';

// Initial state
const initialState = {
  events: [],
  alerts: [],
  auditLogs: [],
  securityFilters: {
    severity: 'all',
    type: 'all',
    status: 'all',
    dateRange: null,
  },
  alertFilters: {
    severity: 'all',
    status: 'all',
    category: 'all',
  },
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchSecurityEventsAsync = createAsyncThunk(
  'security/fetchSecurityEvents',
  async ({ page = 1, limit = 50, filters = {} }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/security/events?${queryParams}`,
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
        return rejectWithValue(data.message || 'Failed to fetch security events');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const fetchAlertsAsync = createAsyncThunk(
  'security/fetchAlerts',
  async ({ filters = {} }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const queryParams = new URLSearchParams(filters);

      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/security/alerts?${queryParams}`,
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
        return rejectWithValue(data.message || 'Failed to fetch alerts');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const fetchAuditLogsAsync = createAsyncThunk(
  'security/fetchAuditLogs',
  async ({ page = 1, limit = 100, filters = {} }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/security/audit-logs?${queryParams}`,
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
        return rejectWithValue(data.message || 'Failed to fetch audit logs');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const updateSecurityEventAsync = createAsyncThunk(
  'security/updateSecurityEvent',
  async ({ eventId, eventData }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/security/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to update security event');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const updateAlertAsync = createAsyncThunk(
  'security/updateAlert',
  async ({ alertId, alertData }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/security/alerts/${alertId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(alertData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to update alert');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// Security slice
const securitySlice = createSlice({
  name: 'security',
  initialState,
  reducers: {
    fetchSecurityEventsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchSecurityEventsSuccess: (state, action) => {
      state.loading = false;
      state.events = action.payload.events || [];
      state.alerts = action.payload.alerts || state.alerts;
      state.auditLogs = action.payload.auditLogs || state.auditLogs;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
    },
    fetchSecurityEventsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    addSecurityEvent: (state, action) => {
      state.events = [action.payload, ...state.events];
      state.lastUpdated = new Date().toISOString();
    },
    updateSecurityEvent: (state, action) => {
      const index = state.events.findIndex(event => event.id === action.payload.id);
      if (index !== -1) {
        state.events[index] = { ...state.events[index], ...action.payload };
        state.lastUpdated = new Date().toISOString();
      }
    },
    addAlert: (state, action) => {
      state.alerts = [action.payload, ...state.alerts];
      state.lastUpdated = new Date().toISOString();
    },
    removeAlert: (state, action) => {
      const alertId = action.payload;
      const initialLength = state.alerts.length;
      state.alerts = state.alerts.filter(alert => alert.id !== alertId);
      
      if (state.alerts.length !== initialLength) {
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateAlert: (state, action) => {
      const index = state.alerts.findIndex(alert => alert.id === action.payload.id);
      if (index !== -1) {
        state.alerts[index] = { ...state.alerts[index], ...action.payload };
        state.lastUpdated = new Date().toISOString();
      }
    },
    markAlertAsRead: (state, action) => {
      const alertId = action.payload;
      const alert = state.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.status = 'read';
        state.lastUpdated = new Date().toISOString();
      }
    },
    addAuditLog: (state, action) => {
      state.auditLogs = [action.payload, ...state.auditLogs];
      state.lastUpdated = new Date().toISOString();
    },
    setSecurityFilters: (state, action) => {
      state.securityFilters = { ...state.securityFilters, ...action.payload };
    },
    setAlertFilters: (state, action) => {
      state.alertFilters = { ...state.alertFilters, ...action.payload };
    },
    clearSecurityError: (state) => {
      state.error = null;
    },
    resetSecurity: (state) => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch security events async
      .addCase(fetchSecurityEventsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSecurityEventsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.events = action.payload.events || [];
        state.alerts = action.payload.alerts || state.alerts;
        state.auditLogs = action.payload.auditLogs || state.auditLogs;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchSecurityEventsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch alerts async
      .addCase(fetchAlertsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAlertsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.alerts = action.payload.alerts || [];
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchAlertsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch audit logs async
      .addCase(fetchAuditLogsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.auditLogs = action.payload.auditLogs || [];
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchAuditLogsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update security event async
      .addCase(updateSecurityEventAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSecurityEventAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.events.findIndex(event => event.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateSecurityEventAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update alert async
      .addCase(updateAlertAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAlertAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.alerts.findIndex(alert => alert.id === action.payload.id);
        if (index !== -1) {
          state.alerts[index] = action.payload;
        }
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateAlertAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  fetchSecurityEventsStart,
  fetchSecurityEventsSuccess,
  fetchSecurityEventsFailure,
  addSecurityEvent,
  updateSecurityEvent,
  addAlert,
  removeAlert,
  updateAlert,
  markAlertAsRead,
  addAuditLog,
  setSecurityFilters,
  setAlertFilters,
  clearSecurityError,
  resetSecurity,
} = securitySlice.actions;

// Selectors
export const selectSecurity = (state) => state.security;
export const selectSecurityEvents = (state) => state.security.events;
export const selectSecurityAlerts = (state) => state.security.alerts;
export const selectAuditLogs = (state) => state.security.auditLogs;
export const selectSecurityFilters = (state) => state.security.securityFilters;
export const selectAlertFilters = (state) => state.security.alertFilters;
export const selectSecurityLoading = (state) => state.security.loading;
export const selectSecurityError = (state) => state.security.error;

// Computed selectors
export const selectFilteredSecurityEvents = (state) => {
  const { events, securityFilters } = state.security;
  
  return events.filter(event => {
    // Severity filter
    if (securityFilters.severity !== 'all' && event.severity !== securityFilters.severity) {
      return false;
    }
    
    // Type filter
    if (securityFilters.type !== 'all' && event.type !== securityFilters.type) {
      return false;
    }
    
    // Status filter
    if (securityFilters.status !== 'all' && event.status !== securityFilters.status) {
      return false;
    }
    
    // Date range filter
    if (securityFilters.dateRange) {
      const eventDate = new Date(event.timestamp);
      const startDate = new Date(securityFilters.dateRange.start);
      const endDate = new Date(securityFilters.dateRange.end);
      
      if (eventDate < startDate || eventDate > endDate) {
        return false;
      }
    }
    
    return true;
  });
};

export const selectFilteredAlerts = (state) => {
  const { alerts, alertFilters } = state.security;
  
  return alerts.filter(alert => {
    // Severity filter
    if (alertFilters.severity !== 'all' && alert.severity !== alertFilters.severity) {
      return false;
    }
    
    // Status filter
    if (alertFilters.status !== 'all' && alert.status !== alertFilters.status) {
      return false;
    }
    
    // Category filter
    if (alertFilters.category !== 'all' && alert.category !== alertFilters.category) {
      return false;
    }
    
    return true;
  });
};

export const selectEventsBySeverity = (severity) => (state) => {
  return state.security.events.filter(event => event.severity === severity);
};

export const selectEventsByType = (type) => (state) => {
  return state.security.events.filter(event => event.type === type);
};

export const selectCriticalAlerts = (state) => {
  return state.security.alerts.filter(alert => alert.severity === 'critical');
};

export const selectUnreadAlerts = (state) => {
  return state.security.alerts.filter(alert => alert.status === 'unread');
};

export const selectActiveSecurityEvents = (state) => {
  return state.security.events.filter(event => event.status === 'active');
};

export const selectSecurityStats = (state) => {
  const events = state.security.events;
  const alerts = state.security.alerts;
  
  const eventStats = {
    total: events.length,
    critical: events.filter(e => e.severity === 'critical').length,
    high: events.filter(e => e.severity === 'high').length,
    medium: events.filter(e => e.severity === 'medium').length,
    low: events.filter(e => e.severity === 'low').length,
    active: events.filter(e => e.status === 'active').length,
    resolved: events.filter(e => e.status === 'resolved').length,
  };
  
  const alertStats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
    unread: alerts.filter(a => a.status === 'unread').length,
    investigating: alerts.filter(a => a.status === 'investigating').length,
  };
  
  const typeDistribution = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {});
  
  const categoryDistribution = alerts.reduce((acc, alert) => {
    acc[alert.category] = (acc[alert.category] || 0) + 1;
    return acc;
  }, {});
  
  return {
    events: eventStats,
    alerts: alertStats,
    typeDistribution,
    categoryDistribution,
  };
};

export const selectRecentSecurityEvents = (limit = 10) => (state) => {
  return state.security.events
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

export const selectRecentAlerts = (limit = 5) => (state) => {
  return state.security.alerts
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

export const selectSecurityTrends = (period = 'weekly') => (state) => {
  const events = state.security.events;
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'daily':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  const periodEvents = events.filter(event => 
    new Date(event.timestamp) >= startDate
  );
  
  const trendData = {};
  const timeFrame = period === 'daily' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // hourly for daily, daily for others
  
  const timeSlots = Math.floor((now - startDate) / timeFrame);
  
  for (let i = 0; i < timeSlots; i++) {
    const slotStart = new Date(startDate.getTime() + i * timeFrame);
    const slotEnd = new Date(startDate.getTime() + (i + 1) * timeFrame);
    
    const slotEvents = periodEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= slotStart && eventDate < slotEnd;
    });
    
    trendData[slotStart.toISOString()] = {
      total: slotEvents.length,
      critical: slotEvents.filter(e => e.severity === 'critical').length,
      high: slotEvents.filter(e => e.severity === 'high').length,
      medium: slotEvents.filter(e => e.severity === 'medium').length,
      low: slotEvents.filter(e => e.severity === 'low').length,
    };
  }
  
  return {
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    data: trendData,
    summary: {
      totalEvents: periodEvents.length,
      averagePerPeriod: (periodEvents.length / timeSlots).toFixed(2),
      criticalEvents: periodEvents.filter(e => e.severity === 'critical').length,
      resolvedEvents: periodEvents.filter(e => e.status === 'resolved').length,
    },
  };
};

export default securitySlice.reducer;