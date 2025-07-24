/**
 * Admin Layout Component
 * Main layout wrapper for admin pages
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutAsync } from '../../store/slices/authSlice';
import { selectUser, selectIsAuthenticated } from '../../store/slices/authSlice';

const AdminLayout = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await dispatch(logoutAsync());
    navigate('/admin/login');
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: '📊',
      roles: ['admin', 'moderator', 'viewer']
    },
    {
      name: 'Users',
      path: '/admin/users',
      icon: '👥',
      roles: ['admin', 'moderator']
    },
    {
      name: 'Proposals',
      path: '/admin/proposals',
      icon: '📋',
      roles: ['admin', 'moderator']
    },
    {
      name: 'Treasury',
      path: '/admin/treasury',
      icon: '💰',
      roles: ['admin']
    },
    {
      name: 'Security',
      path: '/admin/security',
      icon: '🔒',
      roles: ['admin']
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: '⚙️',
      roles: ['admin', 'moderator', 'viewer']
    }
  ];

  const visibleItems = navigationItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  const currentPath = location.pathname;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '250px' : '70px',
        backgroundColor: '#1f2937',
        color: 'white',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo/Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center'
        }}>
          {sidebarOpen && (
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              margin: 0
            }}>
              Ganjes Admin
            </h2>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {visibleItems.map(item => {
            const isActive = currentPath.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: isActive ? '#374151' : 'transparent',
                  color: 'white',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = '#374151';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                {sidebarOpen && <span>{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid #374151'
        }}>
          {sidebarOpen && (
            <div style={{
              marginBottom: '0.75rem',
              fontSize: '0.875rem'
            }}>
              <div style={{ fontWeight: '500' }}>{user?.name}</div>
              <div style={{ color: '#9ca3af' }}>{user?.role}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Bar */}
        <header style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              {visibleItems.find(item => currentPath.startsWith(item.path))?.name || 'Admin Panel'}
            </h1>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            {/* User Avatar/Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div style={{ fontSize: '0.875rem' }}>
                <div style={{ fontWeight: '500' }}>{user?.name}</div>
                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  {user?.email}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto'
        }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;