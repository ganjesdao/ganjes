/**
 * Admin Layout Component
 * Layout with sidebar navigation for admin panel
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import { ToastContainer } from 'react-toastify';
import AdminHeader from '../common/AdminHeader';
import AdminSidebar from '../common/AdminSidebar';
import AdminFooter from '../common/AdminFooter';
import AdminNetworkSelector from '../network/AdminNetworkSelector';
import MetaMaskConnector from '../network/MetaMaskConnector';
import { getContractAddress, NETWORKS } from '../../../utils/networks';
import 'react-toastify/dist/ReactToastify.css';

const AdminLayout = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [networkInitialized, setNetworkInitialized] = useState(false);

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

  const handleNetworkChange = useCallback((network) => {
    console.log('AdminLayout: Network change handler called', {
      network,
      chainName: network?.chainName,
      chainId: network?.chainId
    });
    
    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      setContractAddress(address);
      console.log(`Admin connected to ${network.chainName}`, { 
        network, 
        contractAddress: address,
        isValidAddress: address && address !== '0x0000000000000000000000000000000000000000'
      });

      return (network);
    } else {
      setContractAddress(null);
      console.log('AdminLayout: Network not supported or disconnected');
    }
  }, []);

  const handleMetaMaskConnected = (connectionInfo) => {
    console.log('MetaMask connected:', connectionInfo);
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

      console.log('AdminLayout: Initializing default network...');
      
      // Try to get current MetaMask network first
      if (window.ethereum) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          console.log('AdminLayout: Current MetaMask network:', chainId);
          
          // Check if current network is supported
          const supportedNetwork = Object.values(NETWORKS).find(network => 
            network.chainId === chainId
          );
          
          if (supportedNetwork) {
            console.log('AdminLayout: Using current MetaMask network:', supportedNetwork.chainName);
            handleNetworkChange(supportedNetwork);
            setNetworkInitialized(true);
            return;
          }
        } catch (error) {
          console.warn('AdminLayout: Failed to get current MetaMask network:', error);
        }
      }

      // Fallback to default network (configurable)
      // Priority: BSC Mainnet -> Ethereum Mainnet -> BSC Testnet
      const defaultNetwork = NETWORKS.bsc || NETWORKS.ethereum || NETWORKS.bscTestnet;
      console.log('AdminLayout: Using default network:', defaultNetwork.chainName);
      handleNetworkChange(defaultNetwork);
      setNetworkInitialized(true);
    };

    // Initialize immediately
    initializeDefaultNetwork();
  }, [networkInitialized, handleNetworkChange]);

  const currentPath = location.pathname;
  const currentPage = navigationItems.find(item => currentPath.startsWith(item.path));

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

export default AdminLayout;