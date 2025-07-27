/**
 * Admin Footer Component
 * Footer for admin panel
 */

import React from 'react';

const AdminFooter = ({ isMobile }) => {
  return (
    <footer style={{
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      backgroundColor: 'white',
      borderTop: '1px solid #e5e7eb',
      marginTop: 'auto',
      textAlign: 'center',
      color: '#6b7280',
      fontSize: isMobile ? '0.8rem' : '0.875rem'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '0.5rem' : '1rem'
      }}>
        <div>
          © 2024 Ganjes NFT DAO - Admin Panel
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: isMobile ? '0.75rem' : '0.8rem'
        }}>
          <span>🔐 Secure</span>
          <span>⚡ Fast</span>
          <span>🌍 Global</span>
        </div>
      </div>
    </footer>
  );
};

export default AdminFooter;