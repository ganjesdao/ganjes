/**
 * MetaMask Connector Component
 * Simple button to connect to MetaMask wallet
 */

import React, { useState } from 'react';
import { toast } from 'react-toastify';

const MetaMaskConnector = ({ onConnected }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask is not installed! Please install MetaMask extension.');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    setIsConnecting(true);

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        toast.warning('No accounts found. Please unlock MetaMask.');
        return;
      }

      // Get current network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      const connectionInfo = {
        account: accounts[0],
        chainId: chainId,
        connected: true
      };
      
      console.log('MetaMask connected:', connectionInfo);
      toast.success('✅ MetaMask connected successfully!');
      
      if (onConnected) {
        onConnected(connectionInfo);
      }
    } catch (error) {
      console.error('MetaMask connection error:', error);
      
      if (error.code === 4001) {
        toast.warning('Connection cancelled by user');
      } else {
        toast.error('Failed to connect to MetaMask');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <button
      onClick={connectMetaMask}
      disabled={isConnecting}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#f97316',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: isConnecting ? 'not-allowed' : 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        opacity: isConnecting ? 0.6 : 1,
        transition: 'all 0.2s ease'
      }}
      onMouseOver={(e) => {
        if (!isConnecting) {
          e.target.style.backgroundColor = '#ea580c';
        }
      }}
      onMouseOut={(e) => {
        if (!isConnecting) {
          e.target.style.backgroundColor = '#f97316';
        }
      }}
    >
      {isConnecting ? (
        <>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid #ffffff40',
            borderTop: '2px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: '1.2rem' }}>🦊</span>
          <span>Connect MetaMask</span>
        </>
      )}
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </button>
  );
};

export default MetaMaskConnector;