/**
 * Admin Dashboard Component
 * Standalone dashboard with integrated layout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { selectUser, selectIsAuthenticated } from '../../store/slices/authSlice';
import { isTestnet, getContractAddress, NETWORKS } from '../../../utils/networks';
import { ethers } from 'ethers';
import { daoABI } from '../../../Auth/Abi';
import { useDAOData } from '../../hooks/useDAOData';
import AdminHeader from '../common/AdminHeader';
import AdminSidebar from '../common/AdminSidebar';
import AdminFooter from '../common/AdminFooter';
import AdminNetworkSelector from '../network/AdminNetworkSelector';
import MetaMaskConnector from '../network/MetaMaskConnector';
import ConnectionGuide from '../common/ConnectionGuide';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



const Dashboard = () => {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const [proposalDetails, setProposalDetails] = useState([]);

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

  useEffect(() => {
    refreshData();
    // Reset sidebar open state whenever the route changes
    setSidebarOpen(isMobile ? false : true);
  }, [location, isMobile]);

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
    // Check if MetaMask is available
    if (!window.ethereum) {
      console.warn('MetaMask not detected, skipping stats fetch');
      return;
    }

    // Check if contract address is valid
    if (!contractAddr || contractAddr === '0x0000000000000000000000000000000000000000') {
      console.warn('Invalid contract address, skipping stats fetch');
      return;
    }

    try {
      // Check if MetaMask is connected
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        console.log('MetaMask not connected, skipping stats fetch');
        return;
      }

      // Create provider with error handling
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Test provider connection
      await provider.getNetwork();

      // Get signer with error handling
      const signer = await provider.getSigner();

      // Test signer
      await signer.getAddress();

      const daoContract = new ethers.Contract(contractAddr, daoABI, signer);


      // Test contract connection with a simple call
      await daoContract.proposalCount();

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



      try {
        const proposalIds = await daoContract.getAllProposalIds();
        const proposalData = [];

        for (const id of proposalIds) {
          try {
            const basic = await daoContract.getProposalBasicDetails(id);
            const voting = await daoContract.getProposalVotingDetails(id);

            proposalData.push({
              id: basic.id.toString(),
              projectName: basic.projectName,
              projectUrl: basic.projectUrl,
              description: basic.description,
              fundingGoal: ethers.formatEther(basic.fundingGoal),
              totalInvested: ethers.formatEther(voting.totalInvested),
              endTime: new Date(Number(basic.endTime) * 1000).toLocaleString(),
              passed: basic.passed,
            });
          } catch (proposalError) {
            console.warn(`Failed to fetch proposal ${id}:`, proposalError);
          }
        }

        setProposalDetails(proposalData);
        console.log('Proposals loaded:', proposalData);
      } catch (proposalError) {
        console.warn('Failed to fetch proposals:', proposalError);
        setProposalDetails([]);
      }

    } catch (err) {
      console.error(`Error fetching analytics stats for ${network?.chainName}:`, err);

      // Set default stats on error
      setStats({
        totalProposals: 0,
        approvedProposals: 0,
        runningProposals: 0,
        totalFunded: '0',
        activeInvestors: 0,
      });

      setProposalDetails([]);

      // Only show error toast if it's not a connection issue
      if (!err.message.includes('user rejected') && !err.message.includes('User denied')) {
        console.warn(`Failed to connect to ${network?.chainName}: ${err.message}`);
      }
    }
  };


  // Handle mobile state change from sidebar
  const handleMobileChange = useCallback((mobile) => {
    setIsMobile(mobile);
  }, []);

  // Initialize with default network if no network is set
  useEffect(() => {
    const initializeDefaultNetwork = async () => {
      if (networkInitialized) return;

      console.log('Dashboard: Initializing default network...');

      // Try to get current MetaMask network first
      if (window.ethereum) {
        try {
          // Check if MetaMask is connected first
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });

          if (accounts.length > 0) {
            // MetaMask is connected, get current network
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
            } else {
              console.log('Dashboard: Current network not supported, will use default');
            }
          } else {
            console.log('Dashboard: MetaMask not connected, will use default network');
          }
        } catch (error) {
          console.warn('Dashboard: Failed to get current MetaMask network:', error);
        }
      } else {
        console.log('Dashboard: MetaMask not detected, will use default network');
      }

      // Fallback to default network (configurable)
      // Priority: BSC Testnet -> BSC Mainnet -> Ethereum Mainnet
      const defaultNetwork = NETWORKS.BSC_TESTNET || NETWORKS.BSC_MAINNET || NETWORKS.ETH_MAINNET;
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
        onMobileChange={handleMobileChange}
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

              {/* Connection Guide - Show when MetaMask connection issues */}
              {error && (error.includes('not connected') || error.includes('not detected')) && (
                <ConnectionGuide
                  onConnected={handleMetaMaskConnected}
                  isMobile={isMobile}
                />
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
              {/* 📊 Recent Proposals Overview - Unique Design */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '24px',
                padding: '0',
                boxShadow: '0 20px 40px rgba(102, 126, 234, 0.15)',
                marginBottom: isMobile ? '1.5rem' : '2rem',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {/* Floating Background Elements */}
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '50%',
                  filter: 'blur(30px)'
                }}></div>

                {/* Header Section */}
                <div style={{
                  padding: isMobile ? '2rem 1.5rem 1rem' : '2.5rem 2rem 1.5rem',
                  position: 'relative',
                  zIndex: 2
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <h3 style={{
                      fontSize: isMobile ? '1.4rem' : '1.6rem',
                      fontWeight: '700',
                      color: 'white',
                      margin: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{
                        fontSize: '1.8rem',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                      }}>📊</span>
                      Recent Proposals Overview
                    </h3>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '0.5rem 1rem',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <span style={{
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}>
                        {proposalDetails.length} Active
                      </span>
                    </div>
                  </div>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    margin: '0',
                    fontSize: '1rem'
                  }}>
                    Monitor and manage DAO proposals in real-time
                  </p>
                </div>

                {/* Content Section */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px 20px 0 0',
                  padding: isMobile ? '1.5rem' : '2rem',
                  minHeight: '300px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {proposalDetails.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '3rem 1rem',
                      color: '#6b7280'
                    }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        fontSize: '2rem'
                      }}>
                        📋
                      </div>
                      <h4 style={{
                        color: '#374151',
                        marginBottom: '0.5rem',
                        fontSize: '1.2rem',
                        fontWeight: '600'
                      }}>
                        No Proposals Found
                      </h4>
                      <p style={{ margin: '0', fontSize: '1rem' }}>
                        No proposals are currently available on this network.
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                      gap: '1.5rem'
                    }}>
                      {proposalDetails.map((proposal, index) => (
                        <div key={proposal.id} style={{
                          background: 'white',
                          borderRadius: '16px',
                          padding: '1.5rem',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                          border: '1px solid rgba(102, 126, 234, 0.1)',
                          transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          animation: `slideInUp 0.6s ease-out ${index * 0.1}s both`
                        }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(102, 126, 234, 0.15)';
                            e.currentTarget.style.borderColor = '#667eea';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)';
                            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.1)';
                          }}>

                          {/* Proposal Header */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '1rem'
                          }}>
                            <div style={{
                              width: '50px',
                              height: '50px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: '700',
                              fontSize: '1.1rem',
                              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                            }}>
                              #{proposal.id || index + 1}
                            </div>
                            <div style={{
                              background: proposal.passed
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}>
                              <span style={{ fontSize: '0.8rem' }}>
                                {proposal.passed ? '✅' : '⏳'}
                              </span>
                              {proposal.passed ? 'Approved' : 'Pending'}
                            </div>
                          </div>

                          {/* Project Title */}
                          <h5 style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: '#1f2937',
                            marginBottom: '0.8rem',
                            lineHeight: '1.3',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {proposal.projectName || `Proposal #${proposal.id || index + 1}`}
                          </h5>

                          {/* Description */}
                          <p style={{
                            color: '#6b7280',
                            fontSize: '0.9rem',
                            lineHeight: '1.5',
                            marginBottom: '1.2rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {proposal.description || 'No description available for this proposal.'}
                          </p>

                          {/* Funding Information */}
                          <div style={{
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                            borderRadius: '12px',
                            padding: '1rem',
                            marginBottom: '1rem'
                          }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '1rem'
                            }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  marginBottom: '0.3rem'
                                }}>
                                  Goal
                                </div>
                                <div style={{
                                  fontSize: '1.1rem',
                                  fontWeight: '700',
                                  color: '#667eea'
                                }}>
                                  {proposal.fundingGoal || '0'} GNJ
                                </div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  marginBottom: '0.3rem'
                                }}>
                                  Invested
                                </div>
                                <div style={{
                                  fontSize: '1.1rem',
                                  fontWeight: '700',
                                  color: '#10b981'
                                }}>
                                  {proposal.totalInvested || '0'} GNJ
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '0.8rem 1rem',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}>
                            <span>View Details</span>
                            <span style={{ fontSize: '0.8rem' }}>→</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* View All Button */}
                  {proposals.length > 4 && (
                    <div style={{
                      textAlign: 'center',
                      marginTop: '2rem',
                      paddingTop: '2rem',
                      borderTop: '1px solid rgba(102, 126, 234, 0.1)'
                    }}>
                      <button
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50px',
                          padding: '1rem 2rem',
                          fontSize: '1rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onClick={() => window.location.href = '/admin/proposals'}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                        }}
                      >
                        <span>View All {proposals.length} Proposals</span>
                        <span style={{ fontSize: '1.2rem' }}>🚀</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <style>{`
                @keyframes slideInUp {
                  from {
                    opacity: 0;
                    transform: translateY(30px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>

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