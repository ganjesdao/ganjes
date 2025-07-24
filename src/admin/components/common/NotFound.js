/**
 * Not Found Component
 * 404 page for admin section
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoToDashboard = () => {
    navigate('/admin/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '2rem',
      textAlign: 'center'
    }}>
      {/* 404 Number */}
      <div style={{
        fontSize: '8rem',
        fontWeight: 'bold',
        color: '#e5e7eb',
        lineHeight: '1',
        marginBottom: '1rem'
      }}>
        404
      </div>

      {/* Main Message */}
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '1rem'
      }}>
        Page Not Found
      </h1>

      <p style={{
        fontSize: '1.125rem',
        color: '#6b7280',
        marginBottom: '1rem',
        maxWidth: '600px'
      }}>
        The admin page you're looking for doesn't exist or has been moved.
      </p>

      {/* Current Path */}
      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '0.75rem 1rem',
        borderRadius: '6px',
        marginBottom: '2rem',
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        color: '#4b5563'
      }}>
        <strong>Requested path:</strong> {location.pathname}
      </div>

      {/* Suggestions */}
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        maxWidth: '500px',
        width: '100%'
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1rem'
        }}>
          Try these admin sections:
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.5rem',
          textAlign: 'left'
        }}>
          {[
            { path: '/admin/dashboard', name: 'Dashboard', desc: 'Overview and metrics' },
            { path: '/admin/users', name: 'User Management', desc: 'Manage users and roles' },
            { path: '/admin/proposals', name: 'Proposals', desc: 'Review proposals' },
            { path: '/admin/treasury', name: 'Treasury', desc: 'Financial management' },
            { path: '/admin/security', name: 'Security', desc: 'Security monitoring' },
            { path: '/admin/settings', name: 'Settings', desc: 'System configuration' }
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                textAlign: 'left',
                padding: '0.75rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '0.875rem'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.borderColor = '#d1d5db';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = '#e5e7eb';
              }}
            >
              <div style={{ fontWeight: '500', color: '#1f2937' }}>
                {item.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {item.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={handleGoToDashboard}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#2563eb';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#3b82f6';
          }}
        >
          Go to Dashboard
        </button>
        
        <button
          onClick={handleGoBack}
          style={{
            backgroundColor: 'white',
            color: '#374151',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f9fafb';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'white';
          }}
        >
          Go Back
        </button>
      </div>

      {/* Help Text */}
      <p style={{
        fontSize: '0.875rem',
        color: '#9ca3af',
        marginTop: '2rem'
      }}>
        If you believe this is an error, please contact{' '}
        <a
          href="mailto:admin@ganjes.io"
          style={{
            color: '#3b82f6',
            textDecoration: 'underline'
          }}
        >
          technical support
        </a>
        .
      </p>
    </div>
  );
};

export default NotFound;