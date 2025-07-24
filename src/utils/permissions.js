/**
 * Permission Management System
 * Role-based access control with granular permissions
 */

import { TokenManager } from './secureStorage';

/**
 * Permission Constants
 */
export const PERMISSIONS = {
  // Proposal permissions
  CREATE_PROPOSAL: 'create_proposal',
  VIEW_PROPOSAL: 'view_proposal',
  EDIT_PROPOSAL: 'edit_proposal',
  DELETE_PROPOSAL: 'delete_proposal',
  
  // Voting permissions
  VOTE_ON_PROPOSAL: 'vote_on_proposal',
  VIEW_VOTES: 'view_votes',
  
  // Admin permissions
  EXECUTE_PROPOSAL: 'execute_proposal',
  MANAGE_USERS: 'manage_users',
  WITHDRAW_FUNDS: 'withdraw_funds',
  SET_PARAMETERS: 'set_parameters',
  
  // Investment permissions
  DEPOSIT_FUNDS: 'deposit_funds',
  VIEW_ANALYTICS: 'view_analytics',
  
  // Marketplace permissions
  VIEW_MARKETPLACE: 'view_marketplace',
  
  // System permissions
  ACCESS_ADMIN_PANEL: 'access_admin_panel',
  VIEW_LOGS: 'view_logs',
  MANAGE_PERMISSIONS: 'manage_permissions',
};

/**
 * Role Definitions with Permissions
 */
export const ROLES = {
  GUEST: {
    name: 'Guest',
    permissions: [
      PERMISSIONS.VIEW_PROPOSAL,
      PERMISSIONS.VIEW_MARKETPLACE,
    ]
  },
  
  INVESTOR: {
    name: 'Investor',
    permissions: [
      PERMISSIONS.VIEW_PROPOSAL,
      PERMISSIONS.VOTE_ON_PROPOSAL,
      PERMISSIONS.VIEW_VOTES,
      PERMISSIONS.DEPOSIT_FUNDS,
      PERMISSIONS.VIEW_ANALYTICS,
      PERMISSIONS.VIEW_MARKETPLACE,
    ]
  },
  
  PROPOSER: {
    name: 'Proposer',
    permissions: [
      PERMISSIONS.CREATE_PROPOSAL,
      PERMISSIONS.VIEW_PROPOSAL,
      PERMISSIONS.EDIT_PROPOSAL,
      PERMISSIONS.DELETE_PROPOSAL,
      PERMISSIONS.VIEW_MARKETPLACE,
    ]
  },
  
  ADMIN: {
    name: 'Admin',
    permissions: [
      // All permissions
      ...Object.values(PERMISSIONS)
    ]
  },
  
  SUPER_ADMIN: {
    name: 'Super Admin',
    permissions: [
      // All permissions
      ...Object.values(PERMISSIONS)
    ]
  }
};

/**
 * Permission Manager Class
 */
export class PermissionManager {
  /**
   * Get current user's role
   */
  static getCurrentUserRole() {
    const userInfo = TokenManager.getUserInfo();
    if (!userInfo || !userInfo.role) {
      return 'GUEST';
    }
    
    // Normalize role name
    const role = userInfo.role.toUpperCase();
    return ROLES[role] ? role : 'GUEST';
  }

  /**
   * Get current user's permissions
   */
  static getCurrentUserPermissions() {
    const role = this.getCurrentUserRole();
    return ROLES[role]?.permissions || ROLES.GUEST.permissions;
  }

  /**
   * Check if current user has a specific permission
   */
  static hasPermission(permission) {
    const userPermissions = this.getCurrentUserPermissions();
    return userPermissions.includes(permission);
  }

  /**
   * Check if current user has any of the specified permissions
   */
  static hasAnyPermission(permissions) {
    if (!Array.isArray(permissions)) {
      return this.hasPermission(permissions);
    }
    
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if current user has all of the specified permissions
   */
  static hasAllPermissions(permissions) {
    if (!Array.isArray(permissions)) {
      return this.hasPermission(permissions);
    }
    
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Check if current user has a specific role
   */
  static hasRole(role) {
    const currentRole = this.getCurrentUserRole();
    return currentRole === role.toUpperCase();
  }

  /**
   * Check if current user has any of the specified roles
   */
  static hasAnyRole(roles) {
    if (!Array.isArray(roles)) {
      return this.hasRole(roles);
    }
    
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Get user info with role validation
   */
  static getValidatedUserInfo() {
    const userInfo = TokenManager.getUserInfo();
    if (!userInfo) {
      return null;
    }

    const role = this.getCurrentUserRole();
    return {
      ...userInfo,
      role: role,
      permissions: this.getCurrentUserPermissions(),
      isAuthenticated: TokenManager.isAuthenticated(),
    };
  }

  /**
   * Check if user can access a specific route
   */
  static canAccessRoute(routePath, requiredPermissions = []) {
    // Public routes (no authentication required)
    const publicRoutes = [
      '/',
      '/landing',
      '/marketplace',
      '/proposal',
      '/join',
      '/signin',
      '/register',
      '/investor-login',
      '/investor-register',
    ];

    if (publicRoutes.includes(routePath)) {
      return true;
    }

    // Check if user is authenticated
    if (!TokenManager.isAuthenticated()) {
      return false;
    }

    // If no specific permissions required, just check authentication
    if (requiredPermissions.length === 0) {
      return true;
    }

    // Check required permissions
    return this.hasAllPermissions(requiredPermissions);
  }

  /**
   * Get filtered navigation items based on permissions
   */
  static getAuthorizedNavItems(navItems) {
    return navItems.filter(item => {
      if (!item.requiredPermissions) {
        return true; // No restrictions
      }
      
      return this.hasAnyPermission(item.requiredPermissions);
    });
  }
}

/**
 * Permission-based Component Wrapper
 */
export const withPermission = (WrappedComponent, requiredPermissions, fallbackComponent = null) => {
  return function PermissionWrapper(props) {
    const hasPermission = PermissionManager.hasAllPermissions(requiredPermissions);
    
    if (!hasPermission) {
      if (fallbackComponent) {
        return fallbackComponent;
      }
      
      return (
        <div className="alert alert-warning text-center">
          <h5>Access Denied</h5>
          <p>You don't have permission to access this feature.</p>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
};

/**
 * Permission Check Hook
 */
export const usePermissions = () => {
  const userInfo = PermissionManager.getValidatedUserInfo();
  
  return {
    userInfo,
    role: PermissionManager.getCurrentUserRole(),
    permissions: PermissionManager.getCurrentUserPermissions(),
    hasPermission: PermissionManager.hasPermission,
    hasAnyPermission: PermissionManager.hasAnyPermission,
    hasAllPermissions: PermissionManager.hasAllPermissions,
    hasRole: PermissionManager.hasRole,
    hasAnyRole: PermissionManager.hasAnyRole,
    canAccessRoute: PermissionManager.canAccessRoute,
    isAuthenticated: TokenManager.isAuthenticated(),
  };
};

/**
 * Protected Route Component
 */
export const ProtectedRoute = ({ 
  children, 
  requiredPermissions = [], 
  requiredRoles = [],
  fallback = null 
}) => {
  const isAuthenticated = TokenManager.isAuthenticated();
  
  // Check authentication
  if (!isAuthenticated) {
    return fallback || (
      <div className="alert alert-info text-center">
        <h5>Authentication Required</h5>
        <p>Please log in to access this page.</p>
        <a href="/signin" className="btn btn-primary">Sign In</a>
      </div>
    );
  }
  
  // Check permissions
  if (requiredPermissions.length > 0 && !PermissionManager.hasAllPermissions(requiredPermissions)) {
    return fallback || (
      <div className="alert alert-warning text-center">
        <h5>Insufficient Permissions</h5>
        <p>You don't have the required permissions to access this page.</p>
        <p>Required: {requiredPermissions.join(', ')}</p>
      </div>
    );
  }
  
  // Check roles
  if (requiredRoles.length > 0 && !PermissionManager.hasAnyRole(requiredRoles)) {
    return fallback || (
      <div className="alert alert-warning text-center">
        <h5>Role Access Denied</h5>
        <p>Your current role doesn't have access to this page.</p>
        <p>Required roles: {requiredRoles.join(' or ')}</p>
      </div>
    );
  }
  
  return children;
};

/**
 * Conditional Render Component
 */
export const PermissionGate = ({ 
  permission = null, 
  permissions = [],
  role = null,
  roles = [],
  children,
  fallback = null 
}) => {
  let hasAccess = true;
  
  // Check single permission
  if (permission && !PermissionManager.hasPermission(permission)) {
    hasAccess = false;
  }
  
  // Check multiple permissions (must have all)
  if (permissions.length > 0 && !PermissionManager.hasAllPermissions(permissions)) {
    hasAccess = false;
  }
  
  // Check single role
  if (role && !PermissionManager.hasRole(role)) {
    hasAccess = false;
  }
  
  // Check multiple roles (must have any)
  if (roles.length > 0 && !PermissionManager.hasAnyRole(roles)) {
    hasAccess = false;
  }
  
  return hasAccess ? children : fallback;
};

/**
 * Admin-only utilities
 */
export class AdminUtils {
  /**
   * Check if current user is admin
   */
  static isAdmin() {
    return PermissionManager.hasAnyRole(['ADMIN', 'SUPER_ADMIN']);
  }

  /**
   * Check if current user is super admin
   */
  static isSuperAdmin() {
    return PermissionManager.hasRole('SUPER_ADMIN');
  }

  /**
   * Get admin-specific permissions
   */
  static getAdminPermissions() {
    if (!this.isAdmin()) {
      return [];
    }
    
    return ROLES.ADMIN.permissions;
  }

  /**
   * Validate admin action
   */
  static validateAdminAction(action, requiredPermission) {
    if (!this.isAdmin()) {
      throw new Error('Admin access required');
    }
    
    if (requiredPermission && !PermissionManager.hasPermission(requiredPermission)) {
      throw new Error(`Permission '${requiredPermission}' required for action '${action}'`);
    }
    
    return true;
  }
}

/**
 * Route Configuration with Permissions
 */
export const ROUTE_PERMISSIONS = {
  // Public routes
  '/': [],
  '/landing': [],
  '/marketplace': [PERMISSIONS.VIEW_MARKETPLACE],
  '/proposal': [PERMISSIONS.VIEW_PROPOSAL],
  '/join': [],
  
  // Auth routes
  '/signin': [],
  '/register': [],
  '/investor-login': [],
  '/investor-register': [],
  
  // Proposer routes
  '/dashboard': [PERMISSIONS.CREATE_PROPOSAL],
  '/create-proposal': [PERMISSIONS.CREATE_PROPOSAL],
  '/proposal-create': [PERMISSIONS.CREATE_PROPOSAL],
  '/proposal-details': [PERMISSIONS.VIEW_PROPOSAL],
  
  // Investor routes
  '/investor-dashboard': [PERMISSIONS.VOTE_ON_PROPOSAL],
  '/investor-analytics': [PERMISSIONS.VIEW_ANALYTICS],
  '/investor-vote': [PERMISSIONS.VOTE_ON_PROPOSAL],
  '/investor-voting-data': [PERMISSIONS.VIEW_VOTES],
  '/investor-join': [PERMISSIONS.DEPOSIT_FUNDS],
  
  // Admin routes (add if needed)
  '/admin': [PERMISSIONS.ACCESS_ADMIN_PANEL],
  '/admin/users': [PERMISSIONS.MANAGE_USERS],
  '/admin/settings': [PERMISSIONS.SET_PARAMETERS],
};

export default {
  PERMISSIONS,
  ROLES,
  PermissionManager,
  withPermission,
  usePermissions,
  ProtectedRoute,
  PermissionGate,
  AdminUtils,
  ROUTE_PERMISSIONS,
};