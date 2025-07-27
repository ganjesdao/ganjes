import React from 'react';
import { FaBars } from 'react-icons/fa';
import SimpleNetworkSwitcher from '../../../components/SimpleNetworkSwitcher';
import { useWallet } from '../../../context/WalletContext';

function Header({ setIsToggle, onNetworkChange }) {
  const { account, isConnected, connectWallet } = useWallet();

  // Handle network change from SimpleNetworkSwitcher
  const handleNetworkChange = (network) => {
    console.log(`Network changed to: ${network?.chainName}`);
    
    // Pass network info to parent component
    if (onNetworkChange) {
      onNetworkChange(network);
    }
  };


  return (
    <nav className="sb-topnav navbar navbar-expand navbar-dark bg-dark br-bottom-1">
      <a className="navbar-brand ps-3" href="/investor-dashboard">
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
          {isConnected
            ? `${account.substring(0, 6)}...${account.slice(-4)}`
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
              <a className="dropdown-item" href="#!">
                Activity Log
              </a>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <a className="dropdown-item" href="#!">
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
