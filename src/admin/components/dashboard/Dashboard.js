/**
 * Admin Dashboard Component
 * Standalone dashboard with integrated layout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { selectUser, selectIsAuthenticated } from '../../store/slices/authSlice';
import { isTestnet, getContractAddress, NETWORKS } from '../../../utils/networks';
import { useDAOData } from '../../hooks/useDAOData';
import AdminHeader from '../common/AdminHeader';
import AdminSidebar from '../common/AdminSidebar';
import AdminFooter from '../common/AdminFooter';
import AdminNetworkSelector from '../network/AdminNetworkSelector';
import MetaMaskConnector from '../network/MetaMaskConnector';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ethers } from 'ethers';
import { daoABI } from '../../../Auth/Abi';



const Dashboard = () => {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [networkInitialized, setNetworkInitialized] = useState(false);
  const [stats, setStats] = useState({
    totalProposals: 0,
    approvedProposals: 0,
    runningProposals: 0,
    totalFunded: '0',
    activeInvestors: 0,
  });

  // Navigation items for header/sidebar
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

  // Network change handler
  const handleNetworkChange = useCallback((network) => {
    console.log('Dashboard: Network change handler called', {
      network,
      chainName: network?.chainName,
      chainId: network?.chainId
    });

    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      setContractAddress(address);
      console.log(`Dashboard connected to ${network.chainName}`, {
        network,
        contractAddress: address,
        isValidAddress: address && address !== '0x0000000000000000000000000000000000000000'
      });


      fetchProposalsOnNetworkChange(address, network);

    } else {
      setContractAddress(null);
      console.log('Dashboard: Network not supported or disconnected');
    }
  }, []);

  const handleMetaMaskConnected = (connectionInfo) => {
    console.log('MetaMask connected:', connectionInfo);
  };



  const fetchProposalsOnNetworkChange = async (contractAddr, network) => {

    const provider = new ethers.BrowserProvider(window.ethereum);
    const daoContract = new ethers.Contract(contractAddr, daoABI, provider);
    try {
      const totalProposals = await daoContract.getTotalProposals();
      const [approvedCount] = await daoContract.getApprovedProposals();
      const [runningCount] = await daoContract.getRunningProposals();
      const totalFunded = ethers.formatEther(await daoContract.getTotalFundedAmount());
      const activeInvestors = await daoContract.getActiveInvestorCount();


      setStats({
        totalProposals: totalProposals.toString(),
        approvedProposals: approvedCount.toString(),
        runningProposals: runningCount.toString(),
        totalFunded,
        activeInvestors: activeInvestors.toString(),
      });

      console.log('Stats:', {
        totalProposals: totalProposals.toString(),
        approvedProposals: approvedCount.toString(),
        runningProposals: runningCount.toString(),
        totalFunded,
        activeInvestors: activeInvestors.toString(),
      });
    } catch (err) {
      console.error('Error fetching analytics stats:', err);
      //toast.error('Failed to fetch analytics stats.');
    }
  };


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

  // Initialize with default network if no network is set
  useEffect(() => {
    const initializeDefaultNetwork = async () => {
      if (networkInitialized) return;

      console.log('Dashboard: Initializing default network...');

      // Try to get current MetaMask network first
      if (window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          console.log('Dashboard: Current MetaMask network:', chainId);

          // Check if current network is supported
          const supportedNetwork = Object.values(NETWORKS).find(network =>
            network.chainId === chainId
          );

          if (supportedNetwork) {
            console.log('Dashboard: Using current MetaMask network:', supportedNetwork.chainName);
            handleNetworkChange(supportedNetwork);
            setNetworkInitialized(true);
            return;
          }
        } catch (error) {
          console.warn('Dashboard: Failed to get current MetaMask network:', error);
        }
      }

      // Fallback to default network (configurable)
      // Priority: BSC Mainnet -> Ethereum Mainnet -> BSC Testnet
      const defaultNetwork = NETWORKS.bsc || NETWORKS.ethereum || NETWORKS.bscTestnet;
      console.log('Dashboard: Using default network:', defaultNetwork.chainName);
      handleNetworkChange(defaultNetwork);
      setNetworkInitialized(true);
    };

    // Initialize immediately
    initializeDefaultNetwork();
  }, [networkInitialized, handleNetworkChange]);

  // Use DAO data hook for live data
  const {
    dashboardMetrics,
    proposals,
    isLoading,
    isInitializing,
    error,
    lastUpdated,
    isNetworkSupported,
    refreshData
  } = useDAOData(currentNetwork, !!currentNetwork);

  // Get current page info
  const currentPath = location.pathname;
  const currentPage = navigationItems.find(item => currentPath.startsWith(item.path));

  // Authentication check
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Admin Sidebar */}
      <AdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? '0' : (sidebarOpen ? '280px' : '80px'),
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        {/* Admin Header */}
        <AdminHeader
          currentPage={currentPage}
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          currentNetwork={currentNetwork}
          contractAddress={contractAddress}
          onNetworkChange={handleNetworkChange}
          handleMetaMaskConnected={handleMetaMaskConnected}
        />

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
                      <AdminNetworkSelector
                        onNetworkChange={handleNetworkChange}
                        initialNetwork={currentNetwork}
                      />
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

          {/* Dashboard Content */}
          {!currentNetwork ? (
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
                animation: 'spin 1s linear infinite',
                marginBottom: '1rem'
              }} />
              <h2 style={{
                color: '#6b7280',
                fontSize: isMobile ? '1.25rem' : '1.5rem',
                marginBottom: '1rem'
              }}>
                Initializing Network Connection
              </h2>
              <p style={{
                color: '#9ca3af',
                fontSize: isMobile ? '0.9rem' : '1rem',
                textAlign: 'center'
              }}>
                Detecting network and setting up DAO connection...
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
          ) : currentNetwork && !isNetworkSupported ? (
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
          ) : (
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
                  Ganjes DAO Admin Portal 🚀
                </h2>
                <p style={{
                  color: '#6b7280',
                  fontSize: isMobile ? '0.95rem' : '1.125rem',
                  lineHeight: '1.5',
                  fontWeight: '500'
                }}>
                  Transforming the Future of Decentralized Funding
                </p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                  fontSize: isMobile ? '0.8rem' : '0.875rem',
                  color: '#059669'
                }}>
                  <span>🔗</span>
                  <span>Connected to {currentNetwork?.chainName || 'Network'}</span>
                  {lastUpdated && (
                    <>
                      <span style={{ color: '#6b7280' }}>•</span>
                      <span style={{ color: '#6b7280' }}>
                        Updated {lastUpdated.toLocaleTimeString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Live DAO Stats Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: isMobile ? '1rem' : '1.5rem',
                marginBottom: isMobile ? '1.5rem' : '2rem'
              }}>
                {/* Total Proposals */}
                <SimpleCard
                  title="Innovation Projects"
                  value={`${stats?.totalProposals}+`}
                  icon="🚀"
                  color="#3b82f6"
                  isMobile={isMobile}
                />

                {/* Active Proposals */}
                <SimpleCard
                  title="Innovation Unleashed"
                  value={stats?.approvedProposals + '+'}
                  icon="⚡"
                  color="#10b981"
                  isMobile={isMobile}
                />

                {/* Total Community */}
                <SimpleCard
                  title="Active Investors"
                  value={stats?.activeInvestors || 0}
                  icon="👥"
                  color="#8b5cf6"
                  isMobile={isMobile}
                />

                {/* Total Funded */}
                <SimpleCard
                  title="Total Impact Funding"
                  value={stats?.totalFunded + 'GNJ'}
                  icon="💎"
                  color="#f59e0b"
                  isMobile={isMobile}
                />


              </div>

              {/* Live Proposals Overview */}
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
                  📊 Recent Proposals Overview
                </h3>

                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      border: '2px solid #f3f3f3',
                      borderTop: '2px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 1rem'
                    }} />
                    Loading recent proposals...
                  </div>
                ) : proposals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    No proposals found on this network.
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '1rem'
                  }}>
                    {proposals.slice(0, 4).map((proposal) => (
                      <ProposalPreviewCard
                        key={proposal.id}
                        proposal={proposal}
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                )}

                {proposals.length > 4 && (
                  <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.9rem' : '1rem',
                        fontWeight: '500'
                      }}
                      onClick={() => window.location.href = '/admin/proposals'}
                    >
                      View All {proposals.length} Proposals
                    </button>
                  </div>
                )}
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
                    <InfoItem label="Network Type" value={isTestnet(currentNetwork.chainId) ? '🧪 Testnet' : '🌍 Mainnet'} isMobile={isMobile} />

                    <InfoItem label="Chain ID" value={parseInt(currentNetwork.chainId, 16)} isMobile={isMobile} />

                    <InfoItem label="Native Currency" value={currentNetwork.nativeCurrency.symbol} isMobile={isMobile} />
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
          )}
        </div>

        {/* Admin Footer */}
        <AdminFooter isMobile={isMobile} />
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

// Proposal Preview Card Component
const ProposalPreviewCard = ({ proposal, isMobile }) => {
  const isActive = new Date() < proposal.endTime && !proposal.executed;
  const statusColor = proposal.executed ? '#059669' : (isActive ? '#3b82f6' : '#6b7280');
  const statusText = proposal.executed ? 'Executed' : (isActive ? 'Active' : 'Ended');
  const statusIcon = proposal.executed ? '✅' : (isActive ? '🔄' : '⏰');

  return (
    <div style={{
      padding: isMobile ? '1rem' : '1.25rem',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      position: 'relative'
    }}>
      {/* Status Badge */}
      <div style={{
        position: 'absolute',
        top: '0.75rem',
        right: '0.75rem',
        padding: '0.25rem 0.5rem',
        backgroundColor: statusColor,
        color: 'white',
        borderRadius: '12px',
        fontSize: isMobile ? '0.7rem' : '0.75rem',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        {statusIcon} {statusText}
      </div>

      {/* Proposal Details */}
      <div style={{ marginRight: isMobile ? '4rem' : '5rem' }}>
        <h4 style={{
          fontSize: isMobile ? '0.9rem' : '1rem',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '0.5rem',
          lineHeight: '1.3'
        }}>
          Proposal #{proposal.id}
        </h4>

        <p style={{
          fontSize: isMobile ? '0.8rem' : '0.875rem',
          color: '#4b5563',
          marginBottom: '0.75rem',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {proposal.description || proposal.projectName}
        </p>

        {/* Key Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          fontSize: isMobile ? '0.7rem' : '0.75rem'
        }}>
          <div>
            <span style={{ color: '#6b7280', fontWeight: '500' }}>Goal:</span>
            <br />
            <span style={{ color: '#1f2937', fontWeight: '600' }}>
              {parseFloat(proposal.fundingGoal).toFixed(2)} {proposal.currency || 'ETH'}
            </span>
          </div>
          <div>
            <span style={{ color: '#6b7280', fontWeight: '500' }}>Invested:</span>
            <br />
            <span style={{ color: '#1f2937', fontWeight: '600' }}>
              {parseFloat(proposal.totalInvested || 0).toFixed(2)} {proposal.currency || 'ETH'}
            </span>
          </div>
          <div>
            <span style={{ color: '#6b7280', fontWeight: '500' }}>For:</span>
            <br />
            <span style={{ color: '#10b981', fontWeight: '600' }}>
              {proposal.votersFor || 0} votes
            </span>
          </div>
          <div>
            <span style={{ color: '#6b7280', fontWeight: '500' }}>Against:</span>
            <br />
            <span style={{ color: '#ef4444', fontWeight: '600' }}>
              {proposal.votersAgainst || 0} votes
            </span>
          </div>
        </div>

        {/* End Time */}
        {!proposal.executed && (
          <div style={{
            marginTop: '0.5rem',
            fontSize: isMobile ? '0.7rem' : '0.75rem',
            color: '#6b7280'
          }}>
            Ends: {proposal.endTime.toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;