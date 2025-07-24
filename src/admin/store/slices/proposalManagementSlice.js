/**
 * Proposal Management Slice
 * Redux slice for proposal management state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SecureFetch } from '../../../utils/securityHeaders';

// Initial state
const initialState = {
  proposals: [],
  currentProposal: null,
  filters: {
    status: 'all',
    category: 'all',
    dateRange: null,
    search: '',
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
export const fetchProposalsAsync = createAsyncThunk(
  'proposalManagement/fetchProposals',
  async ({ page = 1, limit = 20, filters = {} }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/proposals?${queryParams}`,
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
        return rejectWithValue(data.message || 'Failed to fetch proposals');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const createProposalAsync = createAsyncThunk(
  'proposalManagement/createProposal',
  async (proposalData, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/proposals`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(proposalData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to create proposal');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const updateProposalAsync = createAsyncThunk(
  'proposalManagement/updateProposal',
  async ({ proposalId, proposalData }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/proposals/${proposalId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(proposalData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to update proposal');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const deleteProposalAsync = createAsyncThunk(
  'proposalManagement/deleteProposal',
  async (proposalId, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/proposals/${proposalId}`,
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
        return rejectWithValue(data.message || 'Failed to delete proposal');
      }

      return proposalId;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const updateProposalStatusAsync = createAsyncThunk(
  'proposalManagement/updateProposalStatus',
  async ({ proposalId, status, reason }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/proposals/${proposalId}/status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status, reason }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to update proposal status');
      }

      return { proposalId, status, ...data };
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// Proposal Management slice
const proposalManagementSlice = createSlice({
  name: 'proposalManagement',
  initialState,
  reducers: {
    fetchProposalsStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchProposalsSuccess: (state, action) => {
      state.loading = false;
      state.proposals = action.payload.proposals || [];
      state.pagination = action.payload.pagination || state.pagination;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
    },
    fetchProposalsFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    setCurrentProposal: (state, action) => {
      state.currentProposal = action.payload;
    },
    updateProposalStatus: (state, action) => {
      const { proposalId, status } = action.payload;
      const proposal = state.proposals.find(p => p.id === proposalId);
      if (proposal) {
        proposal.status = status;
        state.lastUpdated = new Date().toISOString();
      }
    },
    addProposal: (state, action) => {
      state.proposals = [action.payload, ...state.proposals];
      state.lastUpdated = new Date().toISOString();
    },
    updateProposal: (state, action) => {
      const index = state.proposals.findIndex(proposal => proposal.id === action.payload.id);
      if (index !== -1) {
        state.proposals[index] = { ...state.proposals[index], ...action.payload };
        state.lastUpdated = new Date().toISOString();
      }
    },
    deleteProposal: (state, action) => {
      const proposalId = action.payload;
      const initialLength = state.proposals.length;
      state.proposals = state.proposals.filter(proposal => proposal.id !== proposalId);
      
      if (state.proposals.length !== initialLength) {
        state.lastUpdated = new Date().toISOString();
      }
      
      // Clear current proposal if deleted
      if (state.currentProposal && state.currentProposal.id === proposalId) {
        state.currentProposal = null;
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
    resetProposalManagement: (state) => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch proposals async
      .addCase(fetchProposalsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProposalsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.proposals = action.payload.proposals || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchProposalsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create proposal async
      .addCase(createProposalAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProposalAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.proposals = [action.payload, ...state.proposals];
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createProposalAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update proposal async
      .addCase(updateProposalAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProposalAsync.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.proposals.findIndex(proposal => proposal.id === action.payload.id);
        if (index !== -1) {
          state.proposals[index] = action.payload;
        }
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateProposalAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete proposal async
      .addCase(deleteProposalAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProposalAsync.fulfilled, (state, action) => {
        state.loading = false;
        const proposalId = action.payload;
        state.proposals = state.proposals.filter(proposal => proposal.id !== proposalId);
        
        // Clear current proposal if deleted
        if (state.currentProposal && state.currentProposal.id === proposalId) {
          state.currentProposal = null;
        }
        
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(deleteProposalAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update proposal status async
      .addCase(updateProposalStatusAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProposalStatusAsync.fulfilled, (state, action) => {
        state.loading = false;
        const { proposalId, status } = action.payload;
        const proposal = state.proposals.find(p => p.id === proposalId);
        if (proposal) {
          proposal.status = status;
        }
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateProposalStatusAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  fetchProposalsStart,
  fetchProposalsSuccess,
  fetchProposalsFailure,
  setCurrentProposal,
  updateProposalStatus,
  addProposal,
  updateProposal,
  deleteProposal,
  setFilters,
  setPagination,
  clearError,
  resetProposalManagement,
} = proposalManagementSlice.actions;

// Selectors
export const selectProposalManagement = (state) => state.proposalManagement;
export const selectProposals = (state) => state.proposalManagement.proposals;
export const selectCurrentProposal = (state) => state.proposalManagement.currentProposal;
export const selectProposalFilters = (state) => state.proposalManagement.filters;
export const selectProposalPagination = (state) => state.proposalManagement.pagination;
export const selectProposalManagementLoading = (state) => state.proposalManagement.loading;
export const selectProposalManagementError = (state) => state.proposalManagement.error;

// Computed selectors
export const selectFilteredProposals = (state) => {
  const { proposals, filters } = state.proposalManagement;
  
  return proposals.filter(proposal => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!proposal.title.toLowerCase().includes(searchLower) && 
          !proposal.description.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Status filter
    if (filters.status !== 'all' && proposal.status !== filters.status) {
      return false;
    }
    
    // Category filter
    if (filters.category !== 'all' && proposal.category !== filters.category) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange) {
      const proposalDate = new Date(proposal.createdAt);
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      if (proposalDate < startDate || proposalDate > endDate) {
        return false;
      }
    }
    
    return true;
  });
};

export const selectProposalsByStatus = (status) => (state) => {
  return state.proposalManagement.proposals.filter(proposal => proposal.status === status);
};

export const selectProposalsByCategory = (category) => (state) => {
  return state.proposalManagement.proposals.filter(proposal => proposal.category === category);
};

export const selectActiveProposals = (state) => {
  return state.proposalManagement.proposals.filter(proposal => proposal.status === 'active');
};

export const selectProposalStats = (state) => {
  const proposals = state.proposalManagement.proposals;
  const total = proposals.length;
  
  const statusStats = {
    pending: proposals.filter(p => p.status === 'pending').length,
    active: proposals.filter(p => p.status === 'active').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
    expired: proposals.filter(p => p.status === 'expired').length,
  };
  
  const categoryStats = {
    funding: proposals.filter(p => p.category === 'funding').length,
    technical: proposals.filter(p => p.category === 'technical').length,
    governance: proposals.filter(p => p.category === 'governance').length,
    community: proposals.filter(p => p.category === 'community').length,
  };
  
  const totalVotes = proposals.reduce((sum, p) => sum + (p.totalVotes || 0), 0);
  const avgParticipation = total > 0 ? (totalVotes / total).toFixed(2) : 0;
  
  return {
    total,
    statusStats,
    categoryStats,
    totalVotes,
    avgParticipation,
  };
};

export const selectProposalVotingProgress = (proposalId) => (state) => {
  const proposal = state.proposalManagement.proposals.find(p => p.id === proposalId);
  if (!proposal) return null;
  
  const { votesFor = 0, votesAgainst = 0, totalVotes = 0, requiredQuorum = 0 } = proposal;
  const quorumProgress = requiredQuorum > 0 ? (totalVotes / requiredQuorum) * 100 : 0;
  const approvalRate = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;
  
  return {
    votesFor,
    votesAgainst,
    totalVotes,
    requiredQuorum,
    quorumProgress: Math.min(quorumProgress, 100),
    approvalRate,
    isQuorumMet: totalVotes >= requiredQuorum,
  };
};

export default proposalManagementSlice.reducer;