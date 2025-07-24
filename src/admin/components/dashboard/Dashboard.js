/**
 * Admin Dashboard Component
 * Main overview page for admin panel
 */

import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDashboardMetrics } from '../../store/slices/dashboardSlice';
import {
  selectDashboardMetrics,
  selectSystemHealth,
  selectRecentActivities,
  selectAlerts,
  selectDashboardLoading,
  selectDashboardError
} from '../../store/slices/dashboardSlice';

const Dashboard = () => {
  const dispatch = useDispatch();
  const metrics = useSelector(selectDashboardMetrics);
  const systemHealth = useSelector(selectSystemHealth);
  const recentActivities = useSelector(selectRecentActivities);
  const alerts = useSelector(selectAlerts);
  const loading = useSelector(selectDashboardLoading);
  const error = useSelector(selectDashboardError);

  useEffect(() => {
    dispatch(fetchDashboardMetrics());
  }, [dispatch]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div>Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '1rem',
        color: '#dc2626'
      }}>
        Error loading dashboard: {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '0.5rem'
        }}>
          Welcome to Ganjes Admin
        </h2>
        <p style={{
          color: '#6b7280',
          fontSize: '1.125rem'
        }}>
          Monitor and manage your DAO operations from this central dashboard.
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers || 0}
          icon="👥"
          color="#3b82f6"
        />
        <MetricCard
          title="Active Proposals"
          value={metrics.activeProposals || 0}
          icon="📋"
          color="#10b981"
        />
        <MetricCard
          title="Treasury Balance"
          value={`$${(metrics.treasuryBalance || 0).toLocaleString()}`}
          icon="💰"
          color="#f59e0b"
        />
        <MetricCard
          title="Monthly Growth"
          value={`${metrics.monthlyGrowth || 0}%`}
          icon="📈"
          color="#8b5cf6"
        />
      </div>

      {/* System Health & Alerts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* System Health */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            System Health
          </h3>
          <SystemHealthDisplay health={systemHealth} />
        </div>

        {/* Recent Alerts */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '1rem'
          }}>
            Recent Alerts
          </h3>
          <AlertsList alerts={alerts} />
        </div>
      </div>

      {/* Recent Activities */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '1rem'
        }}>
          Recent Activities
        </h3>
        <ActivitiesList activities={recentActivities} />
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, icon, color }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      backgroundColor: `${color}20`,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.5rem'
    }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#1f2937'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        {title}
      </div>
    </div>
  </div>
);

// System Health Display Component
const SystemHealthDisplay = ({ health }) => {
  if (!health) {
    return (
      <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
        No health data available
      </div>
    );
  }

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: getHealthColor(health.status)
        }} />
        <span style={{
          fontSize: '1.125rem',
          fontWeight: '500',
          color: '#1f2937'
        }}>
          {health.status || 'Unknown'}
        </span>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1rem',
        fontSize: '0.875rem'
      }}>
        <div>
          <div style={{ color: '#6b7280' }}>Uptime</div>
          <div style={{ fontWeight: '500' }}>{health.uptime}%</div>
        </div>
        <div>
          <div style={{ color: '#6b7280' }}>Response Time</div>
          <div style={{ fontWeight: '500' }}>{health.responseTime}ms</div>
        </div>
      </div>
    </div>
  );
};

// Alerts List Component
const AlertsList = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
        No recent alerts
      </div>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      {alerts.slice(0, 5).map(alert => (
        <div
          key={alert.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getSeverityColor(alert.severity)
          }} />
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#1f2937'
            }}>
              {alert.message}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              {alert.type} • {alert.severity}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Activities List Component
const ActivitiesList = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
        No recent activities
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {activities.slice(0, 10).map(activity => (
        <div
          key={activity.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem'
          }}>
            📝
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#1f2937'
            }}>
              {activity.description}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              {activity.type} • {new Date(activity.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;