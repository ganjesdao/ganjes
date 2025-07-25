/**
 * Executed Proposals Page
 * Admin interface for viewing and managing executed proposals
 */

import React, { useState, useEffect } from 'react';

const Executed = () => {
  const [executedProposals, setExecutedProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock data for executed proposals
  const mockExecutedProposals = [
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
      executionStatus: 'successful',
      blockHash: '0xabcd...efgh',
      gasUsed: 45000,
      transactionHash: '0x9876...5432'
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
      executionStatus: 'successful',
      blockHash: '0x1111...2222',
      gasUsed: 52000,
      transactionHash: '0x3333...4444'
    },
    {
      id: 3,
      title: 'Mobile App Development',
      proposer: 'Bob Wilson',
      proposerWallet: '0x9876...1234',
      executionDate: '2024-07-15',
      votesFor: 80000,
      votesAgainst: 70000,
      totalVotes: 150000,
      fundingAmount: 30000,
      executionStatus: 'failed',
      blockHash: '0x5555...6666',
      gasUsed: 28000,
      transactionHash: '0x7777...8888'
    },
    {
      id: 4,
      title: 'Community Gaming Platform',
      proposer: 'Alice Johnson',
      proposerWallet: '0xaaaa...bbbb',
      executionDate: '2024-07-10',
      votesFor: 175000,
      votesAgainst: 35000,
      totalVotes: 210000,
      fundingAmount: 85000,
      executionStatus: 'successful',
      blockHash: '0xcccc...dddd',
      gasUsed: 61000,
      transactionHash: '0xeeee...ffff'
    }
  ];

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setExecutedProposals(mockExecutedProposals);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredProposals = executedProposals.filter(proposal => {
    const matchesSearch = proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         proposal.proposer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || proposal.executionStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
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
        fontSize: '0.75rem',
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

  const totalExecuted = executedProposals.length;
  const successfulExecutions = executedProposals.filter(p => p.executionStatus === 'successful').length;
  const totalFunding = executedProposals
    .filter(p => p.executionStatus === 'successful')
    .reduce((sum, p) => sum + p.fundingAmount, 0);
  const totalVotes = executedProposals.reduce((sum, p) => sum + p.totalVotes, 0);

  return (
    <div>
      {/* Header Section */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              ✅ Executed Proposals
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              margin: '0.25rem 0 0 0'
            }}>
              View and analyze executed proposals and their outcomes
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #dbeafe'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '500' }}>
              TOTAL EXECUTED
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>
              {totalExecuted}
            </div>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #dcfce7'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '500' }}>
              SUCCESS RATE
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#15803d' }}>
              {totalExecuted > 0 ? Math.round((successfulExecutions / totalExecuted) * 100) : 0}%
            </div>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#fefce8',
            borderRadius: '8px',
            border: '1px solid #fef3c7'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#ca8a04', fontWeight: '500' }}>
              TOTAL FUNDING
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#a16207' }}>
              ${formatTokens(totalFunding)}
            </div>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#fdf2f8',
            borderRadius: '8px',
            border: '1px solid #fce7f3'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#be185d', fontWeight: '500' }}>
              TOTAL VOTES
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#9d174d' }}>
              {formatTokens(totalVotes)}
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search executed proposals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem',
              minWidth: '150px'
            }}
          >
            <option value="all">All Status</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
          </select>
          <button style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            🔍 Search
          </button>
        </div>
      </div>

      {/* Executed Proposals Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Proposal
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Execution Date
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Voting Results
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Funding
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Status
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((proposal) => (
                <tr key={proposal.id} style={{
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <td style={{ padding: '1rem' }}>
                    <div>
                      <div style={{
                        fontWeight: '500',
                        color: '#1f2937',
                        fontSize: '0.875rem',
                        marginBottom: '0.25rem'
                      }}>
                        {proposal.title}
                      </div>
                      <div style={{
                        color: '#6b7280',
                        fontSize: '0.75rem'
                      }}>
                        By: {proposal.proposer}
                      </div>
                      <code style={{
                        fontSize: '0.6rem',
                        backgroundColor: '#f3f4f6',
                        padding: '0.125rem 0.25rem',
                        borderRadius: '3px',
                        color: '#374151',
                        marginTop: '0.25rem',
                        display: 'block'
                      }}>
                        {proposal.proposerWallet}
                      </code>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#1f2937'
                    }}>
                      {new Date(proposal.executionDate).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '0.875rem',
                      marginBottom: '0.25rem'
                    }}>
                      <span style={{ color: '#10b981', fontWeight: '500' }}>
                        {formatTokens(proposal.votesFor)}
                      </span>
                      {' vs '}
                      <span style={{ color: '#ef4444', fontWeight: '500' }}>
                        {formatTokens(proposal.votesAgainst)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      {calculateSuccessRate(proposal.votesFor, proposal.totalVotes)}% approval
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: proposal.executionStatus === 'successful' ? '#10b981' : '#6b7280'
                    }}>
                      ${formatTokens(proposal.fundingAmount)}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {getStatusBadge(proposal.executionStatus)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        title="View on Blockchain"
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        🔗
                      </button>
                      <button
                        title="View Details"
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        👁️
                      </button>
                      <button
                        title="Download Report"
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        📄
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredProposals.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <p>No executed proposals found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Executed;