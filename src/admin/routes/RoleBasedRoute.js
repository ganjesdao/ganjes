/**
 * Role-Based Route Component
 * Restricts access based on user roles and permissions
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectUser, selectPermissions } from '../store/slices/authSlice';
import AccessDenied from '../components/common/AccessDenied';

const RoleBasedRoute = ({ 
  children, 
  requiredRoles = [], 
  requiredPermissions = [],
  requireAll = false // If true, user must have ALL roles/permissions; if false, ANY will suffice
}) => {
  const user = useSelector(selectUser);
  const userPermissions = useSelector(selectPermissions);
  
  // Use useMemo to prevent creating new selector on each render
  const hasAnyPermission = useMemo(() => {
    if (requiredPermissions.length === 0) return true;
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
  }, [requiredPermissions, userPermissions]);

  // Check if user has required role
  const hasRequiredRole = () => {
    if (requiredRoles.length === 0) return true;
    
    const userRole = user?.role;
    if (!userRole) return false;

    if (requireAll) {
      return requiredRoles.includes(userRole);
    } else {
      return requiredRoles.includes(userRole);
    }
  };

  // Check if user has required permissions
  const hasRequiredPermissions = () => {
    if (requiredPermissions.length === 0) return true;
    
    if (requireAll) {
      return requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );
    } else {
      return hasAnyPermission;
    }
  };

  // Special handling for admin role - admins have access to everything
  const isAdmin = user?.role === 'admin';
  const hasAccess = isAdmin || (hasRequiredRole() && hasRequiredPermissions());

  if (!hasAccess) {
    return (
      <AccessDenied 
        requiredRoles={requiredRoles}
        requiredPermissions={requiredPermissions}
        userRole={user?.role}
        userPermissions={userPermissions}
      />
    );
  }

  return children;
};

export default RoleBasedRoute;