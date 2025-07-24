/**
 * Financial Management Slice
 * Redux slice for financial management state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SecureFetch } from '../../../utils/securityHeaders';

// Initial state
const initialState = {
  treasury: {
    balance: '0',
    allocation: [],
    totalAllocated: '0',
    availableBalance: '0',
    tokens: [],
  },
  transactions: [],
  transactionFilters: {
    type: 'all',
    status: 'all',
    dateRange: null,
    amountRange: null,
  },
  reports: [],
  reportFilters: {
    type: 'all',
    period: 'monthly',
    dateRange: null,
  },
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchTreasuryAsync = createAsyncThunk(
  'financialManagement/fetchTreasury',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/treasury`,
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
        return rejectWithValue(data.message || 'Failed to fetch treasury data');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const fetchTransactionsAsync = createAsyncThunk(
  'financialManagement/fetchTransactions',
  async ({ page = 1, limit = 20, filters = {} }, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });

      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/transactions?${queryParams}`,
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
        return rejectWithValue(data.message || 'Failed to fetch transactions');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const createTransactionAsync = createAsyncThunk(
  'financialManagement/createTransaction',
  async (transactionData, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/transactions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to create transaction');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const generateReportAsync = createAsyncThunk(
  'financialManagement/generateReport',
  async (reportConfig, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/reports/generate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reportConfig),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to generate report');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const updateTreasuryAllocationAsync = createAsyncThunk(
  'financialManagement/updateTreasuryAllocation',
  async (allocationData, { rejectWithValue, getState }) => {
    try {
      const { auth } = getState();
      const response = await SecureFetch.fetch(
        `${process.env.REACT_APP_BASE_API_URL}/admin/treasury/allocation`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(allocationData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to update treasury allocation');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// Financial Management slice
const financialManagementSlice = createSlice({
  name: 'financialManagement',
  initialState,
  reducers: {
    fetchTreasuryStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchTreasurySuccess: (state, action) => {
      state.loading = false;
      state.treasury = action.payload.treasury || state.treasury;
      state.transactions = action.payload.transactions || state.transactions;
      state.error = null;
      state.lastUpdated = new Date().toISOString();
    },
    fetchTreasuryFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateTreasuryBalance: (state, action) => {
      state.treasury = { ...state.treasury, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
    setTreasuryAllocation: (state, action) => {
      state.treasury.allocation = action.payload;
      state.lastUpdated = new Date().toISOString();
    },
    addTransaction: (state, action) => {
      state.transactions = [action.payload, ...state.transactions];
      state.lastUpdated = new Date().toISOString();
    },
    updateTransaction: (state, action) => {
      const index = state.transactions.findIndex(tx => tx.id === action.payload.id);
      if (index !== -1) {
        state.transactions[index] = { ...state.transactions[index], ...action.payload };
        state.lastUpdated = new Date().toISOString();
      }
    },
    setTransactionFilters: (state, action) => {
      state.transactionFilters = { ...state.transactionFilters, ...action.payload };
    },
    generateReport: (state, action) => {
      state.loading = true;
      state.error = null;
    },
    addReport: (state, action) => {
      state.reports = [action.payload, ...state.reports];
      state.lastUpdated = new Date().toISOString();
    },
    removeReport: (state, action) => {
      const reportId = action.payload;
      const initialLength = state.reports.length;
      state.reports = state.reports.filter(report => report.id !== reportId);
      
      if (state.reports.length !== initialLength) {
        state.lastUpdated = new Date().toISOString();
      }
    },
    setReportFilters: (state, action) => {
      state.reportFilters = { ...state.reportFilters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    resetFinancialManagement: (state) => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch treasury async
      .addCase(fetchTreasuryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTreasuryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.treasury = action.payload.treasury || state.treasury;
        state.transactions = action.payload.transactions || state.transactions;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchTreasuryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch transactions async
      .addCase(fetchTransactionsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactionsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload.transactions || [];
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchTransactionsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create transaction async
      .addCase(createTransactionAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTransactionAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = [action.payload, ...state.transactions];
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createTransactionAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Generate report async
      .addCase(generateReportAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateReportAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = [action.payload, ...state.reports];
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(generateReportAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update treasury allocation async
      .addCase(updateTreasuryAllocationAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTreasuryAllocationAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.treasury.allocation = action.payload.allocation || state.treasury.allocation;
        state.treasury.totalAllocated = action.payload.totalAllocated || state.treasury.totalAllocated;
        state.treasury.availableBalance = action.payload.availableBalance || state.treasury.availableBalance;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateTreasuryAllocationAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  fetchTreasuryStart,
  fetchTreasurySuccess,
  fetchTreasuryFailure,
  updateTreasuryBalance,
  setTreasuryAllocation,
  addTransaction,
  updateTransaction,
  setTransactionFilters,
  generateReport,
  addReport,
  removeReport,
  setReportFilters,
  clearError,
  resetFinancialManagement,
} = financialManagementSlice.actions;

// Selectors
export const selectFinancialManagement = (state) => state.financialManagement;
export const selectTreasury = (state) => state.financialManagement.treasury;
export const selectTransactions = (state) => state.financialManagement.transactions;
export const selectTransactionFilters = (state) => state.financialManagement.transactionFilters;
export const selectReports = (state) => state.financialManagement.reports;
export const selectReportFilters = (state) => state.financialManagement.reportFilters;
export const selectFinancialManagementLoading = (state) => state.financialManagement.loading;
export const selectFinancialManagementError = (state) => state.financialManagement.error;

// Computed selectors
export const selectFilteredTransactions = (state) => {
  const { transactions, transactionFilters } = state.financialManagement;
  
  return transactions.filter(transaction => {
    // Type filter
    if (transactionFilters.type !== 'all' && transaction.type !== transactionFilters.type) {
      return false;
    }
    
    // Status filter
    if (transactionFilters.status !== 'all' && transaction.status !== transactionFilters.status) {
      return false;
    }
    
    // Date range filter
    if (transactionFilters.dateRange) {
      const txDate = new Date(transaction.timestamp);
      const startDate = new Date(transactionFilters.dateRange.start);
      const endDate = new Date(transactionFilters.dateRange.end);
      
      if (txDate < startDate || txDate > endDate) {
        return false;
      }
    }
    
    // Amount range filter
    if (transactionFilters.amountRange) {
      const amount = parseFloat(transaction.amount);
      const minAmount = parseFloat(transactionFilters.amountRange.min || '0');
      const maxAmount = parseFloat(transactionFilters.amountRange.max || 'Infinity');
      
      if (amount < minAmount || amount > maxAmount) {
        return false;
      }
    }
    
    return true;
  });
};

export const selectTransactionsByType = (type) => (state) => {
  return state.financialManagement.transactions.filter(tx => tx.type === type);
};

export const selectTransactionsByStatus = (status) => (state) => {
  return state.financialManagement.transactions.filter(tx => tx.status === status);
};

export const selectTreasuryStats = (state) => {
  const treasury = state.financialManagement.treasury;
  const transactions = state.financialManagement.transactions;
  
  const totalInflow = transactions
    .filter(tx => tx.type === 'inflow' && tx.status === 'completed')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
    
  const totalOutflow = transactions
    .filter(tx => tx.type === 'outflow' && tx.status === 'completed')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
    
  const pendingTransactions = transactions.filter(tx => tx.status === 'pending').length;
  
  const allocationPercentage = treasury.balance > 0 
    ? (parseFloat(treasury.totalAllocated || '0') / parseFloat(treasury.balance)) * 100
    : 0;
  
  return {
    balance: treasury.balance,
    totalAllocated: treasury.totalAllocated,
    availableBalance: treasury.availableBalance,
    totalInflow: totalInflow.toString(),
    totalOutflow: totalOutflow.toString(),
    netFlow: (totalInflow - totalOutflow).toString(),
    pendingTransactions,
    allocationPercentage: allocationPercentage.toFixed(2),
    tokenDistribution: treasury.tokens || [],
  };
};

export const selectAllocationByCategory = (state) => {
  const allocation = state.financialManagement.treasury.allocation || [];
  
  const categoryTotals = allocation.reduce((acc, item) => {
    const category = item.category || 'uncategorized';
    acc[category] = (acc[category] || 0) + parseFloat(item.amount || '0');
    return acc;
  }, {});
  
  return Object.entries(categoryTotals).map(([category, amount]) => ({
    category,
    amount: amount.toString(),
    percentage: state.financialManagement.treasury.balance > 0
      ? ((amount / parseFloat(state.financialManagement.treasury.balance)) * 100).toFixed(2)
      : '0',
  }));
};

export const selectRecentTransactions = (limit = 10) => (state) => {
  return state.financialManagement.transactions
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
};

export const selectTransactionSummary = (period = 'monthly') => (state) => {
  const transactions = state.financialManagement.transactions;
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const periodTransactions = transactions.filter(tx => 
    new Date(tx.timestamp) >= startDate && tx.status === 'completed'
  );
  
  const summary = periodTransactions.reduce((acc, tx) => {
    const amount = parseFloat(tx.amount || '0');
    acc.total += amount;
    acc.count += 1;
    
    if (tx.type === 'inflow') {
      acc.inflow += amount;
    } else if (tx.type === 'outflow') {
      acc.outflow += amount;
    }
    
    acc.byType[tx.type] = (acc.byType[tx.type] || 0) + amount;
    
    return acc;
  }, {
    total: 0,
    count: 0,
    inflow: 0,
    outflow: 0,
    byType: {},
  });
  
  return {
    ...summary,
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    average: summary.count > 0 ? (summary.total / summary.count).toFixed(2) : '0',
  };
};

export default financialManagementSlice.reducer;