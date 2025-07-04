import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { NETWORKS, getNetworkByChainId, isTestnet } from '../utils/networks';

const SimpleNetworkSwitcher = ({ onNetworkChange }) => {
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

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
      toast.error('Please install MetaMask!');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });
      
      setCurrentNetwork(network);
      setIsOpen(false);
      toast.success(`Switched to ${network.chainName}!`);
      
      if (onNetworkChange) {
        onNetworkChange(network);
      }
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          });
          
          setCurrentNetwork(network);
          setIsOpen(false);
          toast.success(`Added ${network.chainName}!`);
          
          if (onNetworkChange) {
            onNetworkChange(network);
          }
        } catch (addError) {
          toast.error(`Failed to add ${network.chainName}`);
        }
      } else {
        toast.error(`Failed to switch to ${network.chainName}`);
      }
    }
  };

  const networksList = Object.values(NETWORKS);

  return (
    <div className="dropdown">
      {/* Network Dropdown Toggle */}
      <button
        className="btn btn-outline-light btn-sm dropdown-toggle"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '1px solid #495057',
          backgroundColor: 'transparent',
          color: '#ffffff',
          minWidth: '120px'
        }}
      >
        <span style={{ fontSize: '14px' }}>
          {currentNetwork ? currentNetwork.icon : '🌐'}
        </span>
        <span className="d-none d-lg-inline">
          {currentNetwork ? currentNetwork.nativeCurrency.symbol : 'Network'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="dropdown-menu show"
            style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              zIndex: 1050,
              minWidth: '200px',
              backgroundColor: '#ffffff',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '4px 0',
              marginTop: '4px'
            }}
          >
            {networksList.map((network) => {
              const isActive = currentNetwork?.chainId === network.chainId;
              
              return (
                <button
                  key={network.chainId}
                  className="dropdown-item"
                  onClick={() => switchNetwork(network)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    border: 'none',
                    backgroundColor: isActive ? '#f8f9fa' : 'transparent',
                    color: isActive ? network.color : '#333',
                    cursor: 'pointer',
                    fontSize: '14px',
                    width: '100%',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.target.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{network.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: isActive ? '600' : '400' }}>
                      {network.chainName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {network.nativeCurrency.symbol} • {isTestnet(network.chainId) ? 'Testnet' : 'Mainnet'}
                    </div>
                  </div>
                  {isActive && (
                    <span style={{ fontSize: '12px', color: network.color }}>●</span>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Backdrop to close dropdown */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1040
            }}
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export default SimpleNetworkSwitcher;