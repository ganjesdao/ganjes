/**
 * Admin Header Component
 * Header with navigation and network selector for admin panel
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import AdminNetworkSelector from '../network/AdminNetworkSelector';
import MetaMaskConnector from '../network/MetaMaskConnector';
import SimpleNetworkSwitcher from '../../../components/SimpleNetworkSwitcher';
import { getContractAddress } from '../../../utils/networks';

const AdminHeader = ({
  currentPage,
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  handleMetaMaskConnected,
  onNetworkChange
}) => {
  const user = useSelector(selectUser);
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState(null); // Initialize with the provided prop
  const [contractAddress, setContractAddress] = useState(null);

  // Check MetaMask connection status
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          console.log(`Connected accounts: ${accounts}`);
          setIsMetaMaskConnected(accounts.length > 0);
        } catch (error) {
          setIsMetaMaskConnected(false);
        }
      } else {
        setIsMetaMaskConnected(false);
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        setIsMetaMaskConnected(accounts.length > 0);
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      setContractAddress(address);
      // console.log`Network changed to: ${network.chainName}`);
      // console.log`Contract address: ${address}`);

      // Pass network info to parent component
      if (onNetworkChange) {
        onNetworkChange(network);
      }
    } else {
      // Pass null to parent component when network is not supported
      if (onNetworkChange) {
        onNetworkChange(null);
      }
    }
  };

  return (
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
        {/* Connection Status Indicator */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: isMetaMaskConnected ? '#f0f9ff' : '#fef2f2',
            borderRadius: '8px',
            border: `1px solid ${isMetaMaskConnected ? '#bae6fd' : '#fecaca'}`
          }}>
            <span style={{
              fontSize: '0.8rem',
              color: isMetaMaskConnected ? '#0369a1' : '#dc2626'
            }}>
              {isMetaMaskConnected ? '🟢' : '🔴'}
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: isMetaMaskConnected ? '#0369a1' : '#dc2626',
              fontWeight: '500'
            }}>
              {isMetaMaskConnected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        )}

        {/* Network Selector or MetaMask Connector */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.25rem'
          }}>
            {window.ethereum && isMetaMaskConnected ? (
              <>
                <span style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontWeight: '500',
                  marginBottom: '0.25rem'
                }}>
                  <SimpleNetworkSwitcher
                    onNetworkChange={handleNetworkChange}
                  />
                </span>

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
                <MetaMaskConnector onConnected={(info) => {
                  handleMetaMaskConnected(info);
                  setIsMetaMaskConnected(true);
                }} />
              </>
            )}
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
  );
};

export default AdminHeader;