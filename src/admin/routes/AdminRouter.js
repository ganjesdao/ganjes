/**
 * Admin Router
 * Simplified routing for admin login and dashboard only
 */

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
// Components
import AdminLogin from '../components/auth/AdminLogin';
import Dashboard from '../components/dashboard/Dashboard';
import Proposers from '../components/proposers/Proposers';
import Investors from '../components/investors/Investors';
import Executed from '../components/executed/Executed';
import ProposalManagement from '../components/proposals/ProposalManagement';
import ProposalDetails from '../components/proposals/ProposalDetails';
// Route Guards
import ProtectedRoute from './ProtectedRoute';

// Selectors
import { selectIsAuthenticated, restoreAuthFromStorage } from '../store/slices/authSlice';

const AdminRouter = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Restore authentication state on app initialization
  useEffect(() => {
    dispatch(restoreAuthFromStorage());
  }, [dispatch]);

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
            <Routes>
              {/* Dashboard - Standalone dashboard with integrated layout */}
              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              {/* Proposers Management */}
              <Route
                path="/proposers"
                element={<Proposers />}
              />

              {/* Investors Management */}
              <Route
                path="/investors"
                element={<Investors />}
              />

              {/* Executed Proposals */}
              <Route
                path="/executed"
                element={<Executed />}
              />

              {/* Default redirect to dashboard */}
              <Route
                path="/"
                element={<Navigate to="/admin/dashboard" replace />}
              />

              {/* 404 redirect to dashboard */}
              <Route
                path="*"
                element={<Navigate to="/admin/dashboard" replace />}
              />

              <Route path="/proposal-manager" element={<ProposalManagement />} />
              <Route path="/proposal-details" element={<ProposalDetails />} />
            </Routes>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AdminRouter;