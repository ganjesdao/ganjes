/**
 * Admin Layout Component
 * Layout with sidebar navigation for admin panel
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutAsync } from '../../store/slices/authSlice';
import { selectUser, selectIsAuthenticated } from '../../store/slices/authSlice';
import { ToastContainer } from 'react-toastify';
import AdminNetworkSelector from '../network/AdminNetworkSelector';
import MetaMaskConnector from '../network/MetaMaskConnector';
import { getContractAddress } from '../../../utils/networks';
import 'react-toastify/dist/ReactToastify.css';

const AdminLayout = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);

  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: '📊',
      description: 'Overview & Analytics'
    },
    {
      name: 'Proposers',
      path: '/admin/proposers',
      icon: '👨‍💼',
      description: 'Manage Proposers'
    },
    {
      name: 'Investors',
      path: '/admin/investors',
      icon: '👥',
      description: 'Manage Investors'
    },
    {
      name: 'Executed',
      path: '/admin/executed',
      icon: '✅',
      description: 'Executed Proposals'
    }
  ];

  // Mobile detection and responsive handling
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On mobile, start with sidebar closed
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutAsync());
    navigate('/admin/login');
  };

  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      setContractAddress(address);
      console.log(`Admin connected to ${network.chainName}`, { network, contractAddress: address });
    } else {
      setContractAddress(null);
      console.log('Network not supported or disconnected');
    }
  };

  const handleMetaMaskConnected = (connectionInfo) => {
    console.log('MetaMask connected:', connectionInfo);
  };

  const currentPath = location.pathname;
  const currentPage = navigationItems.find(item => currentPath.startsWith(item.path));

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: isMobile ? (sidebarOpen ? '280px' : '0px') : (sidebarOpen ? '280px' : '80px'),
        backgroundColor: '#1f2937',
        color: 'white',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 1000,
        overflow: 'hidden',
        left: isMobile && !sidebarOpen ? '-280px' : '0'
      }}>
        {/* Logo/Header */}
        <div style={{
          padding: isMobile ? '1rem' : '1.5rem',
          borderBottom: '1px solid #374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: (sidebarOpen || isMobile) ? 'space-between' : 'center'
        }}>
          {(sidebarOpen || isMobile) && (
            <div>
              <h2 style={{
                fontSize: isMobile ? '1.1rem' : '1.25rem',
                fontWeight: 'bold',
                margin: 0,
                color: 'white'
              }}>
                🔐 Ganjes Admin
              </h2>
              <p style={{
                fontSize: '0.75rem',
                margin: '0.25rem 0 0 0',
                color: '#9ca3af'
              }}>
                Administration Panel
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: isMobile ? '1.5rem' : '1.25rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#374151'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {isMobile ? (sidebarOpen ? '✕' : '☰') : (sidebarOpen ? '◀' : '▶')}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: isMobile ? '0.5rem 0' : '1rem 0' }}>
          {navigationItems.map(item => {
            const isActive = currentPath.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  // Close sidebar on mobile after navigation
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                style={{
                  width: '100%',
                  padding: (sidebarOpen || isMobile) ? (isMobile ? '0.75rem 1rem' : '1rem 1.5rem') : '1rem',
                  backgroundColor: isActive ? '#3b82f6' : 'transparent',
                  color: 'white',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '0.75rem' : '1rem',
                  fontSize: isMobile ? '0.8rem' : '0.875rem',
                  transition: 'all 0.2s ease',
                  margin: isMobile ? '0.125rem 0.5rem' : '0.25rem 1rem',
                  borderRadius: '8px'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = '#374151';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ 
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  minWidth: '24px',
                  textAlign: 'center'
                }}>
                  {item.icon}
                </span>
                {(sidebarOpen || isMobile) && (
                  <div>
                    <div style={{ fontWeight: '600' }}>{item.name}</div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: isActive ? '#e0e7ff' : '#9ca3af',
                      marginTop: '0.125rem'
                    }}>
                      {item.description}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          borderTop: '1px solid #374151'
        }}>
          {(sidebarOpen || isMobile) && (
            <div style={{
              marginBottom: '1rem',
              padding: isMobile ? '0.5rem' : '0.75rem',
              backgroundColor: '#374151',
              borderRadius: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.5rem' : '0.75rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  width: isMobile ? '28px' : '32px',
                  height: isMobile ? '28px' : '32px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: '500'
                }}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div>
                  <div style={{ 
                    fontWeight: '500', 
                    fontSize: isMobile ? '0.8rem' : '0.875rem' 
                  }}>
                    {user?.name || 'Admin User'}
                  </div>
                  <div style={{ 
                    color: '#9ca3af', 
                    fontSize: isMobile ? '0.7rem' : '0.75rem' 
                  }}>
                    Administrator
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: (sidebarOpen || isMobile) ? (isMobile ? '0.6rem' : '0.75rem') : '0.75rem 0.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: (sidebarOpen || isMobile) ? 'center' : 'center',
              gap: (sidebarOpen || isMobile) ? '0.5rem' : '0',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            <span style={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}>🚪</span>
            {(sidebarOpen || isMobile) && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? '0' : (sidebarOpen ? '280px' : '80px'),
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        {/* Top Bar */}
        <header style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: isMobile ? '1rem' : '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Mobile Menu Button */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px'
                }}
              >
                ☰
              </button>
            )}
            
            <div>
              <h1 style={{
                fontSize: isMobile ? '1.2rem' : '1.5rem',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                {currentPage ? `${currentPage.icon} ${currentPage.name}` : '🔐 Admin Panel'}
              </h1>
              {currentPage && !isMobile && (
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  margin: '0.25rem 0 0 0'
                }}>
                  {currentPage.description}
                </p>
              )}
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '1rem',
            fontSize: '0.875rem',
            color: '#6b7280',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}>
            {/* Network Selector or MetaMask Connector */}
            {!isMobile && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.25rem'
              }}>
                {window.ethereum ? (
                  <>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      fontWeight: '500',
                      marginBottom: '0.25rem'
                    }}>
                      NETWORK:
                    </span>
                    <AdminNetworkSelector onNetworkChange={handleNetworkChange} />
                  </>
                ) : (
                  <>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      fontWeight: '500',
                      marginBottom: '0.25rem'
                    }}>
                      WALLET:
                    </span>
                    <MetaMaskConnector onConnected={handleMetaMaskConnected} />
                  </>
                )}
              </div>
            )}
            
            {/* Contract Address Display - Hidden on mobile */}
            {!isMobile && currentNetwork && contractAddress && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#eff6ff',
                borderRadius: '8px',
                border: '1px solid #dbeafe'
              }}>
                <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '500' }}>
                  CONTRACT:
                </span>
                <code style={{
                  fontSize: '0.75rem',
                  color: '#1e40af',
                  backgroundColor: 'transparent',
                  padding: 0
                }}>
                  {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                </code>
              </div>
            )}
            
            {/* User Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <span>👤</span>
              {!isMobile && (
                <span style={{ fontWeight: '500' }}>
                  {user?.email || 'admin@ganjes.io'}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          padding: isMobile ? '1rem' : '2rem',
          overflow: 'auto'
        }}>
          {/* Mobile Network Selector */}
          {isMobile && (
            <div style={{
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  {window.ethereum ? (
                    <>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#6b7280', 
                        fontWeight: '500',
                        display: 'block',
                        marginBottom: '0.5rem'
                      }}>
                        NETWORK:
                      </span>
                      <AdminNetworkSelector onNetworkChange={handleNetworkChange} />
                    </>
                  ) : (
                    <>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#6b7280', 
                        fontWeight: '500',
                        display: 'block',
                        marginBottom: '0.5rem'
                      }}>
                        WALLET:
                      </span>
                      <MetaMaskConnector onConnected={handleMetaMaskConnected} />
                    </>
                  )}
                </div>
                
                {/* Mobile Contract Address */}
                {currentNetwork && contractAddress && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end'
                  }}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: '#3b82f6', 
                      fontWeight: '500',
                      marginBottom: '0.25rem'
                    }}>
                      CONTRACT:
                    </span>
                    <code style={{
                      fontSize: '0.7rem',
                      color: '#1e40af',
                      backgroundColor: '#f3f4f6',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {React.Children.map(children, child =>
            React.isValidElement(child)
              ? React.cloneElement(child, { 
                  currentNetwork, 
                  contractAddress,
                  onNetworkChange: handleNetworkChange,
                  isMobile
                })
              : child
          )}
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default AdminLayout;