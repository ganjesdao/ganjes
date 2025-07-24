/**
 * Admin Router
 * Main routing configuration for admin section
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Components
import AdminLayout from '../components/layout/AdminLayout';
import AdminLogin from '../components/auth/AdminLogin';
import Dashboard from '../components/dashboard/Dashboard';
import UserManagement from '../components/users/UserManagement';
import ProposalManagement from '../components/proposals/ProposalManagement';
import FinancialManagement from '../components/financial/FinancialManagement';
import SecurityMonitoring from '../components/security/SecurityMonitoring';
import Settings from '../components/settings/Settings';
import NotFound from '../components/common/NotFound';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import RoleBasedRoute from './RoleBasedRoute';

// Selectors
import { selectIsAuthenticated, selectUser } from '../store/slices/authSlice';

const AdminRouter = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? 
            <Navigate to="/admin/dashboard" replace /> : 
            <AdminLogin />
        } 
      />
      
      {/* Protected Admin Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Routes>
                {/* Dashboard - All authenticated admin users */}
                <Route 
                  path="/dashboard" 
                  element={<Dashboard />} 
                />
                
                {/* User Management - Admin and Moderator roles */}
                <Route 
                  path="/users/*" 
                  element={
                    <RoleBasedRoute requiredRoles={['admin', 'moderator']}>
                      <UserManagement />
                    </RoleBasedRoute>
                  } 
                />
                
                {/* Proposal Management - Admin and Moderator roles */}
                <Route 
                  path="/proposals/*" 
                  element={
                    <RoleBasedRoute requiredRoles={['admin', 'moderator']}>
                      <ProposalManagement />
                    </RoleBasedRoute>
                  } 
                />
                
                {/* Financial Management - Admin role only */}
                <Route 
                  path="/treasury/*" 
                  element={
                    <RoleBasedRoute requiredRoles={['admin']}>
                      <FinancialManagement />
                    </RoleBasedRoute>
                  } 
                />
                
                {/* Security Monitoring - Admin role only */}
                <Route 
                  path="/security/*" 
                  element={
                    <RoleBasedRoute requiredRoles={['admin']}>
                      <SecurityMonitoring />
                    </RoleBasedRoute>
                  } 
                />
                
                {/* Settings - All authenticated admin users */}
                <Route 
                  path="/settings/*" 
                  element={<Settings />} 
                />
                
                {/* Default redirect to dashboard */}
                <Route 
                  path="/" 
                  element={<Navigate to="/admin/dashboard" replace />} 
                />
                
                {/* 404 for unmatched admin routes */}
                <Route 
                  path="*" 
                  element={<NotFound />} 
                />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AdminRouter;