/**
 * User Management Slice Tests
 * Testing user management state with TDD approach
 */

import userManagementSlice, {
  fetchUsersStart,
  fetchUsersSuccess,
  fetchUsersFailure,
  addUser,
  updateUser,
  deleteUser,
  setCurrentUser,
  updateUserRole,
  updateUserStatus,
  setFilters,
  setPagination,
  clearError,
  resetUserManagement,
} from './userManagementSlice';

describe('User Management Slice', () => {
  const initialState = {
    users: [],
    roles: [
      { id: 'admin', name: 'Administrator', permissions: ['all'] },
      { id: 'moderator', name: 'Moderator', permissions: ['users:view', 'proposals:manage'] },
      { id: 'viewer', name: 'Viewer', permissions: ['dashboard:view'] },
    ],
    currentUser: null,
    filters: {
      search: '',
      role: 'all',
      status: 'all',
      dateRange: null,
    },
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
    loading: false,
    error: null,
    lastUpdated: null,
  };

  test('should return the initial state', () => {
    expect(userManagementSlice(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('User Fetching', () => {
    test('should handle fetch users start', () => {
      const actual = userManagementSlice(initialState, fetchUsersStart());
      expect(actual.loading).toBe(true);
      expect(actual.error).toBe(null);
    });

    test('should handle fetch users success', () => {
      const usersData = {
        users: [
          {
            id: '1',
            email: 'admin@ganjes.io',
            name: 'Admin User',
            role: 'admin',
            status: 'active',
            lastLogin: '2025-07-24T10:00:00Z',
            createdAt: '2025-01-01T00:00:00Z',
          },
          {
            id: '2',
            email: 'moderator@ganjes.io',
            name: 'Moderator User',
            role: 'moderator',
            status: 'active',
            lastLogin: '2025-07-23T15:30:00Z',
            createdAt: '2025-01-15T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      const actual = userManagementSlice(
        { ...initialState, loading: true },
        fetchUsersSuccess(usersData)
      );

      expect(actual.loading).toBe(false);
      expect(actual.users).toEqual(usersData.users);
      expect(actual.pagination).toEqual(usersData.pagination);
      expect(actual.error).toBe(null);
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle fetch users failure', () => {
      const errorMessage = 'Failed to fetch users';
      const actual = userManagementSlice(
        { ...initialState, loading: true },
        fetchUsersFailure(errorMessage)
      );

      expect(actual.loading).toBe(false);
      expect(actual.error).toBe(errorMessage);
      expect(actual.users).toEqual([]);
    });
  });

  describe('User CRUD Operations', () => {
    test('should handle adding a new user', () => {
      const newUser = {
        id: '3',
        email: 'newuser@ganjes.io',
        name: 'New User',
        role: 'viewer',
        status: 'active',
        createdAt: '2025-07-24T12:00:00Z',
      };

      const stateWithUsers = {
        ...initialState,
        users: [
          { id: '1', email: 'admin@ganjes.io', name: 'Admin' },
          { id: '2', email: 'mod@ganjes.io', name: 'Moderator' },
        ],
      };

      const actual = userManagementSlice(stateWithUsers, addUser(newUser));

      expect(actual.users).toHaveLength(3);
      expect(actual.users[0]).toEqual(newUser); // New user added at beginning
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle updating an existing user', () => {
      const existingUsers = [
        { id: '1', email: 'admin@ganjes.io', name: 'Admin', role: 'admin' },
        { id: '2', email: 'mod@ganjes.io', name: 'Moderator', role: 'moderator' },
      ];

      const userUpdate = {
        id: '1',
        name: 'Updated Admin',
        email: 'updated-admin@ganjes.io',
      };

      const stateWithUsers = {
        ...initialState,
        users: existingUsers,
      };

      const actual = userManagementSlice(stateWithUsers, updateUser(userUpdate));

      expect(actual.users[0].name).toBe('Updated Admin');
      expect(actual.users[0].email).toBe('updated-admin@ganjes.io');
      expect(actual.users[0].role).toBe('admin'); // Unchanged field preserved
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle deleting a user', () => {
      const existingUsers = [
        { id: '1', email: 'admin@ganjes.io', name: 'Admin' },
        { id: '2', email: 'mod@ganjes.io', name: 'Moderator' },
        { id: '3', email: 'viewer@ganjes.io', name: 'Viewer' },
      ];

      const stateWithUsers = {
        ...initialState,
        users: existingUsers,
      };

      const actual = userManagementSlice(stateWithUsers, deleteUser('2'));

      expect(actual.users).toHaveLength(2);
      expect(actual.users.find(u => u.id === '2')).toBeUndefined();
      expect(actual.lastUpdated).toBeDefined();
    });
  });

  describe('Current User Management', () => {
    test('should handle setting current user', () => {
      const user = {
        id: '1',
        email: 'admin@ganjes.io',
        name: 'Admin User',
        role: 'admin',
      };

      const actual = userManagementSlice(initialState, setCurrentUser(user));

      expect(actual.currentUser).toEqual(user);
    });

    test('should handle clearing current user', () => {
      const stateWithCurrentUser = {
        ...initialState,
        currentUser: { id: '1', name: 'Admin' },
      };

      const actual = userManagementSlice(stateWithCurrentUser, setCurrentUser(null));

      expect(actual.currentUser).toBe(null);
    });
  });

  describe('User Role and Status Updates', () => {
    test('should handle updating user role', () => {
      const existingUsers = [
        { id: '1', email: 'user@ganjes.io', name: 'User', role: 'viewer' },
      ];

      const stateWithUsers = {
        ...initialState,
        users: existingUsers,
      };

      const actual = userManagementSlice(
        stateWithUsers,
        updateUserRole({ userId: '1', role: 'moderator' })
      );

      expect(actual.users[0].role).toBe('moderator');
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle updating user status', () => {
      const existingUsers = [
        { id: '1', email: 'user@ganjes.io', name: 'User', status: 'active' },
      ];

      const stateWithUsers = {
        ...initialState,
        users: existingUsers,
      };

      const actual = userManagementSlice(
        stateWithUsers,
        updateUserStatus({ userId: '1', status: 'suspended' })
      );

      expect(actual.users[0].status).toBe('suspended');
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should not update role for non-existent user', () => {
      const existingUsers = [
        { id: '1', email: 'user@ganjes.io', name: 'User', role: 'viewer' },
      ];

      const stateWithUsers = {
        ...initialState,
        users: existingUsers,
      };

      const actual = userManagementSlice(
        stateWithUsers,
        updateUserRole({ userId: '999', role: 'admin' })
      );

      expect(actual.users[0].role).toBe('viewer'); // Unchanged
      expect(actual.lastUpdated).toBe(null); // No update occurred
    });
  });

  describe('Filters and Pagination', () => {
    test('should handle setting filters', () => {
      const filters = {
        search: 'admin',
        role: 'admin',
        status: 'active',
      };

      const actual = userManagementSlice(initialState, setFilters(filters));

      expect(actual.filters.search).toBe('admin');
      expect(actual.filters.role).toBe('admin');
      expect(actual.filters.status).toBe('active');
    });

    test('should handle partial filter updates', () => {
      const stateWithFilters = {
        ...initialState,
        filters: {
          search: 'test',
          role: 'all',
          status: 'active',
        },
      };

      const actual = userManagementSlice(
        stateWithFilters,
        setFilters({ search: 'updated' })
      );

      expect(actual.filters.search).toBe('updated');
      expect(actual.filters.role).toBe('all'); // Preserved
      expect(actual.filters.status).toBe('active'); // Preserved
    });

    test('should handle setting pagination', () => {
      const pagination = {
        page: 2,
        limit: 50,
        total: 100,
        totalPages: 2,
      };

      const actual = userManagementSlice(initialState, setPagination(pagination));

      expect(actual.pagination).toEqual(pagination);
    });
  });

  describe('Error Handling and Reset', () => {
    test('should handle clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const actual = userManagementSlice(errorState, clearError());

      expect(actual.error).toBe(null);
    });

    test('should handle reset user management', () => {
      const modifiedState = {
        ...initialState,
        users: [{ id: '1', name: 'Test' }],
        currentUser: { id: '1', name: 'Test' },
        loading: true,
        error: 'Some error',
      };

      const actual = userManagementSlice(modifiedState, resetUserManagement());

      expect(actual).toEqual(initialState);
    });
  });

  describe('State Immutability', () => {
    test('should maintain state immutability', () => {
      const state = { ...initialState };
      const newState = userManagementSlice(state, fetchUsersStart());
      
      expect(state).not.toBe(newState);
      expect(state.loading).toBe(false);
      expect(newState.loading).toBe(true);
    });

    test('should not mutate users array', () => {
      const users = [{ id: '1', name: 'User1' }];
      const state = { ...initialState, users };
      
      const newUser = { id: '2', name: 'User2' };
      const newState = userManagementSlice(state, addUser(newUser));

      expect(state.users).toHaveLength(1);
      expect(newState.users).toHaveLength(2);
      expect(state.users).not.toBe(newState.users);
    });
  });

  describe('Edge Cases', () => {
    test('should handle updating non-existent user gracefully', () => {
      const stateWithUsers = {
        ...initialState,
        users: [{ id: '1', name: 'User1' }],
      };

      const actual = userManagementSlice(
        stateWithUsers,
        updateUser({ id: '999', name: 'Non-existent' })
      );

      expect(actual.users).toHaveLength(1);
      expect(actual.users[0].name).toBe('User1'); // Unchanged
    });

    test('should handle deleting non-existent user gracefully', () => {
      const stateWithUsers = {
        ...initialState,
        users: [{ id: '1', name: 'User1' }],
      };

      const actual = userManagementSlice(stateWithUsers, deleteUser('999'));

      expect(actual.users).toHaveLength(1);
      expect(actual.users[0].name).toBe('User1'); // Unchanged
    });

    test('should handle empty search filter', () => {
      const actual = userManagementSlice(
        initialState,
        setFilters({ search: '' })
      );

      expect(actual.filters.search).toBe('');
    });
  });
});