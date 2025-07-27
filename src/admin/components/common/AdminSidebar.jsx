/**
 * Admin Sidebar Component
 * Navigation sidebar for admin panel with mobile detection
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { logoutAsync, selectUser } from '../../store/slices/authSlice';

const AdminSidebar = ({ sidebarOpen, setSidebarOpen, onMobileChange }) => {
  const [isMobile, setIsMobile] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectUser);

  // Mobile detection and responsive handling
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Notify parent component about mobile state change
      if (onMobileChange) {
        onMobileChange(mobile);
      }

      // On mobile, start with sidebar closed
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setSidebarOpen, onMobileChange]);

  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: '📊',
      description: 'Overview & Analytics'
    },
    {
      name: 'Proposers',
      path: '/admin/proposers',
      icon: '👨‍💼',
      description: 'Manage Proposers'
    },
    {
      name: 'Investors',
      path: '/admin/investors',
      icon: '👥',
      description: 'Manage Investors'
    },
    {
      name: 'Executed',
      path: '/admin/executed',
      icon: '✅',
      description: 'Executed Proposals'
    }
  ];

  const handleLogout = async () => {
    await dispatch(logoutAsync());
    navigate('/admin/login');
  };

  const currentPath = location.pathname;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: isMobile ? (sidebarOpen ? '280px' : '0px') : (sidebarOpen ? '280px' : '80px'),
        backgroundColor: '#1f2937',
        color: 'white',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 1000,
        overflow: 'hidden',
        left: isMobile && !sidebarOpen ? '-280px' : '0'
      }}>
        {/* Logo/Header */}
        <div style={{
          padding: isMobile ? '1rem' : '1.5rem',
          borderBottom: '1px solid #374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: (sidebarOpen || isMobile) ? 'space-between' : 'center'
        }}>
          {(sidebarOpen || isMobile) && (
            <div>
              <h2 style={{
                fontSize: isMobile ? '1.1rem' : '1.25rem',
                fontWeight: 'bold',
                margin: 0,
                color: 'white'
              }}>
                🔐 Ganjes Admin
              </h2>
              <p style={{
                fontSize: '0.75rem',
                margin: '0.25rem 0 0 0',
                color: '#9ca3af'
              }}>
                Administration Panel
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: isMobile ? '1.5rem' : '1.25rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#374151'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            {isMobile ? (sidebarOpen ? '✕' : '☰') : (sidebarOpen ? '◀' : '▶')}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: isMobile ? '0.5rem 0' : '1rem 0' }}>
          {navigationItems.map(item => {
            const isActive = currentPath.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  // Close sidebar on mobile after navigation
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                style={{
                  width: '100%',
                  padding: (sidebarOpen || isMobile) ? (isMobile ? '0.75rem 1rem' : '1rem 1.5rem') : '1rem',
                  backgroundColor: isActive ? '#3b82f6' : 'transparent',
                  color: 'white',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '0.75rem' : '1rem',
                  fontSize: isMobile ? '0.8rem' : '0.875rem',
                  transition: 'all 0.2s ease',
                  margin: isMobile ? '0.125rem 0.5rem' : '0.25rem 1rem',
                  borderRadius: '8px'
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
                <span style={{
                  fontSize: isMobile ? '1.25rem' : '1.5rem',
                  minWidth: '24px',
                  textAlign: 'center'
                }}>
                  {item.icon}
                </span>
                {(sidebarOpen || isMobile) && (
                  <div>
                    <div style={{ fontWeight: '600' }}>{item.name}</div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: isActive ? '#e0e7ff' : '#9ca3af',
                      marginTop: '0.125rem'
                    }}>
                      {item.description}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div style={{
          padding: isMobile ? '0.75rem' : '1rem',
          borderTop: '1px solid #374151'
        }}>
          {(sidebarOpen || isMobile) && (
            <div style={{
              marginBottom: '1rem',
              padding: isMobile ? '0.5rem' : '0.75rem',
              backgroundColor: '#374151',
              borderRadius: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '0.5rem' : '0.75rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  width: isMobile ? '28px' : '32px',
                  height: isMobile ? '28px' : '32px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  fontWeight: '500'
                }}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div>
                  <div style={{
                    fontWeight: '500',
                    fontSize: isMobile ? '0.8rem' : '0.875rem'
                  }}>
                    {user?.name || 'Admin User'}
                  </div>
                  <div style={{
                    color: '#9ca3af',
                    fontSize: isMobile ? '0.7rem' : '0.75rem'
                  }}>
                    Administrator
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: (sidebarOpen || isMobile) ? (isMobile ? '0.6rem' : '0.75rem') : '0.75rem 0.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: (sidebarOpen || isMobile) ? 'center' : 'center',
              gap: (sidebarOpen || isMobile) ? '0.5rem' : '0',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            <span style={{ fontSize: isMobile ? '1.1rem' : '1.25rem' }}>🚪</span>
            {(sidebarOpen || isMobile) && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;