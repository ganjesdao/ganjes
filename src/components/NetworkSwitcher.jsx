import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { NETWORKS, isTestnet } from '../utils/networks';
import { useWallet } from '../context/WalletContext';

const NetworkSwitcher = ({ showTestnets = true }) => {
  const { currentNetwork, switchNetwork, getAvailableNetworks, isDataLoading } = useWallet();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Switch network using wallet context (no wallet connection needed)
  const handleNetworkSwitch = async (network) => {
    try {
      setIsDropdownOpen(false);
      await switchNetwork(network); // Uses network provider from WalletContext
    } catch (error) {
      console.error('Error switching network:', error);
      toast.error(`Failed to switch to ${network.chainName}`);
    }
  };

  const getNetworksList = () => {
    const networksList = getAvailableNetworks(); // Get from wallet context
    if (!showTestnets) {
      return networksList.filter(network => !isTestnet(network.chainId));
    }
    return networksList;
  };

  const getNetworkStatus = (network) => {
    if (!currentNetwork) return 'available';
    return currentNetwork.chainId === network.chainId ? 'selected' : 'available';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Current Network Display */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isDataLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 15px',
          backgroundColor: currentNetwork ? currentNetwork.color : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isDataLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.3s ease',
          minWidth: '180px',
          justifyContent: 'space-between',
          opacity: isDataLoading ? 0.7 : 1
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = '0.9';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>
            {isDataLoading ? '🔄' : (currentNetwork ? currentNetwork.icon : '❓')}
          </span>
          <span>
            {isDataLoading ? 'Switching...' : (currentNetwork ? currentNetwork.chainName : 'Select Network')}
          </span>
        </div>
        <span style={{ fontSize: '12px' }}>
          {isDropdownOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Network Dropdown */}
      {isDropdownOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          marginTop: '4px',
          overflow: 'hidden'
        }}>
          {/* Networks List */}
          {getNetworksList().map((network) => {
            const status = getNetworkStatus(network);
            const isActive = status === 'selected';

            return (
              <div key={network.chainId}>
                <button
                  onClick={() => handleNetworkSwitch(network)}
                  disabled={isDataLoading || isActive}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: 'none',
                    backgroundColor: isActive ? '#f8f9fa' : 'white',
                    color: isActive ? network.color : '#333',
                    cursor: (isDataLoading || isActive) ? 'not-allowed' : 'pointer',
                    opacity: (isDataLoading || isActive) ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && !isDataLoading) {
                      e.target.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && !isDataLoading) {
                      e.target.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{network.icon}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: isActive ? '600' : '400' }}>
                      {network.chainName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {network.nativeCurrency.symbol} • {isTestnet(network.chainId) ? 'Testnet' : 'Mainnet'}
                    </div>
                  </div>
                  {isActive && (
                    <span style={{
                      fontSize: '12px',
                      color: network.color,
                      fontWeight: '600'
                    }}>
                      ✓ Selected
                    </span>
                  )}
                </button>

                {/* Faucet Link for Testnets */}
                {network.faucetUrl && status === 'selected' && (
                  <div style={{
                    padding: '8px 15px',
                    backgroundColor: '#e3f2fd',
                    borderTop: '1px solid #eee',
                    fontSize: '12px'
                  }}>
                    <span style={{ color: '#666' }}>💧 Need test tokens? </span>
                    <a
                      href={network.faucetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: network.color, textDecoration: 'none', fontWeight: '500' }}
                    >
                      Get from faucet →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Click outside to close */}
      {isDropdownOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default NetworkSwitcher;