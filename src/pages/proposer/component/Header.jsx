import React, { useState, useEffect } from 'react';
import { FaBars } from 'react-icons/fa';
import { ethers } from 'ethers';
import SimpleNetworkSwitcher from '../../../components/SimpleNetworkSwitcher';
import { getContractAddress } from '../../../utils/networks';

function Header({ isToggle, setIsToggle, onNetworkChange }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [contractAddress, setContractAddress] = useState('');

  // Handle network change from SimpleNetworkSwitcher
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

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkWalletConnected = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error("Failed to check connected accounts:", error);
      }
    };

    checkWalletConnected();

    // Optional: listen for account changes (user switches account or disconnects)
    window.ethereum?.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress(null);
      }
    });

    // Cleanup listener on unmount
    return () => {
      window.ethereum?.removeListener('accountsChanged', () => { });
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
      // console.log'Wallet connected:', accounts[0]);

      // Check current network after connecting
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      // console.log'Current network chain ID:', chainId);

    } catch (err) {
      console.error("Wallet connection failed:", err);
      alert("Wallet connection failed. Please try again.");
    }
  };


  const logout = async () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }

  return (
    <nav className="sb-topnav navbar navbar-expand navbar-dark bg-dark br-bottom-1">
      <a className="navbar-brand ps-3" href="/dashboard">
        <img src="assets/image/logo/logo-desktop.png" width={150} alt="logo" />
      </a>

      <button
        className="btn btn-link btn-sm order-1 order-lg-0 me-4 me-lg-0"
        id="sidebarToggle"
        onClick={() => setIsToggle(prev => !prev)}
      >
        <FaBars />
      </button>

      {/* Network Switcher and Wallet Button Container */}
      <div className="d-flex align-items-center ms-auto gap-2">
        {/* Network Switcher */}
        <SimpleNetworkSwitcher
          onNetworkChange={handleNetworkChange}
        />

        {/* Connect Wallet Button */}
        <button
          onClick={connectWallet}
          className="btn btn-primary btn-sm"
          style={{
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: '6px',
            minWidth: '120px'
          }}
        >
          {walletAddress
            ? `${walletAddress.substring(0, 6)}...${walletAddress.slice(-4)}`
            : "Connect Wallet"}
        </button>
      </div>

      <ul className="navbar-nav ms-2 me-3 me-lg-4">
        <li className="nav-item dropdown">
          <a
            className="nav-link dropdown-toggle"
            id="navbarDropdown"
            href="#"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="fas fa-user fa-fw" />
          </a>
          <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
            <li>
              <a className="dropdown-item" href="#!">
                Settings
              </a>
            </li>
            <li>
              <a className="dropdown-item" href="activity-log">
                Activity Log
              </a>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <a className="dropdown-item" href="#!" onClick={() => logout()}>
                Logout
              </a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  );
}

export default Header;
