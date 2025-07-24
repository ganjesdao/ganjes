/**
 * Security Slice Tests
 * Testing security monitoring state with TDD approach
 */

import securitySlice, {
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
} from './securitySlice';

describe('Security Slice', () => {
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

  test('should return the initial state', () => {
    expect(securitySlice(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('Security Events Management', () => {
    test('should handle fetch security events start', () => {
      const actual = securitySlice(initialState, fetchSecurityEventsStart());
      expect(actual.loading).toBe(true);
      expect(actual.error).toBe(null);
    });

    test('should handle fetch security events success', () => {
      const securityData = {
        events: [
          {
            id: '1',
            type: 'failed_login',
            severity: 'medium',
            status: 'active',
            timestamp: '2025-07-24T10:00:00Z',
            description: 'Multiple failed login attempts detected',
            sourceIp: '192.168.1.100',
            userId: 'user123',
            metadata: {
              attempts: 5,
              userAgent: 'Mozilla/5.0...',
            },
          },
          {
            id: '2',
            type: 'suspicious_transaction',
            severity: 'high',
            status: 'investigating',
            timestamp: '2025-07-24T11:30:00Z',
            description: 'Large transaction from new wallet address',
            sourceAddress: '0x123...',
            amount: '1000000',
            metadata: {
              transactionHash: '0xabc123...',
              riskScore: 85,
            },
          },
        ],
        alerts: [
          {
            id: '1',
            severity: 'critical',
            status: 'unread',
            category: 'security_breach',
            title: 'Potential Security Breach Detected',
            message: 'Unusual access patterns detected from multiple IP addresses',
            timestamp: '2025-07-24T12:00:00Z',
            relatedEvents: ['1'],
          },
        ],
        auditLogs: [
          {
            id: '1',
            action: 'user_login',
            userId: 'admin123',
            timestamp: '2025-07-24T09:00:00Z',
            details: {
              ip: '10.0.0.1',
              userAgent: 'Chrome/91.0',
              success: true,
            },
          },
        ],
      };

      const actual = securitySlice(
        { ...initialState, loading: true },
        fetchSecurityEventsSuccess(securityData)
      );

      expect(actual.loading).toBe(false);
      expect(actual.events).toEqual(securityData.events);
      expect(actual.alerts).toEqual(securityData.alerts);
      expect(actual.auditLogs).toEqual(securityData.auditLogs);
      expect(actual.error).toBe(null);
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle fetch security events failure', () => {
      const errorMessage = 'Failed to fetch security events';
      const actual = securitySlice(
        { ...initialState, loading: true },
        fetchSecurityEventsFailure(errorMessage)
      );

      expect(actual.loading).toBe(false);
      expect(actual.error).toBe(errorMessage);
    });

    test('should handle adding a new security event', () => {
      const newEvent = {
        id: '3',
        type: 'unauthorized_access',
        severity: 'critical',
        status: 'active',
        timestamp: '2025-07-24T13:00:00Z',
        description: 'Unauthorized admin panel access attempt',
        sourceIp: '203.0.113.1',
        metadata: {
          endpoint: '/admin/users',
          method: 'GET',
        },
      };

      const stateWithEvents = {
        ...initialState,
        events: [
          { id: '1', type: 'failed_login', severity: 'low' },
          { id: '2', type: 'suspicious_transaction', severity: 'medium' },
        ],
      };

      const actual = securitySlice(stateWithEvents, addSecurityEvent(newEvent));

      expect(actual.events).toHaveLength(3);
      expect(actual.events[0]).toEqual(newEvent); // New event at beginning
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle updating an existing security event', () => {
      const existingEvents = [
        {
          id: '1',
          type: 'failed_login',
          severity: 'medium',
          status: 'active',
          description: 'Original description',
        },
        {
          id: '2',
          type: 'suspicious_transaction',
          severity: 'high',
          status: 'investigating',
        },
      ];

      const eventUpdate = {
        id: '1',
        status: 'resolved',
        description: 'Updated description',
        resolution: 'Account temporarily locked',
      };

      const stateWithEvents = {
        ...initialState,
        events: existingEvents,
      };

      const actual = securitySlice(stateWithEvents, updateSecurityEvent(eventUpdate));

      expect(actual.events[0].status).toBe('resolved');
      expect(actual.events[0].description).toBe('Updated description');
      expect(actual.events[0].resolution).toBe('Account temporarily locked');
      expect(actual.events[0].type).toBe('failed_login'); // Unchanged field preserved
      expect(actual.lastUpdated).toBeDefined();
    });
  });

  describe('Alert Management', () => {
    test('should handle adding a new alert', () => {
      const newAlert = {
        id: '2',
        severity: 'high',
        status: 'unread',
        category: 'fraud_detection',
        title: 'Fraudulent Transaction Pattern Detected',
        message: 'Multiple transactions from compromised accounts',
        timestamp: '2025-07-24T14:00:00Z',
        relatedEvents: ['2', '3'],
      };

      const stateWithAlerts = {
        ...initialState,
        alerts: [
          {
            id: '1',
            severity: 'medium',
            status: 'read',
            title: 'Existing Alert',
          },
        ],
      };

      const actual = securitySlice(stateWithAlerts, addAlert(newAlert));

      expect(actual.alerts).toHaveLength(2);
      expect(actual.alerts[0]).toEqual(newAlert); // New alert at beginning
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle removing an alert', () => {
      const existingAlerts = [
        { id: '1', title: 'Alert 1', severity: 'low' },
        { id: '2', title: 'Alert 2', severity: 'medium' },
        { id: '3', title: 'Alert 3', severity: 'high' },
      ];

      const stateWithAlerts = {
        ...initialState,
        alerts: existingAlerts,
      };

      const actual = securitySlice(stateWithAlerts, removeAlert('2'));

      expect(actual.alerts).toHaveLength(2);
      expect(actual.alerts.find(a => a.id === '2')).toBeUndefined();
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle updating an alert', () => {
      const existingAlerts = [
        {
          id: '1',
          severity: 'high',
          status: 'unread',
          title: 'Original Title',
          message: 'Original message',
        },
      ];

      const alertUpdate = {
        id: '1',
        status: 'investigating',
        title: 'Updated Title',
        assignedTo: 'security-team',
      };

      const stateWithAlerts = {
        ...initialState,
        alerts: existingAlerts,
      };

      const actual = securitySlice(stateWithAlerts, updateAlert(alertUpdate));

      expect(actual.alerts[0].status).toBe('investigating');
      expect(actual.alerts[0].title).toBe('Updated Title');
      expect(actual.alerts[0].assignedTo).toBe('security-team');
      expect(actual.alerts[0].message).toBe('Original message'); // Unchanged field preserved
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle marking alert as read', () => {
      const existingAlerts = [
        { id: '1', severity: 'high', status: 'unread', title: 'Test Alert' },
        { id: '2', severity: 'medium', status: 'unread', title: 'Another Alert' },
      ];

      const stateWithAlerts = {
        ...initialState,
        alerts: existingAlerts,
      };

      const actual = securitySlice(stateWithAlerts, markAlertAsRead('1'));

      expect(actual.alerts[0].status).toBe('read');
      expect(actual.alerts[1].status).toBe('unread'); // Other alerts unchanged
      expect(actual.lastUpdated).toBeDefined();
    });
  });

  describe('Audit Log Management', () => {
    test('should handle adding audit log entry', () => {
      const newAuditLog = {
        id: '2',
        action: 'user_role_changed',
        userId: 'admin456',
        timestamp: '2025-07-24T15:00:00Z',
        details: {
          targetUserId: 'user789',
          oldRole: 'viewer',
          newRole: 'moderator',
          reason: 'Promoted for community management',
        },
      };

      const stateWithLogs = {
        ...initialState,
        auditLogs: [
          { id: '1', action: 'user_login', userId: 'admin123' },
        ],
      };

      const actual = securitySlice(stateWithLogs, addAuditLog(newAuditLog));

      expect(actual.auditLogs).toHaveLength(2);
      expect(actual.auditLogs[0]).toEqual(newAuditLog); // New log at beginning
      expect(actual.lastUpdated).toBeDefined();
    });
  });

  describe('Filter Management', () => {
    test('should handle setting security filters', () => {
      const filters = {
        severity: 'high',
        type: 'failed_login',
        status: 'active',
        dateRange: {
          start: '2025-07-01',
          end: '2025-07-31',
        },
      };

      const actual = securitySlice(initialState, setSecurityFilters(filters));

      expect(actual.securityFilters.severity).toBe('high');
      expect(actual.securityFilters.type).toBe('failed_login');
      expect(actual.securityFilters.status).toBe('active');
      expect(actual.securityFilters.dateRange).toEqual(filters.dateRange);
    });

    test('should handle partial security filter updates', () => {
      const stateWithFilters = {
        ...initialState,
        securityFilters: {
          severity: 'medium',
          type: 'all',
          status: 'active',
          dateRange: null,
        },
      };

      const actual = securitySlice(
        stateWithFilters,
        setSecurityFilters({ severity: 'critical' })
      );

      expect(actual.securityFilters.severity).toBe('critical');
      expect(actual.securityFilters.type).toBe('all'); // Preserved
      expect(actual.securityFilters.status).toBe('active'); // Preserved
    });

    test('should handle setting alert filters', () => {
      const filters = {
        severity: 'critical',
        status: 'unread',
        category: 'security_breach',
      };

      const actual = securitySlice(initialState, setAlertFilters(filters));

      expect(actual.alertFilters.severity).toBe('critical');
      expect(actual.alertFilters.status).toBe('unread');
      expect(actual.alertFilters.category).toBe('security_breach');
    });
  });

  describe('Error Handling and Reset', () => {
    test('should handle clear security error', () => {
      const errorState = { ...initialState, error: 'Some security error' };
      const actual = securitySlice(errorState, clearSecurityError());

      expect(actual.error).toBe(null);
    });

    test('should handle reset security', () => {
      const modifiedState = {
        ...initialState,
        events: [{ id: '1', type: 'test' }],
        alerts: [{ id: '1', title: 'Test Alert' }],
        auditLogs: [{ id: '1', action: 'test_action' }],
        loading: true,
        error: 'Some error',
      };

      const actual = securitySlice(modifiedState, resetSecurity());

      expect(actual).toEqual(initialState);
    });
  });

  describe('State Immutability', () => {
    test('should maintain state immutability', () => {
      const state = { ...initialState };
      const newState = securitySlice(state, fetchSecurityEventsStart());
      
      expect(state).not.toBe(newState);
      expect(state.loading).toBe(false);
      expect(newState.loading).toBe(true);
    });

    test('should not mutate events array', () => {
      const events = [{ id: '1', type: 'test' }];
      const state = { ...initialState, events };
      
      const newEvent = { id: '2', type: 'test2' };
      const newState = securitySlice(state, addSecurityEvent(newEvent));

      expect(state.events).toHaveLength(1);
      expect(newState.events).toHaveLength(2);
      expect(state.events).not.toBe(newState.events);
    });

    test('should not mutate alerts array', () => {
      const alerts = [{ id: '1', title: 'Test Alert' }];
      const state = { ...initialState, alerts };
      
      const newAlert = { id: '2', title: 'New Alert' };
      const newState = securitySlice(state, addAlert(newAlert));

      expect(state.alerts).toHaveLength(1);
      expect(newState.alerts).toHaveLength(2);
      expect(state.alerts).not.toBe(newState.alerts);
    });
  });

  describe('Edge Cases', () => {
    test('should handle updating non-existent security event gracefully', () => {
      const stateWithEvents = {
        ...initialState,
        events: [{ id: '1', type: 'test', status: 'active' }],
      };

      const actual = securitySlice(
        stateWithEvents,
        updateSecurityEvent({ id: '999', status: 'resolved' })
      );

      expect(actual.events).toHaveLength(1);
      expect(actual.events[0].status).toBe('active'); // Unchanged
    });

    test('should handle removing non-existent alert gracefully', () => {
      const stateWithAlerts = {
        ...initialState,
        alerts: [{ id: '1', title: 'Test Alert' }],
      };

      const actual = securitySlice(stateWithAlerts, removeAlert('999'));

      expect(actual.alerts).toHaveLength(1);
      expect(actual.alerts[0].title).toBe('Test Alert'); // Unchanged
    });

    test('should handle marking non-existent alert as read gracefully', () => {
      const stateWithAlerts = {
        ...initialState,
        alerts: [{ id: '1', status: 'unread', title: 'Test Alert' }],
      };

      const actual = securitySlice(stateWithAlerts, markAlertAsRead('999'));

      expect(actual.alerts[0].status).toBe('unread'); // Unchanged
      expect(actual.lastUpdated).toBe(null); // No update occurred
    });

    test('should handle complex security event metadata', () => {
      const complexEvent = {
        id: '4',
        type: 'blockchain_anomaly',
        severity: 'critical',
        status: 'active',
        timestamp: '2025-07-24T16:00:00Z',
        description: 'Unusual smart contract interaction detected',
        sourceAddress: '0x789...',
        metadata: {
          contractAddress: '0xabc...',
          functionCalled: 'transfer',
          gasUsed: '150000',
          blockNumber: '12345678',
          transactionValue: '1000000000000000000',
          riskFactors: ['large_amount', 'new_address', 'unusual_time'],
          confidence: 0.95,
        },
      };

      const actual = securitySlice(initialState, addSecurityEvent(complexEvent));

      expect(actual.events[0]).toEqual(complexEvent);
      expect(actual.events[0].metadata.riskFactors).toHaveLength(3);
      expect(actual.events[0].metadata.confidence).toBe(0.95);
    });
  });
});