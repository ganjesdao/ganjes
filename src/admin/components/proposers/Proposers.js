/**
 * Proposers Management Page
 * Admin interface for managing project proposers
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import AdminPageLayout from '../common/AdminPageLayout';
import PageHeader from '../common/PageHeader';
import SearchBar from '../common/SearchBar';
import MobileTable from '../common/MobileTable';
import { useDAOData } from '../../hooks/useDAOData';

const Proposers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { currentNetwork } = useSelector(state => state.auth);

  // Use real DAO data
  const {
    proposers,
    isLoading: loading,
    error,
    refreshData
  } = useDAOData(currentNetwork, true);
  // Fallback data for when real data is not available
  const fallbackProposers = [
    {
      id: 1,
      address: '0x1234...5678',
      name: 'John Doe',
      email: 'john@example.com',
      walletAddress: '0x1234...5678',
      totalProposals: 3,
      approvedProposals: 2,
      status: 'active',
      joinDate: '2024-01-15'
    },
    {
      id: 2,
      address: '0x8765...4321',
      name: 'Jane Smith',
      email: 'jane@example.com',
      walletAddress: '0x8765...4321',
      totalProposals: 5,
      approvedProposals: 4,
      status: 'active',
      joinDate: '2024-02-20'
    }
  ];

  // Use real data if available, otherwise fallback
  const displayProposers = proposers && proposers.length > 0
    ? proposers.map((proposer, index) => ({
      ...proposer,
      id: index + 1,
      name: `Proposer ${index + 1}`,
      email: `proposer${index + 1}@dao.com`,
      walletAddress: proposer.address,
      status: proposer.totalProposals > 0 ? 'active' : 'pending',
      joinDate: new Date().toISOString().split('T')[0]
    }))
    : fallbackProposers;

  const filteredProposers = displayProposers.filter(proposer =>
    (proposer.name && proposer.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (proposer.email && proposer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (proposer.address && proposer.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status, isMobile = false) => {
    const colors = {
      active: '#10b981',
      pending: '#f59e0b',
      suspended: '#ef4444'
    };

    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        backgroundColor: colors[status] || '#6b7280',
        color: 'white',
        fontSize: isMobile ? '0.7rem' : '0.75rem',
        fontWeight: '500'
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleRowAction = (action, row) => {
    console.log(`${action} action for proposer:`, row);
  };

  const getTableColumns = (isMobile = false) => [
    {
      key: 'proposer',
      label: 'Proposer',
      render: (value, row) => (
        <div>
          <div style={{
            fontWeight: '500',
            color: '#1f2937',
            fontSize: isMobile ? '0.8rem' : '0.875rem'
          }}>
            {row.name}
          </div>
          <div style={{
            color: '#6b7280',
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            marginTop: '0.125rem'
          }}>
            {row.email}
          </div>
          {!isMobile && (
            <code style={{
              fontSize: '0.6rem',
              backgroundColor: '#f3f4f6',
              padding: '0.125rem 0.25rem',
              borderRadius: '3px',
              color: '#374151',
              marginTop: '0.25rem',
              display: 'block'
            }}>
              {row.walletAddress}
            </code>
          )}
        </div>
      )
    },
    {
      key: 'wallet',
      label: 'Wallet',
      render: (value, row) => (
        <code style={{
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          backgroundColor: '#f3f4f6',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          color: '#374151'
        }}>
          {row.walletAddress}
        </code>
      )
    },
    {
      key: 'proposals',
      label: 'Proposals',
      align: 'center',
      render: (value, row) => (
        <div style={{
          fontSize: isMobile ? '0.8rem' : '0.875rem',
          fontWeight: '500',
          color: '#1f2937'
        }}>
          {row.totalProposals}
        </div>
      )
    },
    {
      key: 'successRate',
      label: 'Success Rate',
      align: 'center',
      render: (value, row) => (
        <div style={{
          fontSize: isMobile ? '0.8rem' : '0.875rem',
          fontWeight: '500',
          color: row.totalProposals > 0
            ? (row.approvedProposals / row.totalProposals) >= 0.7
              ? '#10b981'
              : '#f59e0b'
            : '#6b7280'
        }}>
          {row.totalProposals > 0
            ? `${Math.round((row.approvedProposals / row.totalProposals) * 100)}%`
            : 'N/A'
          }
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (value, row) => getStatusBadge(row.status, isMobile)
    }
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
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

  return (
    <AdminPageLayout>
      {({ isMobile }) => (
        <>
          <PageHeader
            title="Proposers Management"
            description="Manage project proposers and their proposal status"
            icon="👨‍💼"
            totalCount={displayProposers.length}
            showStats={true}
            isMobile={isMobile}
          >
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search proposers..."
              isMobile={isMobile}
            />
          </PageHeader>

          <MobileTable
            data={filteredProposers}
            columns={isMobile
              ? getTableColumns(isMobile).filter(col => col.key !== 'wallet')
              : getTableColumns(isMobile)
            }
            isMobile={isMobile}
            onRowAction={handleRowAction}
          />

          {error && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
              <p style={{ color: '#dc2626', fontWeight: '500' }}>{error}</p>
              <button
                onClick={refreshData}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!error && filteredProposers.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <p>No proposers found matching your search.</p>
            </div>
          )}
        </>
      )}
    </AdminPageLayout>
  );
};

export default Proposers;