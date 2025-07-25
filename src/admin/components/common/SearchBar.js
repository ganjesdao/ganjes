/**
 * Mobile-Responsive Search Bar Component
 */

import React from 'react';

const SearchBar = ({ 
  searchTerm, 
  onSearchChange, 
  placeholder = "Search...", 
  isMobile,
  filters = [],
  onFilterChange 
}) => {
  return (
    <div style={{
      display: 'flex',
      gap: isMobile ? '0.75rem' : '1rem',
      alignItems: isMobile ? 'stretch' : 'center',
      flexDirection: isMobile ? 'column' : 'row'
    }}>
      {/* Search Input */}
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          flex: 1,
          padding: isMobile ? '0.75rem' : '0.75rem',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: isMobile ? '0.9rem' : '0.875rem',
          lineHeight: '1.25',
          minHeight: isMobile ? '44px' : 'auto'
        }}
      />
      
      {/* Filters */}
      {filters.map((filter, index) => (
        <select
          key={index}
          value={filter.value}
          onChange={(e) => onFilterChange(filter.key, e.target.value)}
          style={{
            padding: isMobile ? '0.75rem' : '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: isMobile ? '0.9rem' : '0.875rem',
            minWidth: isMobile ? 'auto' : '150px',
            minHeight: isMobile ? '44px' : 'auto',
            backgroundColor: 'white'
          }}
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
      
      {/* Search Button */}
      <button style={{
        padding: isMobile ? '0.75rem 1.25rem' : '0.75rem 1.5rem',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: isMobile ? '0.85rem' : '0.875rem',
        fontWeight: '500',
        minHeight: isMobile ? '44px' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      }}>
        <span style={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>🔍</span>
        {!isMobile && <span>Search</span>}
      </button>
    </div>
  );
};

export default SearchBar;