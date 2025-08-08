/**
 * Proposers Management Page
 * Admin interface for managing project proposers
 */

import React, { useState, useEffect, use } from 'react';
import { useSelector } from 'react-redux';
import AdminPageLayout from '../common/AdminPageLayout';
import PageHeader from '../common/PageHeader';
import SearchBar from '../common/SearchBar';
import MobileTable from '../common/MobileTable';
import { useDAOData } from '../../hooks/useDAOData';
import { SecureFetch } from '../../../utils/securityHeaders';
import { TokenManager } from '../../../utils/secureStorage';

const Proposers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [apiProposers, setApiProposers] = useState([]);
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
    fetchProposers();
  }, [])

  // Use real DAO data
  const { proposers, isLoading: loading, error, refreshData } = useDAOData(currentNetwork, true);
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

  // Use API data first, then blockchain data, then fallback
  const displayProposers = apiProposers && apiProposers.length > 0
    ? apiProposers.map((proposer, index) => ({
      ...proposer,
      id: proposer.id || index + 1,
      name: proposer.name || `Proposer ${proposer.user_id}`,
      email: proposer.email || `proposer${proposer.user_id}@dao.com`,
      walletAddress: proposer.wallet_address !== "0" ? proposer.wallet_address : 'Not Connected',
      totalProposals: proposer.totalProposals || 0,
      approvedProposals: proposer.approvedProposals || 0,
      status: proposer.user_status || 'pending',
      joinDate: proposer.created_at ? new Date(proposer.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      profileImage: proposer.profile_image,
      loginCount: proposer.login_count || 0,
      lastLogin: proposer.last_login,
      profileStatus: proposer.profile_status || 'pending'
    }))
    : proposers && proposers.length > 0
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

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.last_page && page !== pagination.current_page) {
      fetchProposers(page);
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
            <nav aria-label="Proposers pagination">
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

  if (loading || apiLoading) {
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


  const fetchProposers = async (page = 1) => {
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
        `${baseUrl}/admin/entrepreneur?page=${page}`,
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
        console.log("Entrepreneurs fetched successfully:", result.data);
        setApiProposers(result.data || []);
        
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
        console.error("Failed to fetch entrepreneurs:", result.message);
        setApiError(result.message || 'Failed to fetch entrepreneurs');
      }

    } catch (err) {
      console.error('Error fetching proposers:', err.message);
      setApiError(err.message);

      // Handle token expiration
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        console.warn('Token may be expired, please re-authenticate');
      }
    } finally {
      setApiLoading(false);
    }
  };

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

          {/* Pagination Component */}
          {!loading && !apiLoading && !error && !apiError && apiProposers.length > 0 && (
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
                  fetchProposers(pagination.current_page);
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

          {!error && !apiError && filteredProposers.length === 0 && (
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