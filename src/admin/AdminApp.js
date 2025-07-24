/**
 * Admin App Component
 * Wrapper for admin section with Redux provider
 */

import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { adminStore } from './store/store';
import AdminRouter from './routes/AdminRouter';

const AdminApp = () => {
  return (
    <Provider store={adminStore}>
      <AdminRouter />
    </Provider>
  );
};

export default AdminApp;