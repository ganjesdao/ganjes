/**
 * Investors Management Page
 * Admin interface for managing investors and their activities
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import AdminPageLayout from '../common/AdminPageLayout';
import PageHeader from '../common/PageHeader';
import SearchBar from '../common/SearchBar';
import MobileTable from '../common/MobileTable';
import { useDAOData } from '../../hooks/useDAOData';
import { SecureFetch } from '../../../utils/securityHeaders';
import { TokenManager } from '../../../utils/secureStorage';

const Investors = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [apiInvestors, setApiInvestors] = useState([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 1,
    next_page_url: null,
    prev_page_url: null
  });
  const { currentNetwork, token, isAuthenticated } = useSelector(state => state.auth);
  const baseUrl = process.env.REACT_APP_BASE_API_URL;

  useEffect(() => {
    fetchInvestors();
  }, []);

  // Use real DAO data
  const {
    investors,
    isLoading: loading,
    error,
    refreshData
  } = useDAOData(currentNetwork, true);

  // Fallback data for when real data is not available
  const fallbackInvestors = [
    {
      id: 1,
      address: '0xabcd...efgh',
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
      address: '0x1234...9876',
      name: 'Mark Rodriguez',
      email: 'mark@example.com',
      walletAddress: '0x1234...9876',
      tokenBalance: 125000,
      totalInvested: 75000,
      activeInvestments: 15,
      votingPower: 125000,
      status: 'active',
      joinDate: '2024-01-25'
    }
  ];

  const fetchInvestors = async (page = 1) => {
    try {
      setApiLoading(true);
      setApiError(null);

      // Check authentication first
      if (!isAuthenticated) {
        setApiError('User not authenticated');
        return;
      }

      // Get current token from TokenManager as fallback
      const currentToken = token || TokenManager.getAuthToken();

      if (!currentToken) {
        setApiError('No valid auth token available');
        return;
      }

      const response = await SecureFetch.fetch(
        `${baseUrl}/admin/investor?page=${page}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}) // Empty body for POST request
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status) {
        console.log("Investors fetched successfully:", result.data);
        setApiInvestors(result.data || []);
        
        // Update pagination state
        if (result.pagination) {
          setPagination({
            total: result.pagination.total,
            per_page: result.pagination.per_page,
            current_page: result.pagination.current_page,
            last_page: result.pagination.last_page,
            next_page_url: result.pagination.next_page_url,
            prev_page_url: result.pagination.prev_page_url
          });
        }
      } else {
        console.error("Failed to fetch investors:", result.message);
        setApiError(result.message || 'Failed to fetch investors');
      }

    } catch (err) {
      console.error('Error fetching investors:', err.message);
      setApiError(err.message);

      // Handle token expiration
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        console.warn('Token may be expired, please re-authenticate');
      }
    } finally {
      setApiLoading(false);
    }
  };

  // Use API data first, then blockchain data, then fallback
  const displayInvestors = apiInvestors && apiInvestors.length > 0
    ? apiInvestors.map((investor, index) => ({
      ...investor,
      id: investor.id || index + 1,
      name: investor.name || investor.username || `Investor ${index + 1}`,
      email: investor.email || `investor${index + 1}@dao.com`,
      walletAddress: investor.walletAddress || investor.address || investor.wallet,
      tokenBalance: investor.tokenBalance || investor.balance || 0,
      totalInvested: investor.totalInvested || investor.invested || 0,
      activeInvestments: investor.activeInvestments || investor.investments || 0,
      votingPower: investor.votingPower || investor.tokenBalance || investor.balance || 0,
      status: investor.status || 'active',
      joinDate: investor.joinDate || investor.createdAt || new Date().toISOString().split('T')[0]
    }))
    : investors && investors.length > 0 ? investors : fallbackInvestors;

  const filteredInvestors = displayInvestors.filter(investor =>
    (investor.name && investor.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (investor.email && investor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (investor.address && investor.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status, isMobile = false) => {
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
        fontSize: isMobile ? '0.7rem' : '0.75rem',
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

  const handleRowAction = (action, row) => {
    console.log(`${action} action for investor:`, row);
    // TODO: Implement actual actions
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.last_page && page !== pagination.current_page) {
      fetchInvestors(page);
    }
  };

  const PaginationComponent = () => {
    const { current_page, last_page, total, per_page } = pagination;
    
    if (last_page <= 1) return null;

    const startItem = (current_page - 1) * per_page + 1;
    const endItem = Math.min(current_page * per_page, total);

    const getVisiblePages = () => {
      const visiblePages = [];
      const maxVisible = 5;
      
      if (last_page <= maxVisible) {
        for (let i = 1; i <= last_page; i++) {
          visiblePages.push(i);
        }
      } else {
        if (current_page <= 3) {
          for (let i = 1; i <= 4; i++) {
            visiblePages.push(i);
          }
          visiblePages.push('...');
          visiblePages.push(last_page);
        } else if (current_page >= last_page - 2) {
          visiblePages.push(1);
          visiblePages.push('...');
          for (let i = last_page - 3; i <= last_page; i++) {
            visiblePages.push(i);
          }
        } else {
          visiblePages.push(1);
          visiblePages.push('...');
          for (let i = current_page - 1; i <= current_page + 1; i++) {
            visiblePages.push(i);
          }
          visiblePages.push('...');
          visiblePages.push(last_page);
        }
      }
      
      return visiblePages;
    };

    return (
      <div style={{ marginTop: '2rem' }}>
        <div className="row align-items-center">
          <div className="col-md-6 col-12 mb-3 mb-md-0">
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Showing {startItem} to {endItem} of {total} results
            </div>
          </div>
          <div className="col-md-6 col-12">
            <nav aria-label="Investors pagination">
              <ul className="pagination justify-content-md-end justify-content-center mb-0">
                <li className={`page-item ${current_page === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => handlePageChange(current_page - 1)}
                    disabled={current_page === 1}
                    style={{
                      border: '1px solid #e5e7eb',
                      color: current_page === 1 ? '#9ca3af' : '#374151',
                      background: current_page === 1 ? '#f9fafb' : 'white'
                    }}
                  >
                    Previous
                  </button>
                </li>
                
                {getVisiblePages().map((page, index) => (
                  <li key={index} className={`page-item ${page === current_page ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}>
                    {page === '...' ? (
                      <span className="page-link" style={{ border: '1px solid #e5e7eb', color: '#9ca3af' }}>...</span>
                    ) : (
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(page)}
                        style={{
                          border: '1px solid #e5e7eb',
                          background: page === current_page ? '#3b82f6' : 'white',
                          color: page === current_page ? 'white' : '#374151'
                        }}
                      >
                        {page}
                      </button>
                    )}
                  </li>
                ))}
                
                <li className={`page-item ${current_page === last_page ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => handlePageChange(current_page + 1)}
                    disabled={current_page === last_page}
                    style={{
                      border: '1px solid #e5e7eb',
                      color: current_page === last_page ? '#9ca3af' : '#374151',
                      background: current_page === last_page ? '#f9fafb' : 'white'
                    }}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const getTableColumns = (isMobile = false) => [
    {
      key: 'investor',
      label: 'Investor',
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
      key: 'tokens',
      label: 'Token Balance',
      align: 'center',
      render: (value, row) => (
        <div>
          <div style={{
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            fontWeight: '500',
            color: '#1f2937'
          }}>
            {formatTokens(row.tokenBalance)} GNJS
          </div>
          <div style={{
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            color: '#6b7280',
            marginTop: '0.125rem'
          }}>
            Voting: {formatTokens(row.votingPower)}
          </div>
        </div>
      )
    },
    {
      key: 'investments',
      label: 'Investments',
      align: 'center',
      render: (value, row) => (
        <div>
          <div style={{
            fontSize: isMobile ? '0.8rem' : '0.875rem',
            fontWeight: '500',
            color: '#1f2937'
          }}>
            ${formatTokens(row.totalInvested)}
          </div>
          <div style={{
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            color: '#6b7280',
            marginTop: '0.125rem'
          }}>
            {row.activeInvestments} active
          </div>
        </div>
      )
    },
    {
      key: 'tier',
      label: 'Tier',
      align: 'center',
      render: (value, row) => {
        const tier = getInvestorTier(row.tokenBalance);
        return (
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            backgroundColor: tier.color,
            color: 'white',
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            fontWeight: '500'
          }}>
            {tier.name}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (value, row) => getStatusBadge(row.status, isMobile)
    }
  ];

  const totalTokens = displayInvestors.reduce((sum, investor) => sum + (investor.tokenBalance || 0), 0);
  const totalInvested = displayInvestors.reduce((sum, investor) => sum + (investor.totalInvested || 0), 0);
  const activeInvestors = displayInvestors.filter(investor => investor.status === 'active').length;

  if (loading || apiLoading) {
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
            title="Investors Management"
            description="Manage investors, their portfolios and voting power"
            icon="👥"
            totalCount={displayInvestors.length}
            showStats={true}
            isMobile={isMobile}
          >
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search investors..."
              isMobile={isMobile}
            />
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
                TOTAL INVESTORS
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#1e40af'
              }}>
                {displayInvestors.length}
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
                ACTIVE INVESTORS
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#15803d'
              }}>
                {activeInvestors}
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
                TOTAL TOKENS
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#a16207'
              }}>
                {formatTokens(totalTokens)} GNJS
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
                TOTAL INVESTED
              </div>
              <div style={{
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                fontWeight: '700',
                color: '#9d174d'
              }}>
                ${formatTokens(totalInvested)}
              </div>
            </div>
          </div>

          <MobileTable
            data={filteredInvestors}
            columns={isMobile
              ? getTableColumns(isMobile).filter(col => col.key !== 'wallet')
              : getTableColumns(isMobile)
            }
            isMobile={isMobile}
            onRowAction={handleRowAction}
          />

          {/* Pagination Component */}
          {!loading && !apiLoading && !error && !apiError && apiInvestors.length > 0 && (
            <PaginationComponent />
          )}

          {(error || apiError) && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
              <p style={{ color: '#dc2626', fontWeight: '500' }}>{error || apiError}</p>
              <button
                onClick={() => {
                  refreshData();
                  fetchInvestors(pagination.current_page);
                }}
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

          {!error && !apiError && filteredInvestors.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <p>No investors found matching your search.</p>
            </div>
          )}
        </>
      )}
    </AdminPageLayout>
  );
};

export default Investors;