/**
 * User Management Slice
 * Redux slice for user management state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SecureFetch } from '../../../utils/securityHeaders';

// Initial state
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

// Async thunks
export const fetchUsersAsync = createAsyncThunk(
  'userManagement/fetchUsers',
  async ({ page = 1, limit = 20, filters = {} }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/users?${queryParams}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to fetch users');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const createUserAsync = createAsyncThunk(
  'userManagement/createUser',
  async (userData, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/users`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to create user');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const updateUserAsync = createAsyncThunk(
  'userManagement/updateUser',
  async ({ userId, userData }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to update user');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const deleteUserAsync = createAsyncThunk(
  'userManagement/deleteUser',
  async (userId, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return rejectWithValue(data.message || 'Failed to delete user');
      }

      return userId;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// User Management slice
const userManagementSlice = createSlice({
  name: 'userManagement',
  initialState,
  reducers: {
    fetchUsersStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchUsersSuccess: (state, action) => {
      state.loading = false;
      state.users = action.payload.users || [];
      state.pagination = action.payload.pagination || state.pagination;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
    },
    fetchUsersFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    addUser: (state, action) => {
      state.users = [action.payload, ...state.users];
      state.lastUpdated = new Date().toISOString();
    },
    updateUser: (state, action) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = { ...state.users[index], ...action.payload };
        state.lastUpdated = new Date().toISOString();
      }
    },
    deleteUser: (state, action) => {
      const userId = action.payload;
      const initialLength = state.users.length;
      state.users = state.users.filter(user => user.id !== userId);
      
      if (state.users.length !== initialLength) {
        state.lastUpdated = new Date().toISOString();
      }
      
      // Clear current user if deleted
      if (state.currentUser && state.currentUser.id === userId) {
        state.currentUser = null;
      }
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
    updateUserRole: (state, action) => {
      const { userId, role } = action.payload;
      const user = state.users.find(u => u.id === userId);
      if (user) {
        user.role = role;
        state.lastUpdated = new Date().toISOString();
      }
    },
    updateUserStatus: (state, action) => {
      const { userId, status } = action.payload;
      const user = state.users.find(u => u.id === userId);
      if (user) {
        user.status = status;
        state.lastUpdated = new Date().toISOString();
      }
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    resetUserManagement: (state) => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch users async
      .addCase(fetchUsersAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsersAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchUsersAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create user async
      .addCase(createUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUserAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.users = [action.payload, ...state.users];
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update user async
      .addCase(updateUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete user async
      .addCase(deleteUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUserAsync.fulfilled, (state, action) => {
        state.loading = false;
        const userId = action.payload;
        state.users = state.users.filter(user => user.id !== userId);
        
        // Clear current user if deleted
        if (state.currentUser && state.currentUser.id === userId) {
          state.currentUser = null;
        }
        
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
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
} = userManagementSlice.actions;

// Selectors
export const selectUserManagement = (state) => state.userManagement;
export const selectUsers = (state) => state.userManagement.users;
export const selectCurrentUser = (state) => state.userManagement.currentUser;
export const selectUserRoles = (state) => state.userManagement.roles;
export const selectUserFilters = (state) => state.userManagement.filters;
export const selectUserPagination = (state) => state.userManagement.pagination;
export const selectUserManagementLoading = (state) => state.userManagement.loading;
export const selectUserManagementError = (state) => state.userManagement.error;

// Computed selectors
export const selectFilteredUsers = (state) => {
  const { users, filters } = state.userManagement;
  
  return users.filter(user => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!user.name.toLowerCase().includes(searchLower) && 
          !user.email.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Role filter
    if (filters.role !== 'all' && user.role !== filters.role) {
      return false;
    }
    
    // Status filter
    if (filters.status !== 'all' && user.status !== filters.status) {
      return false;
    }
    
    return true;
  });
};

export const selectUsersByRole = (role) => (state) => {
  return state.userManagement.users.filter(user => user.role === role);
};

export const selectActiveUsers = (state) => {
  return state.userManagement.users.filter(user => user.status === 'active');
};

export const selectUserStats = (state) => {
  const users = state.userManagement.users;
  const total = users.length;
  const active = users.filter(u => u.status === 'active').length;
  const suspended = users.filter(u => u.status === 'suspended').length;
  const inactive = users.filter(u => u.status === 'inactive').length;
  
  const roleStats = {};
  state.userManagement.roles.forEach(role => {
    roleStats[role.id] = users.filter(u => u.role === role.id).length;
  });
  
  return {
    total,
    active,
    suspended,
    inactive,
    roleStats,
  };
};

export default userManagementSlice.reducer;