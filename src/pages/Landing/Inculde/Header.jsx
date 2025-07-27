import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import SimpleNetworkSwitcher from '../../../components/SimpleNetworkSwitcher';
import { getContractAddress } from '../../../utils/networks';
import { useWallet } from '../../../context/WalletContext';

function Header({ isToggle, setIsToggle, onNetworkChange }) {
  const { account, currentNetwork, contractAddress, isConnected, connectWallet } = useWallet();
  const navigate = useNavigate();

  // Handle network change from SimpleNetworkSwitcher
  const handleNetworkChange = (network) => {
    console.log(`Network changed to: ${network?.chainName}`);
    console.log(`Contract address: ${contractAddress}`);
    
    // Propagate the network change to parent component
    if (onNetworkChange) {
      onNetworkChange(network);
    }
  };

  const navigateToDashboard = () => {
    if (isConnected) {
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
                  {isConnected ? (
                    <>
                      <span className="d-none d-md-inline">
                        Enter DAO ({account.substring(0, 6)}...{account.slice(-4)})
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