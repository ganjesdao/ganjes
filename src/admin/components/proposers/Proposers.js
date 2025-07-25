/**
 * Proposers Management Page
 * Admin interface for managing project proposers
 */

import React, { useState, useEffect } from 'react';
import PageHeader from '../common/PageHeader';
import SearchBar from '../common/SearchBar';
import MobileTable from '../common/MobileTable';

const Proposers = ({ isMobile }) => {
  const [proposers, setProposers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for proposers
  const mockProposers = [
    {
      id: 1,
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
      name: 'Jane Smith',
      email: 'jane@example.com',
      walletAddress: '0x8765...4321',
      totalProposals: 5,
      approvedProposals: 4,
      status: 'active',
      joinDate: '2024-02-20'
    },
    {
      id: 3,
      name: 'Bob Wilson',
      email: 'bob@example.com',
      walletAddress: '0x9876...1234',
      totalProposals: 1,
      approvedProposals: 0,
      status: 'pending',
      joinDate: '2024-07-10'
    }
  ];

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setProposers(mockProposers);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredProposers = proposers.filter(proposer =>
    proposer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proposer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
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

  const tableColumns = [
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
      render: (value, row) => getStatusBadge(row.status)
    }
  ];

  // Hide wallet column on mobile
  const visibleColumns = isMobile 
    ? tableColumns.filter(col => col.key !== 'wallet')
    : tableColumns;

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
    <div>
      <PageHeader
        title="Proposers Management"
        description="Manage project proposers and their proposal status"
        icon="👨‍💼"
        totalCount={proposers.length}
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
        columns={visibleColumns}
        isMobile={isMobile}
        onRowAction={handleRowAction}
      />

      {filteredProposers.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <p>No proposers found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default Proposers;