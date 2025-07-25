/**
 * Admin Dashboard Component
 * Simplified dashboard for admin panel
 */

import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { isTestnet } from '../../../utils/networks';
import { useDAOData } from '../../hooks/useDAOData';

const Dashboard = ({ currentNetwork, contractAddress, isMobile }) => {
  const user = useSelector(selectUser);
  
  // Use DAO data hook for live data
  const {
    dashboardMetrics,
    proposals,
    proposers,
    activeProposals,
    totalValue,
    isLoading,
    isInitializing,
    error,
    lastUpdated,
    isNetworkSupported,
    refreshData
  } = useDAOData(currentNetwork, !!currentNetwork);

  useEffect(() => {
    if (currentNetwork) {
      const networkType = isTestnet(currentNetwork.chainId) ? 'Testnet' : 'Mainnet';
      console.log(`Admin connected to ${currentNetwork.chainName} (${networkType})`);
    }
  }, [currentNetwork]);

  // Show loading state
  if (isInitializing) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        flexDirection: 'column'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ 
          marginTop: '1rem', 
          color: '#6b7280',
          fontSize: isMobile ? '0.9rem' : '1rem'
        }}>
          Connecting to {currentNetwork?.chainName}...
        </p>
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
  }

  // Show error state for unsupported networks
  if (currentNetwork && !isNetworkSupported) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        margin: '2rem 0'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ 
          color: '#ef4444',
          fontSize: isMobile ? '1.25rem' : '1.5rem',
          marginBottom: '1rem'
        }}>
          Network Not Supported
        </h2>
        <p style={{ 
          color: '#6b7280',
          fontSize: isMobile ? '0.9rem' : '1rem',
          marginBottom: '1.5rem'
        }}>
          DAO contract is not deployed on {currentNetwork.chainName}.
          Please switch to a supported network.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Error Banner */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: isMobile ? '0.875rem' : '1rem',
          marginBottom: isMobile ? '1.5rem' : '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ 
              color: '#dc2626',
              fontSize: isMobile ? '0.85rem' : '0.875rem'
            }}>
              {error}
            </span>
          </div>
          <button
            onClick={refreshData}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              fontWeight: '500'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Last Updated Info */}
      {lastUpdated && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          padding: isMobile ? '0.75rem' : '1rem',
          backgroundColor: '#f0f9ff',
          borderRadius: '8px',
          border: '1px solid #bae6fd'
        }}>
          <span style={{ 
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            color: '#0369a1'
          }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={refreshData}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isLoading ? '#9ca3af' : '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isLoading ? '🔄' : '↻'} Refresh
          </button>
        </div>
      )}

      {/* Welcome Section */}
      <div style={{ marginBottom: isMobile ? '1.5rem' : '2rem' }}>
        <h2 style={{
          fontSize: isMobile ? '1.5rem' : '1.875rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '0.5rem',
          lineHeight: isMobile ? '1.4' : '1.2'
        }}>
          Welcome, {user?.name || 'Admin'}! 👋
        </h2>
        <p style={{
          color: '#6b7280',
          fontSize: isMobile ? '0.95rem' : '1.125rem',
          lineHeight: '1.5'
        }}>
          Admin dashboard for managing the Ganjes DAO platform.
        </p>
      </div>

      {/* Simple Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: isMobile ? '1rem' : '1.5rem',
        marginBottom: isMobile ? '1.5rem' : '2rem'
      }}>
        <SimpleCard
          title="System Status"
          value="Online"
          icon="🟢"
          color="#10b981"
          isMobile={isMobile}
        />
        <SimpleCard
          title="Admin Access"
          value="Full"
          icon="🔐"
          color="#3b82f6"
          isMobile={isMobile}
        />
        <SimpleCard
          title="Platform"
          value="Ganjes DAO"
          icon="🌐"
          color="#8b5cf6"
          isMobile={isMobile}
        />
        <SimpleCard
          title="Role"
          value="Administrator"
          icon="👑"
          color="#f59e0b"
          isMobile={isMobile}
        />
        
        {/* Network Status Card */}
        {currentNetwork ? (
          <SimpleCard
            title="Network Status"
            value={currentNetwork.chainName}
            icon={currentNetwork.icon}
            color={currentNetwork.color}
            isMobile={isMobile}
          />
        ) : (
          <SimpleCard
            title="Network Status"
            value="Not Connected"
            icon="⚠️"
            color="#ef4444"
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Quick Actions */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: isMobile ? '1.5rem' : '2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: isMobile ? '1.5rem' : '2rem'
      }}>
        <h3 style={{
          fontSize: isMobile ? '1.1rem' : '1.25rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          lineHeight: '1.3'
        }}>
          📋 Admin Features
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem'
        }}>
          <FeatureCard
            title="API Authentication"
            description="Secure login system with JWT tokens"
            status="✅ Active"
            statusColor="#10b981"
            isMobile={isMobile}
          />
          <FeatureCard
            title="Dashboard Access"
            description="Admin dashboard with full platform overview"
            status="✅ Available"
            statusColor="#10b981"
            isMobile={isMobile}
          />
          <FeatureCard
            title="Session Management"
            description="Secure token storage and session handling"
            status="✅ Working"
            statusColor="#10b981"
            isMobile={isMobile}
          />
        </div>
      </div>

      {/* Blockchain Information */}
      {currentNetwork && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: isMobile ? '1.5rem' : '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          marginBottom: isMobile ? '1.5rem' : '2rem'
        }}>
          <h3 style={{
            fontSize: isMobile ? '1.1rem' : '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            lineHeight: '1.3'
          }}>
            ⛓️ Blockchain Information
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            fontSize: '0.875rem'
          }}>
            <InfoItem 
              label="Current Network" 
              value={`${currentNetwork.icon} ${currentNetwork.chainName}`} 
              isMobile={isMobile}
            />
            <InfoItem 
              label="Network Type" 
              value={isTestnet(currentNetwork.chainId) ? '🧪 Testnet' : '🌍 Mainnet'} 
              isMobile={isMobile}
            />
            <InfoItem 
              label="Chain ID" 
              value={parseInt(currentNetwork.chainId, 16)} 
              isMobile={isMobile}
            />
            <InfoItem 
              label="Native Currency" 
              value={currentNetwork.nativeCurrency.symbol} 
              isMobile={isMobile}
            />
            {contractAddress && (
              <InfoItem 
                label="DAO Contract" 
                value={`${contractAddress.slice(0, 10)}...${contractAddress.slice(-8)}`} 
                isMobile={isMobile}
              />
            )}
            <InfoItem 
              label="Block Explorer" 
              value={currentNetwork.blockExplorerUrls?.[0] ? '🔗 Available' : 'N/A'} 
              isMobile={isMobile}
            />
          </div>
        </div>
      )}

      {/* System Information */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: isMobile ? '1.5rem' : '2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{
          fontSize: isMobile ? '1.1rem' : '1.25rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: isMobile ? '1rem' : '1.5rem',
          lineHeight: '1.3'
        }}>
          ℹ️ System Information
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          fontSize: '0.875rem'
        }}>
          <InfoItem label="Platform" value="Ganjes NFT DAO" isMobile={isMobile} />
          <InfoItem label="Admin Version" value="v1.0.0" isMobile={isMobile} />
          <InfoItem label="Login Status" value="Authenticated" isMobile={isMobile} />
          <InfoItem label="Session" value="Active" isMobile={isMobile} />
          <InfoItem label="Role" value={user?.role || 'Admin'} isMobile={isMobile} />
          <InfoItem label="Last Login" value={new Date().toLocaleDateString()} isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
};

// Simple Card Component
const SimpleCard = ({ title, value, icon, color, isMobile }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: isMobile ? '8px' : '12px',
    padding: isMobile ? '1rem' : '1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0.75rem' : '1rem',
    minHeight: isMobile ? '80px' : 'auto',
    border: isMobile ? '1px solid #f3f4f6' : 'none'
  }}>
    <div style={{
      width: isMobile ? '40px' : '48px',
      height: isMobile ? '40px' : '48px',
      backgroundColor: `${color}20`,
      borderRadius: isMobile ? '8px' : '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: isMobile ? '1.25rem' : '1.5rem',
        fontWeight: 'bold',
        color: '#1f2937',
        lineHeight: '1.2',
        marginBottom: isMobile ? '0.125rem' : '0.25rem'
      }}>
        {value}
      </div>
      <div style={{
        fontSize: isMobile ? '0.8rem' : '0.875rem',
        color: '#6b7280',
        lineHeight: '1.3'
      }}>
        {title}
      </div>
    </div>
  </div>
);

// Feature Card Component
const FeatureCard = ({ title, description, status, statusColor, isMobile }) => (
  <div style={{
    padding: isMobile ? '0.875rem' : '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      marginBottom: '0.5rem',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? '0.25rem' : '0'
    }}>
      <h4 style={{
        fontSize: isMobile ? '0.9rem' : '1rem',
        fontWeight: '600',
        color: '#1f2937',
        margin: 0,
        lineHeight: '1.3'
      }}>
        {title}
      </h4>
      <span style={{
        fontSize: isMobile ? '0.7rem' : '0.75rem',
        color: statusColor,
        fontWeight: '500',
        alignSelf: isMobile ? 'flex-start' : 'auto'
      }}>
        {status}
      </span>
    </div>
    <p style={{
      fontSize: isMobile ? '0.8rem' : '0.875rem',
      color: '#6b7280',
      margin: 0,
      lineHeight: '1.4'
    }}>
      {description}
    </p>
  </div>
);

// Info Item Component
const InfoItem = ({ label, value, isMobile }) => (
  <div style={{
    padding: isMobile ? '0.625rem' : '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    border: isMobile ? '1px solid #f3f4f6' : 'none'
  }}>
    <div style={{
      fontSize: isMobile ? '0.7rem' : '0.75rem',
      color: '#6b7280',
      marginBottom: '0.25rem',
      textTransform: 'uppercase',
      fontWeight: '500',
      letterSpacing: '0.025em'
    }}>
      {label}
    </div>
    <div style={{
      fontSize: isMobile ? '0.8rem' : '0.875rem',
      fontWeight: '500',
      color: '#1f2937',
      lineHeight: '1.3',
      wordBreak: 'break-word'
    }}>
      {value}
    </div>
  </div>
);

export default Dashboard;