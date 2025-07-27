/**
 * Executed Proposals Page
 * Admin interface for viewing and managing executed proposals
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import AdminPageLayout from '../common/AdminPageLayout';
import PageHeader from '../common/PageHeader';
import SearchBar from '../common/SearchBar';
import MobileTable from '../common/MobileTable';
import { useDAOData } from '../../hooks/useDAOData';

const Executed = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { currentNetwork } = useSelector(state => state.auth);

  // Use real DAO data
  const {
    executedProposals,
    isLoading: loading,
    error,
    refreshData
  } = useDAOData(currentNetwork, true);

  // Fallback data for when real data is not available
  const fallbackExecutedProposals = [
    {
      id: 1,
      title: 'DeFi Trading Platform',
      proposer: 'John Doe',
      proposerWallet: '0x1234...5678',
      executionDate: '2024-07-20',
      votesFor: 125000,
      votesAgainst: 25000,
      totalVotes: 150000,
      fundingAmount: 50000,
      executionStatus: 'successful'
    },
    {
      id: 2,
      title: 'NFT Marketplace Upgrade',
      proposer: 'Jane Smith',
      proposerWallet: '0x8765...4321',
      executionDate: '2024-07-18',
      votesFor: 200000,
      votesAgainst: 15000,
      totalVotes: 215000,
      fundingAmount: 75000,
      executionStatus: 'successful'
    }
  ];

  // Use real data if available, otherwise fallback
  const displayExecutedProposals = executedProposals && executedProposals.length > 0
    ? executedProposals.map(proposal => ({
      ...proposal,
      title: proposal.projectName || `Proposal #${proposal.id}`,
      proposerWallet: proposal.proposer,
      fundingAmount: parseFloat(proposal.totalInvested || proposal.fundingGoal || 0),
      votesFor: parseFloat(proposal.totalVotesFor || 0),
      votesAgainst: parseFloat(proposal.totalVotesAgainst || 0),
      totalVotes: parseFloat(proposal.totalVotesFor || 0) + parseFloat(proposal.totalVotesAgainst || 0),
      executionStatus: proposal.passed ? 'successful' : 'failed',
      executionDate: proposal.endTime ? new Date(proposal.endTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }))
    : fallbackExecutedProposals;

  const filteredProposals = displayExecutedProposals.filter(proposal => {
    const matchesSearch = (proposal.title && proposal.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (proposal.proposer && proposal.proposer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (proposal.proposerWallet && proposal.proposerWallet.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || proposal.executionStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status, isMobile = false) => {
    const styles = {
      successful: { background: '#10b981', color: 'white' },
      failed: { background: '#ef4444', color: 'white' },
      pending: { background: '#f59e0b', color: 'white' }
    };

    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        backgroundColor: styles[status]?.background || '#6b7280',
        color: styles[status]?.color || 'white',
        fontSize: isMobile ? '0.7rem' : '0.75rem',
        fontWeight: '500'
      }}>
        {status === 'successful' ? '✅ Successful' :
          status === 'failed' ? '❌ Failed' :
            '⏳ Pending'}
      </span>
    );
  };

  const formatTokens = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const calculateSuccessRate = (votesFor, totalVotes) => {
    return Math.round((votesFor / totalVotes) * 100);
  };

  const handleRowAction = (action, row) => {
    console.log(`${action} action for executed proposal:`, row);
    // TODO: Implement actual actions
  };

  const getTableColumns = (isMobile = false) => [
    {
      key: 'proposal',
      label: 'Proposal',
      render: (value, row) => (
        <div>
          <div style={{
            fontWeight: '500',
            color: '#1f2937',
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            marginBottom: '0.25rem'
          }}>
            {row.title}
          </div>
          <div style={{
            color: '#6b7280',
            fontSize: isMobile ? '0.7rem' : '0.75rem'
          }}>
            By: {row.proposer}
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
              {row.proposerWallet}
            </code>
          )}
        </div>
      )
    },
    {
      key: 'executionDate',
      label: 'Execution Date',
      align: 'center',
      render: (value, row) => (
        <div style={{
          fontSize: isMobile ? '0.8rem' : '0.875rem',
          fontWeight: '500',
          color: '#1f2937'
        }}>
          {new Date(row.executionDate).toLocaleDateString()}
        </div>
      )
    },
    {
      key: 'voting',
      label: 'Voting Results',
      align: 'center',
      render: (value, row) => (
        <div>
          <div style={{
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            fontWeight: '500',
            color: '#1f2937'
          }}>
            {calculateSuccessRate(row.votesFor, row.totalVotes)}% Success
          </div>
          <div style={{
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            color: '#6b7280',
            marginTop: '0.125rem'
          }}>
            {formatTokens(row.votesFor)} / {formatTokens(row.totalVotes)}
          </div>
        </div>
      )
    },
    {
      key: 'funding',
      label: 'Funding',
      align: 'center',
      render: (value, row) => (
        <div style={{
          fontSize: isMobile ? '0.8rem' : '0.875rem',
          fontWeight: '500',
          color: row.executionStatus === 'successful' ? '#10b981' : '#6b7280'
        }}>
          ${formatTokens(row.fundingAmount)}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (value, row) => getStatusBadge(row.executionStatus, isMobile)
    }
  ];

  const totalExecuted = displayExecutedProposals.length;
  const successfulExecutions = displayExecutedProposals.filter(p => p.executionStatus === 'successful').length;
  const totalFunding = displayExecutedProposals
    .filter(p => p.executionStatus === 'successful')
    .reduce((sum, p) => sum + (p.fundingAmount || 0), 0);
  const totalVotes = displayExecutedProposals.reduce((sum, p) => sum + (p.totalVotes || 0), 0);

  if (loading) {
    return (
      <AdminPageLayout>
        {({ isMobile }) => (
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
        )}
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      {({ isMobile }) => (
        <>
          <PageHeader
            title="Executed Proposals"
            description="View and manage executed DAO proposals and their outcomes"
            icon="✅"
            totalCount={displayExecutedProposals.length}
            showStats={true}
            isMobile={isMobile}
          >
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '0.75rem' : '1rem',
              alignItems: isMobile ? 'stretch' : 'center'
            }}>
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder="Search proposals..."
                isMobile={isMobile}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  minWidth: isMobile ? 'auto' : '150px'
                }}
              >
                <option value="all">All Status</option>
                <option value="successful">Successful</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </PageHeader>

          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: isMobile ? '0.75rem' : '1rem',
            marginBottom: isMobile ? '1.5rem' : '2rem'
          }}>
            <div style={{
              padding: isMobile ? '0.75rem' : '1rem',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #dbeafe'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#3b82f6',
                fontWeight: '500'
              }}>
                TOTAL EXECUTED
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#1e40af'
              }}>
                {totalExecuted}
              </div>
            </div>
            <div style={{
              padding: isMobile ? '0.75rem' : '1rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #dcfce7'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#16a34a',
                fontWeight: '500'
              }}>
                SUCCESSFUL
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#15803d'
              }}>
                {successfulExecutions}
              </div>
            </div>
            <div style={{
              padding: isMobile ? '0.75rem' : '1rem',
              backgroundColor: '#fefce8',
              borderRadius: '8px',
              border: '1px solid #fef3c7'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#ca8a04',
                fontWeight: '500'
              }}>
                TOTAL FUNDING
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#a16207'
              }}>
                ${formatTokens(totalFunding)}
              </div>
            </div>
            <div style={{
              padding: isMobile ? '0.75rem' : '1rem',
              backgroundColor: '#fdf2f8',
              borderRadius: '8px',
              border: '1px solid #fce7f3'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: '#be185d',
                fontWeight: '500'
              }}>
                TOTAL VOTES
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#9d174d'
              }}>
                {formatTokens(totalVotes)}
              </div>
            </div>
          </div>

          <MobileTable
            data={filteredProposals}
            columns={getTableColumns(isMobile)}
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

          {!error && filteredProposals.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <p>No executed proposals found matching your criteria.</p>
            </div>
          )}
        </>
      )}
    </AdminPageLayout>
  );
};

export default Executed;