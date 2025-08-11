/**
 * Admin Page Layout Component
 * Reusable layout wrapper for all admin pages
 */

import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { selectIsAuthenticated } from '../../store/slices/authSlice';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

const AdminPageLayout = ({
    children,
    currentNetwork = null,
    contractAddress = null,
    onNetworkChange = () => { },
    handleMetaMaskConnected = () => { }
}) => {
    const location = useLocation();
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Handle mobile state change from sidebar
    const handleMobileChange = useCallback((mobile) => {
        setIsMobile(mobile);
    }, []);

    // Navigation items for header
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
        },
        {
            name: 'Administrators',
            path: '/admin/administrators',
            icon: '🔐',
            description: 'Manage Admins'
        }
    ];

    // Get current page info
    const currentPath = location.pathname;
    const currentPage = navigationItems.find(item => currentPath.startsWith(item.path));

    // Authentication check
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            {/* Admin Sidebar */}
            <AdminSidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                onMobileChange={handleMobileChange}
            />

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: isMobile ? '0' : (sidebarOpen ? '280px' : '80px'),
                transition: 'margin-left 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh'
            }}>
                {/* Admin Header */}
                <AdminHeader
                    currentPage={currentPage}
                    isMobile={isMobile}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    currentNetwork={currentNetwork}
                    contractAddress={contractAddress}
                    onNetworkChange={onNetworkChange}
                    handleMetaMaskConnected={handleMetaMaskConnected}
                />

                {/* Page Content */}
                <div style={{
                    flex: 1,
                    padding: isMobile ? '1rem' : '2rem',
                    overflow: 'auto'
                }}>
                    {typeof children === 'function' ? children({ isMobile }) : children}
                </div>
            </main>
        </div>
    );
};

export default AdminPageLayout;