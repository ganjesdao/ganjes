/**
 * Admin Settings Component
 * Configure admin panel settings and preferences
 */

import React from 'react';

const Settings = () => {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1rem'
        }}>
          ⚙️
        </div>
        <h2 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          color: '#1f2937',
          marginBottom: '1rem'
        }}>
          Admin Settings
        </h2>
        <p style={{
          color: '#6b7280',
          fontSize: '1.125rem',
          marginBottom: '2rem',
          maxWidth: '600px',
          margin: '0 auto 2rem'
        }}>
          This section will contain system configuration, admin preferences, 
          notification settings, and general admin panel customization options.
        </p>
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '1rem',
          color: '#0369a1'
        }}>
          🚧 Component under development - Settings and configuration management
        </div>
      </div>
    </div>
  );
};

export default Settings;