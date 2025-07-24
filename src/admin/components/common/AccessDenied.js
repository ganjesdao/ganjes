/**
 * Access Denied Component
 * Displayed when user doesn't have sufficient permissions
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

const AccessDenied = ({ 
  requiredRoles = [], 
  requiredPermissions = [],
  userRole,
  userPermissions = []
}) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoToDashboard = () => {
    navigate('/admin/dashboard');
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
      {/* Access Denied Icon */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem'
      }}>
        <svg 
          width="40" 
          height="40" 
          fill="#dc2626" 
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Main Message */}
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '1rem'
      }}>
        Access Denied
      </h1>

      <p style={{
        fontSize: '1.125rem',
        color: '#6b7280',
        marginBottom: '2rem',
        maxWidth: '600px'
      }}>
        You don't have sufficient permissions to access this section of the admin panel.
      </p>

      {/* Permission Details */}
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
          Access Requirements:
        </h3>
        
        {requiredRoles.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              Required Role(s):
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              {requiredRoles.map(role => (
                <span
                  key={role}
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  {role}
                </span>
              ))}
            </div>
            <p style={{
              fontSize: '0.75rem',
              color: '#9ca3af'
            }}>
              Your role: <span style={{ fontWeight: '500' }}>{userRole || 'Unknown'}</span>
            </p>
          </div>
        )}

        {requiredPermissions.length > 0 && (
          <div>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.5rem'
            }}>
              Required Permission(s):
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              {requiredPermissions.map(permission => (
                <span
                  key={permission}
                  style={{
                    fontSize: '0.75rem',
                    color: '#4b5563',
                    fontFamily: 'monospace'
                  }}
                >
                  • {permission}
                </span>
              ))}
            </div>
          </div>
        )}
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

      {/* Contact Support */}
      <p style={{
        fontSize: '0.875rem',
        color: '#9ca3af',
        marginTop: '2rem'
      }}>
        Need access? Contact your system administrator or{' '}
        <a
          href="mailto:admin@ganjes.io"
          style={{
            color: '#3b82f6',
            textDecoration: 'underline'
          }}
        >
          support team
        </a>
        .
      </p>
    </div>
  );
};

export default AccessDenied;