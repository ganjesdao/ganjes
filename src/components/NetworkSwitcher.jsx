import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { NETWORKS, getNetworkByChainId, isTestnet } from '../utils/networks';

const NetworkSwitcher = ({ onNetworkChange, selectedNetwork, showTestnets = true }) => {
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Check current network on component mount
  useEffect(() => {
    checkCurrentNetwork();

    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const handleChainChanged = (chainId) => {
    const network = getNetworkByChainId(chainId);
    setCurrentNetwork(network);
    if (onNetworkChange) {
      onNetworkChange(network);
    }
  };

  const checkCurrentNetwork = async () => {
    if (!window.ethereum) return;

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const network = getNetworkByChainId(chainId);
      setCurrentNetwork(network);
      if (onNetworkChange) {
        onNetworkChange(network);
      }
    } catch (error) {
      console.error('Error checking network:', error);
    }
  };

  const switchNetwork = async (network) => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask or another Web3 wallet!');
      return;
    }

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });

      setCurrentNetwork(network);
      setIsDropdownOpen(false);
      //  toast.success(`Switched to ${network.chainName}!`);

      if (onNetworkChange) {
        onNetworkChange(network);
      }
    } catch (switchError) {
      // If the network doesn't exist, add it (only for custom networks)
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          });

          setCurrentNetwork(network);
          setIsDropdownOpen(false);
          // toast.success(`Added and switched to ${network.chainName}!`);

          if (onNetworkChange) {
            onNetworkChange(network);
          }
        } catch (addError) {
          toast.error(`Failed to add ${network.chainName}. Please add it manually.`);
          console.error('Error adding network:', addError);
        }
      } else {
        toast.error(`Failed to switch to ${network.chainName}`);
        console.error('Error switching network:', switchError);
      }
    }
  };

  const getNetworksList = () => {
    const networksList = Object.values(NETWORKS);
    if (!showTestnets) {
      return networksList.filter(network => !isTestnet(network.chainId));
    }
    return networksList;
  };

  const getNetworkStatus = (network) => {
    if (!currentNetwork) return 'disconnected';
    return currentNetwork.chainId === network.chainId ? 'connected' : 'available';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Current Network Display */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 15px',
          backgroundColor: currentNetwork ? currentNetwork.color : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.3s ease',
          minWidth: '180px',
          justifyContent: 'space-between'
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
            {currentNetwork ? currentNetwork.icon : '❓'}
          </span>
          <span>{currentNetwork ? currentNetwork.chainName : 'Select Network'}</span>
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
            const isActive = status === 'connected';

            return (
              <div key={network.chainId}>
                <button
                  onClick={() => switchNetwork(network)}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    border: 'none',
                    backgroundColor: isActive ? '#f8f9fa' : 'white',
                    color: isActive ? network.color : '#333',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
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
                      ✓ Connected
                    </span>
                  )}
                </button>

                {/* Faucet Link for Testnets */}
                {network.faucetUrl && status === 'connected' && (
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