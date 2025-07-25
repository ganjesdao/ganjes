/**
 * Common Page Header Component
 * Mobile-responsive header for admin pages
 */

import React from 'react';

const PageHeader = ({ 
  title, 
  description, 
  icon, 
  isMobile, 
  children, 
  totalCount,
  showStats = false 
}) => {
  return (
    <div style={{
      marginBottom: isMobile ? '1.5rem' : '2rem',
      padding: isMobile ? '1.25rem' : '1.5rem',
      backgroundColor: 'white',
      borderRadius: isMobile ? '8px' : '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: isMobile ? '1px solid #f3f4f6' : 'none'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        marginBottom: isMobile ? '1rem' : '1.5rem',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '1rem' : '0'
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: isMobile ? '1.25rem' : '1.5rem',
            fontWeight: '600',
            color: '#1f2937',
            margin: 0,
            lineHeight: '1.3',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {icon && <span style={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}>{icon}</span>}
            {title}
          </h2>
          {description && (
            <p style={{
              color: '#6b7280',
              fontSize: isMobile ? '0.85rem' : '0.875rem',
              margin: '0.25rem 0 0 0',
              lineHeight: '1.4'
            }}>
              {description}
            </p>
          )}
        </div>
        
        {showStats && totalCount !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            alignSelf: isMobile ? 'flex-start' : 'center'
          }}>
            <div style={{
              padding: isMobile ? '0.5rem 0.875rem' : '0.75rem 1rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              color: '#374151',
              fontWeight: '500'
            }}>
              Total: <strong>{totalCount}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Additional content like search bars */}
      {children && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;