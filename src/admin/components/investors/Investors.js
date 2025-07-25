/**
 * Investors Management Page
 * Admin interface for managing investors and their activities
 */

import React, { useState, useEffect } from 'react';

const Investors = () => {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for investors
  const mockInvestors = [
    {
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      walletAddress: '0xabcd...efgh',
      tokenBalance: 50000,
      totalInvested: 25000,
      activeInvestments: 8,
      votingPower: 50000,
      status: 'active',
      joinDate: '2024-01-10'
    },
    {
      id: 2,
      name: 'Mark Rodriguez',
      email: 'mark@example.com',
      walletAddress: '0x1234...9876',
      tokenBalance: 125000,
      totalInvested: 75000,
      activeInvestments: 15,
      votingPower: 125000,
      status: 'active',
      joinDate: '2024-01-25'
    },
    {
      id: 3,
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      walletAddress: '0x5678...abcd',
      tokenBalance: 30000,
      totalInvested: 15000,
      activeInvestments: 5,
      votingPower: 30000,
      status: 'active',
      joinDate: '2024-03-05'
    },
    {
      id: 4,
      name: 'David Kim',
      email: 'david@example.com',
      walletAddress: '0x9999...0000',
      tokenBalance: 5000,
      totalInvested: 2500,
      activeInvestments: 2,
      votingPower: 5000,
      status: 'inactive',
      joinDate: '2024-06-15'
    }
  ];

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setInvestors(mockInvestors);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredInvestors = investors.filter(investor =>
    investor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const colors = {
      active: '#10b981',
      inactive: '#6b7280',
      suspended: '#ef4444'
    };
    
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        backgroundColor: colors[status] || '#6b7280',
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: '500'
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatTokens = (amount) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  const getInvestorTier = (tokenBalance) => {
    if (tokenBalance >= 100000) return { name: 'Platinum', color: '#8b5cf6' };
    if (tokenBalance >= 50000) return { name: 'Gold', color: '#f59e0b' };
    if (tokenBalance >= 20000) return { name: 'Silver', color: '#6b7280' };
    return { name: 'Bronze', color: '#cd7c2f' };
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

  const totalTokens = investors.reduce((sum, investor) => sum + investor.tokenBalance, 0);
  const totalInvested = investors.reduce((sum, investor) => sum + investor.totalInvested, 0);
  const activeInvestors = investors.filter(investor => investor.status === 'active').length;

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
              👥 Investors Management
            </h2>
            <p style={{
              color: '#6b7280',
              fontSize: '0.875rem',
              margin: '0.25rem 0 0 0'
            }}>
              Manage investors, their portfolios and voting power
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
              TOTAL INVESTORS
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>
              {investors.length}
            </div>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #dcfce7'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '500' }}>
              ACTIVE INVESTORS
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#15803d' }}>
              {activeInvestors}
            </div>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#fefce8',
            borderRadius: '8px',
            border: '1px solid #fef3c7'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#ca8a04', fontWeight: '500' }}>
              TOTAL TOKENS
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#a16207' }}>
              {formatTokens(totalTokens)} GNJS
            </div>
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#fdf2f8',
            borderRadius: '8px',
            border: '1px solid #fce7f3'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#be185d', fontWeight: '500' }}>
              TOTAL INVESTED
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#9d174d' }}>
              ${formatTokens(totalInvested)}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search investors..."
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

      {/* Investors Table */}
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
                  Investor
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Wallet Address
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Token Balance
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Investments
                </th>
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '0.875rem'
                }}>
                  Tier
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
              {filteredInvestors.map((investor) => {
                const tier = getInvestorTier(investor.tokenBalance);
                return (
                  <tr key={investor.id} style={{
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    <td style={{ padding: '1rem' }}>
                      <div>
                        <div style={{
                          fontWeight: '500',
                          color: '#1f2937',
                          fontSize: '0.875rem'
                        }}>
                          {investor.name}
                        </div>
                        <div style={{
                          color: '#6b7280',
                          fontSize: '0.75rem',
                          marginTop: '0.25rem'
                        }}>
                          {investor.email}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <code style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#f3f4f6',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        color: '#374151'
                      }}>
                        {investor.walletAddress}
                      </code>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {formatTokens(investor.tokenBalance)} GNJS
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.25rem'
                      }}>
                        Voting Power: {formatTokens(investor.votingPower)}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        ${formatTokens(investor.totalInvested)}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.25rem'
                      }}>
                        {investor.activeInvestments} active
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        backgroundColor: tier.color,
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {tier.name}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {getStatusBadge(investor.status)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button style={{
                          padding: '0.5rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}>
                          👁️
                        </button>
                        <button style={{
                          padding: '0.5rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}>
                          📊
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredInvestors.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <p>No investors found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default Investors;