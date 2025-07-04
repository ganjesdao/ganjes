import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import SimpleNetworkSwitcher from '../../../components/SimpleNetworkSwitcher';
import { getContractAddress } from '../../../utils/networks';

function Header({ isToggle, setIsToggle, onNetworkChange }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState('');
  const navigate = useNavigate();

  // Handle network change from SimpleNetworkSwitcher
  const handleNetworkChange = (network) => {
    setCurrentNetwork(network);
    if (network) {
      const address = getContractAddress(network.chainId);
      setContractAddress(address);
      console.log(`Network changed to: ${network.chainName}`);
      console.log(`Contract address: ${address}`);
    } else {
      setContractAddress('');
    }
    
    // Propagate the network change to parent component
    if (onNetworkChange) {
      onNetworkChange(network);
    }
  };

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkWalletConnected = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (err) {
          console.error("Error checking wallet connection:", err);
        }
      }
    };

    checkWalletConnected();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress(null);
        }
      });
    }

    return () => {
      window.ethereum?.removeListener('accountsChanged', () => {});
    };
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found. Please install it.");
      return;
    }

    try {
      // Request account connection
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      setWalletAddress(accounts[0]);
      console.log('Wallet connected:', accounts[0]);
      
      // Check current network after connecting
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('Current network chain ID:', chainId);
      
    } catch (err) {
      console.error("Wallet connection failed:", err);
      alert("Wallet connection failed. Please try again.");
    }
  };

  const navigateToDashboard = () => {
    if (walletAddress) {
      navigate('/dashboard');
    } else {
      connectWallet();
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div className="container">
          <a className="navbar-brand" href="/">
            <img src="assets/image/logo/logo-desktop.png" width={150} alt="Ganjes DAO" />
          </a>
          
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-center">
              <li className="nav-item">
                <a className="nav-link" href="/">Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/marketplace">Marketplace</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#contact">Contact</a>
              </li>
              
              {/* Network Section */}
              <li className="nav-item dropdown me-3">
                <div className="d-flex align-items-center gap-2">
                  {/* Network Switcher */}
                  <SimpleNetworkSwitcher  onNetworkChange={handleNetworkChange}/>
                </div>
              </li>
              
              <li className="nav-item">
                <button
                  onClick={navigateToDashboard}
                  className="btn btn-primary px-4"
                  style={{
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {walletAddress ? (
                    <>
                      <span className="d-none d-md-inline">
                        Enter DAO ({walletAddress.substring(0, 6)}...{walletAddress.slice(-4)})
                      </span>
                      <span className="d-md-none">
                        Enter DAO
                      </span>
                    </>
                  ) : (
                    'Connect Wallet'
                  )}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav></>
  )
}

export default Header