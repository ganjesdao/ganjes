// Example of how to use NetworkSwitcher in any component
import React, { useState } from 'react';
import NetworkSwitcher from './NetworkSwitcher';
import { getContractAddress, isTestnet } from '../utils/networks';

const NetworkSwitcherExample = () => {
  const [currentNetwork, setCurrentNetwork] = useState(null);

  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    console.log('Network changed to:', network);
    
    if (network) {
      const contractAddress = getContractAddress(network.chainId);
      console.log('Contract address for this network:', contractAddress);
      console.log('Is testnet:', isTestnet(network.chainId));
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Network Switcher Example</h3>
      
      {/* Basic Usage */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Basic Network Switcher:</h4>
        <NetworkSwitcher 
          onNetworkChange={handleNetworkChange}
          selectedNetwork={currentNetwork}
        />
      </div>

      {/* Only Mainnets */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Mainnets Only:</h4>
        <NetworkSwitcher 
          onNetworkChange={handleNetworkChange}
          selectedNetwork={currentNetwork}
          showTestnets={false}
        />
      </div>

      {/* Current Network Info */}
      {currentNetwork && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <h4>Current Network Info:</h4>
          <p><strong>Name:</strong> {currentNetwork.chainName}</p>
          <p><strong>Symbol:</strong> {currentNetwork.nativeCurrency.symbol}</p>
          <p><strong>Chain ID:</strong> {currentNetwork.chainId}</p>
          <p><strong>Is Testnet:</strong> {isTestnet(currentNetwork.chainId) ? 'Yes' : 'No'}</p>
          <p><strong>Contract Address:</strong> {getContractAddress(currentNetwork.chainId)}</p>
        </div>
      )}
    </div>
  );
};

export default NetworkSwitcherExample;