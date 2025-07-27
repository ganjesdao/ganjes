/**
 * Admin Header Component
 * Header with navigation and network selector for admin panel
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import AdminNetworkSelector from '../network/AdminNetworkSelector';
import MetaMaskConnector from '../network/MetaMaskConnector';

const AdminHeader = ({ 
  currentPage, 
  isMobile, 
  sidebarOpen, 
  setSidebarOpen, 
  currentNetwork, 
  contractAddress, 
  onNetworkChange,
  handleMetaMaskConnected 
}) => {
  const user = useSelector(selectUser);

  return (
    <header style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: isMobile ? '1rem' : '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              color: '#374151',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px'
            }}
          >
            ☰
          </button>
        )}
        
        <div>
          <h1 style={{
            fontSize: isMobile ? '1.2rem' : '1.5rem',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0
          }}>
            {currentPage ? `${currentPage.icon} ${currentPage.name}` : '🔐 Admin Panel'}
          </h1>
          {currentPage && !isMobile && (
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: '0.25rem 0 0 0'
            }}>
              {currentPage.description}
            </p>
          )}
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? '0.5rem' : '1rem',
        fontSize: '0.875rem',
        color: '#6b7280',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
      }}>
        {/* Network Selector or MetaMask Connector */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '0.25rem'
          }}>
            {window.ethereum ? (
              <>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  fontWeight: '500',
                  marginBottom: '0.25rem'
                }}>
                  NETWORK:
                </span>
                <AdminNetworkSelector 
                  onNetworkChange={onNetworkChange} 
                  initialNetwork={currentNetwork}
                />
              </>
            ) : (
              <>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  fontWeight: '500',
                  marginBottom: '0.25rem'
                }}>
                  WALLET:
                </span>
                <MetaMaskConnector onConnected={handleMetaMaskConnected} />
              </>
            )}
          </div>
        )}
        
        {/* Contract Address Display - Hidden on mobile */}
        {!isMobile && currentNetwork && contractAddress && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #dbeafe'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '500' }}>
              CONTRACT:
            </span>
            <code style={{
              fontSize: '0.75rem',
              color: '#1e40af',
              backgroundColor: 'transparent',
              padding: 0
            }}>
              {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            </code>
          </div>
        )}
        
        {/* User Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: isMobile ? '0.4rem 0.75rem' : '0.5rem 1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <span>👤</span>
          {!isMobile && (
            <span style={{ fontWeight: '500' }}>
              {user?.email || 'admin@ganjes.io'}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;