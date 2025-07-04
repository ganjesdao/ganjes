// Example showing how Header with Network Switcher works
import React, { useState } from 'react';
import Header from '../pages/proposer/component/Header';

const HeaderNetworkExample = () => {
  const [isToggle, setIsToggle] = useState(false);

  return (
    <div>
      <Header isToggle={isToggle} setIsToggle={setIsToggle} />
      
      <div style={{ padding: '20px', backgroundColor: '#f8f9fa', minHeight: '200px' }}>
        <h3>🎉 Header with Network Switcher Integration</h3>
        
        <div style={{ marginTop: '20px' }}>
          <h5>✅ What's working:</h5>
          <ul>
            <li><strong>Network Dropdown</strong>: Simple dropdown near wallet button</li>
            <li><strong>4 Networks</strong>: ETH Mainnet, Sepolia, BSC Mainnet, BSC Testnet</li>
            <li><strong>Auto Detection</strong>: Shows current connected network</li>
            <li><strong>One-Click Switch</strong>: Switch networks directly from header</li>
            <li><strong>Toast Notifications</strong>: Success/error messages for network changes</li>
            <li><strong>Wallet Integration</strong>: Works with existing wallet connection</li>
          </ul>
          
          <h5 style={{ marginTop: '20px' }}>🎯 How to use:</h5>
          <ol>
            <li>Click the network dropdown (shows current network icon/symbol)</li>
            <li>Select any network from the list</li>
            <li>MetaMask will prompt to switch/add network</li>
            <li>Header updates to show new network</li>
            <li>Connect wallet works with any selected network</li>
          </ol>
          
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#d4edda',
            borderRadius: '8px',
            border: '1px solid #c3e6cb'
          }}>
            <p style={{ margin: 0, color: '#155724' }}>
              <strong>💡 Pro Tip:</strong> The network switcher automatically detects your current network 
              and updates contract addresses accordingly. Perfect for multi-chain dApps!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderNetworkExample;