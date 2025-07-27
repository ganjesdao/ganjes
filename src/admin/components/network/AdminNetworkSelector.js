/**
 * Admin Network Selector Component
 * Simple select dropdown for network switching in admin panel
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { NETWORKS, getNetworkByChainId, isTestnet } from '../../../utils/networks';

const AdminNetworkSelector = ({ onNetworkChange, initialNetwork }) => {
  const [currentNetwork, setCurrentNetwork] = useState(initialNetwork?.chainId || '');
  const [isConnecting, setIsConnecting] = useState(false);

  // Update current network when initialNetwork changes
  useEffect(() => {
    if (initialNetwork) {
      setCurrentNetwork(initialNetwork.chainId);
      console.log('AdminNetworkSelector: Set initial network', initialNetwork.chainName);
    }
  }, [initialNetwork]);

  // Check current network on component mount
  useEffect(() => {
    // Only check current network if no initial network was provided
    if (!initialNetwork) {
      checkCurrentNetwork();
    }
    
    // Listen for network changes
    if (window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [initialNetwork]);

  const handleChainChanged = (chainId) => {
    const network = getNetworkByChainId(chainId);
    setCurrentNetwork(chainId);
    if (onNetworkChange) {
      onNetworkChange(network);
    }
  };

  const checkCurrentNetwork = async () => {
    if (!window.ethereum) {
      console.log('AdminNetworkSelector: MetaMask not detected');
      toast.warning('MetaMask not detected. Please install MetaMask to use network features.');
      return;
    }
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const network = getNetworkByChainId(chainId);
      console.log('AdminNetworkSelector: Current network detected', {
        chainId,
        network,
        hasCallback: !!onNetworkChange
      });
      setCurrentNetwork(chainId);
      if (onNetworkChange) {
        onNetworkChange(network);
      }
    } catch (error) {
      console.error('AdminNetworkSelector: Error checking network:', error);
      toast.error('Failed to detect current network');
    }
  };

  const handleNetworkSelect = async (selectedChainId) => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask to switch networks!');
      return;
    }

    if (selectedChainId === currentNetwork) {
      return; // Already on this network
    }

    setIsConnecting(true);
    const network = getNetworkByChainId(selectedChainId);

    try {
      // Try to switch to the selected network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: selectedChainId }],
      });
      
      setCurrentNetwork(selectedChainId);
      toast.success(`✅ Switched to ${network.chainName}!`);
      
      if (onNetworkChange) {
        onNetworkChange(network);
      }
    } catch (switchError) {
      console.error('Switch error:', switchError);
      
      // Network not added to MetaMask
      if (switchError.code === 4902) {
        try {
          // Add the network to MetaMask
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          });
          
          setCurrentNetwork(selectedChainId);
          toast.success(`✅ Added and switched to ${network.chainName}!`);
          
          if (onNetworkChange) {
            onNetworkChange(network);
          }
        } catch (addError) {
          console.error('Add error:', addError);
          toast.error(`❌ Failed to add ${network.chainName}`);
          // Reset select to current network
          setCurrentNetwork(currentNetwork);
        }
      } else if (switchError.code === 4001) {
        // User rejected the request
        toast.warning('Network switch was cancelled by user');
        // Reset select to current network  
      } else {
        toast.error(`❌ Failed to switch to ${network.chainName}`);
        // Reset select to current network
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const networkOptions = Object.values(NETWORKS);
  const currentNetworkInfo = getNetworkByChainId(currentNetwork);

  return (
    <div style={{ position: 'relative' }}>
      <select
        value={currentNetwork}
        onChange={(e) => handleNetworkSelect(e.target.value)}
        disabled={isConnecting}
        style={{
          padding: '0.5rem 2.5rem 0.5rem 0.75rem',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          cursor: isConnecting ? 'not-allowed' : 'pointer',
          minWidth: '180px',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em',
          opacity: isConnecting ? 0.6 : 1
        }}
      >
        {!currentNetwork && (
          <option value="" disabled>
            {window.ethereum ? 'Select Network...' : 'MetaMask Required'}
          </option>
        )}
        
        {networkOptions.map((network) => {
          const isCurrentNetwork = network.chainId === currentNetwork;
          const networkType = isTestnet(network.chainId) ? 'Testnet' : 'Mainnet';
          
          return (
            <option 
              key={network.chainId} 
              value={network.chainId}
              style={{
                fontWeight: isCurrentNetwork ? '600' : '400'
              }}
            >
              {network.icon} {network.chainName} ({networkType})
            </option>
          );
        })}
      </select>

      {/* Loading indicator */}
      {isConnecting && (
        <div style={{
          position: 'absolute',
          right: '2rem',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          border: '2px solid #f3f3f3',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      )}

      {/* Current network info */}
      {currentNetworkInfo && (
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.75rem',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: currentNetworkInfo.color,
            borderRadius: '50%'
          }} />
          <span>
            Connected to {currentNetworkInfo.chainName}
            {isTestnet(currentNetworkInfo.chainId) && ' (Testnet)'}
          </span>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: translateY(-50%) rotate(0deg); }
            100% { transform: translateY(-50%) rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AdminNetworkSelector;