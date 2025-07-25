/**
 * Mobile Responsive Table Component
 * Converts table to card layout on mobile devices
 */

import React from 'react';

const MobileTable = ({ data, columns, isMobile, onRowAction }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3rem',
        color: '#6b7280'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
        <p>No data available.</p>
      </div>
    );
  }

  if (isMobile) {
    // Mobile Card Layout
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {data.map((row, index) => (
          <div
            key={row.id || index}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '0.875rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '0.375rem 0',
                  borderBottom: column.key === columns[columns.length - 1].key ? 'none' : '1px solid #f3f4f6',
                  gap: '0.5rem'
                }}
              >
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.025em',
                  flexShrink: 0,
                  minWidth: '80px'
                }}>
                  {column.label}
                </span>
                <div style={{ 
                  textAlign: 'right', 
                  fontSize: '0.8rem',
                  lineHeight: '1.3',
                  flex: 1,
                  minWidth: 0
                }}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </div>
              </div>
            ))}
            
            {/* Action buttons */}
            {onRowAction && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #f3f4f6'
              }}>
                <button
                  onClick={() => onRowAction('view', row)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  👁️ View
                </button>
                <button
                  onClick={() => onRowAction('edit', row)}
                  style={{
                    padding: '0.5rem 0.875rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  ✏️ Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Desktop Table Layout
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    padding: '1rem',
                    textAlign: column.align || 'left',
                    fontWeight: '600',
                    color: '#374151',
                    fontSize: '0.875rem'
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.id || index}
                style={{ borderBottom: '1px solid #e5e7eb' }}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{
                      padding: '1rem',
                      textAlign: column.align || 'left'
                    }}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MobileTable;