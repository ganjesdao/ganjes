/**
 * Financial Management Slice Tests
 * Testing financial management state with TDD approach
 */

import financialManagementSlice, {
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
  clearError,
  resetFinancialManagement,
} from './financialManagementSlice';

describe('Financial Management Slice', () => {
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

  test('should return the initial state', () => {
    expect(financialManagementSlice(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('Treasury Management', () => {
    test('should handle fetch treasury start', () => {
      const actual = financialManagementSlice(initialState, fetchTreasuryStart());
      expect(actual.loading).toBe(true);
      expect(actual.error).toBe(null);
    });

    test('should handle fetch treasury success', () => {
      const treasuryData = {
        treasury: {
          balance: '1000000',
          allocation: [
            {
              id: '1',
              name: 'Development Fund',
              amount: '400000',
              percentage: 40,
              category: 'development',
            },
            {
              id: '2',
              name: 'Marketing Fund',
              amount: '200000',
              percentage: 20,
              category: 'marketing',
            },
            {
              id: '3',
              name: 'Operations Fund',
              amount: '150000',
              percentage: 15,
              category: 'operations',
            },
          ],
          totalAllocated: '750000',
          availableBalance: '250000',
          tokens: [
            {
              symbol: 'ETH',
              balance: '500',
              value: '800000',
              percentage: 80,
            },
            {
              symbol: 'USDC',
              balance: '200000',
              value: '200000',
              percentage: 20,
            },
          ],
        },
        transactions: [
          {
            id: '1',
            type: 'proposal_funding',
            amount: '50000',
            token: 'USDC',
            status: 'completed',
            timestamp: '2025-07-24T10:00:00Z',
            description: 'Community Grant Program Funding',
            proposalId: 'prop-1',
          },
        ],
      };

      const actual = financialManagementSlice(
        { ...initialState, loading: true },
        fetchTreasurySuccess(treasuryData)
      );

      expect(actual.loading).toBe(false);
      expect(actual.treasury).toEqual(treasuryData.treasury);
      expect(actual.transactions).toEqual(treasuryData.transactions);
      expect(actual.error).toBe(null);
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle fetch treasury failure', () => {
      const errorMessage = 'Failed to fetch treasury data';
      const actual = financialManagementSlice(
        { ...initialState, loading: true },
        fetchTreasuryFailure(errorMessage)
      );

      expect(actual.loading).toBe(false);
      expect(actual.error).toBe(errorMessage);
    });

    test('should handle updating treasury balance', () => {
      const balanceUpdate = {
        balance: '1200000',
        availableBalance: '300000',
      };

      const actual = financialManagementSlice(
        initialState,
        updateTreasuryBalance(balanceUpdate)
      );

      expect(actual.treasury.balance).toBe('1200000');
      expect(actual.treasury.availableBalance).toBe('300000');
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle setting treasury allocation', () => {
      const allocation = [
        {
          id: '1',
          name: 'Development Fund',
          amount: '500000',
          percentage: 50,
          category: 'development',
        },
        {
          id: '2',
          name: 'Community Fund',
          amount: '300000',
          percentage: 30,
          category: 'community',
        },
      ];

      const actual = financialManagementSlice(
        initialState,
        setTreasuryAllocation(allocation)
      );

      expect(actual.treasury.allocation).toEqual(allocation);
      expect(actual.lastUpdated).toBeDefined();
    });
  });

  describe('Transaction Management', () => {
    test('should handle adding a new transaction', () => {
      const newTransaction = {
        id: '2',
        type: 'reward_distribution',
        amount: '25000',
        token: 'ETH',
        status: 'pending',
        timestamp: '2025-07-24T12:00:00Z',
        description: 'Monthly contributor rewards',
        recipients: ['0x123...', '0x456...'],
      };

      const stateWithTransactions = {
        ...initialState,
        transactions: [
          {
            id: '1',
            type: 'proposal_funding',
            amount: '50000',
            status: 'completed',
          },
        ],
      };

      const actual = financialManagementSlice(
        stateWithTransactions,
        addTransaction(newTransaction)
      );

      expect(actual.transactions).toHaveLength(2);
      expect(actual.transactions[0]).toEqual(newTransaction); // New transaction at beginning
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle updating an existing transaction', () => {
      const existingTransactions = [
        {
          id: '1',
          type: 'proposal_funding',
          amount: '50000',
          status: 'pending',
          description: 'Original description',
        },
        {
          id: '2',
          type: 'reward_distribution',
          amount: '25000',
          status: 'completed',
        },
      ];

      const transactionUpdate = {
        id: '1',
        status: 'completed',
        description: 'Updated description',
        txHash: '0xabc123...',
      };

      const stateWithTransactions = {
        ...initialState,
        transactions: existingTransactions,
      };

      const actual = financialManagementSlice(
        stateWithTransactions,
        updateTransaction(transactionUpdate)
      );

      expect(actual.transactions[0].status).toBe('completed');
      expect(actual.transactions[0].description).toBe('Updated description');
      expect(actual.transactions[0].txHash).toBe('0xabc123...');
      expect(actual.transactions[0].amount).toBe('50000'); // Unchanged field preserved
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should not update non-existent transaction', () => {
      const existingTransactions = [
        { id: '1', type: 'proposal_funding', status: 'pending' },
      ];

      const stateWithTransactions = {
        ...initialState,
        transactions: existingTransactions,
      };

      const actual = financialManagementSlice(
        stateWithTransactions,
        updateTransaction({ id: '999', status: 'completed' })
      );

      expect(actual.transactions[0].status).toBe('pending'); // Unchanged
      expect(actual.lastUpdated).toBe(null); // No update occurred
    });

    test('should handle setting transaction filters', () => {
      const filters = {
        type: 'proposal_funding',
        status: 'completed',
        amountRange: { min: '1000', max: '100000' },
      };

      const actual = financialManagementSlice(
        initialState,
        setTransactionFilters(filters)
      );

      expect(actual.transactionFilters.type).toBe('proposal_funding');
      expect(actual.transactionFilters.status).toBe('completed');
      expect(actual.transactionFilters.amountRange).toEqual(filters.amountRange);
    });
  });

  describe('Report Management', () => {
    test('should handle generating a report', () => {
      const reportConfig = {
        type: 'treasury_overview',
        period: 'quarterly',
        dateRange: {
          start: '2025-04-01',
          end: '2025-06-30',
        },
      };

      const actual = financialManagementSlice(initialState, generateReport(reportConfig));

      expect(actual.loading).toBe(true);
      expect(actual.error).toBe(null);
    });

    test('should handle adding a generated report', () => {
      const newReport = {
        id: '1',
        type: 'treasury_overview',
        period: 'quarterly',
        title: 'Q2 2025 Treasury Report',
        data: {
          totalRevenue: '500000',
          totalExpenses: '300000',
          netIncome: '200000',
          allocation: [
            { category: 'development', amount: '150000' },
            { category: 'marketing', amount: '100000' },
            { category: 'operations', amount: '50000' },
          ],
        },
        generatedAt: '2025-07-24T14:00:00Z',
        status: 'ready',
      };

      const actual = financialManagementSlice(initialState, addReport(newReport));

      expect(actual.reports).toHaveLength(1);
      expect(actual.reports[0]).toEqual(newReport);
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle removing a report', () => {
      const existingReports = [
        { id: '1', title: 'Q1 Report', status: 'ready' },
        { id: '2', title: 'Q2 Report', status: 'ready' },
        { id: '3', title: 'Q3 Report', status: 'generating' },
      ];

      const stateWithReports = {
        ...initialState,
        reports: existingReports,
      };

      const actual = financialManagementSlice(stateWithReports, removeReport('2'));

      expect(actual.reports).toHaveLength(2);
      expect(actual.reports.find(r => r.id === '2')).toBeUndefined();
      expect(actual.lastUpdated).toBeDefined();
    });
  });

  describe('Error Handling and Reset', () => {
    test('should handle clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const actual = financialManagementSlice(errorState, clearError());

      expect(actual.error).toBe(null);
    });

    test('should handle reset financial management', () => {
      const modifiedState = {
        ...initialState,
        treasury: { balance: '1000000', allocation: [] },
        transactions: [{ id: '1', amount: '50000' }],
        reports: [{ id: '1', title: 'Test Report' }],
        loading: true,
        error: 'Some error',
      };

      const actual = financialManagementSlice(modifiedState, resetFinancialManagement());

      expect(actual).toEqual(initialState);
    });
  });

  describe('State Immutability', () => {
    test('should maintain state immutability', () => {
      const state = { ...initialState };
      const newState = financialManagementSlice(state, fetchTreasuryStart());
      
      expect(state).not.toBe(newState);
      expect(state.loading).toBe(false);
      expect(newState.loading).toBe(true);
    });

    test('should not mutate transactions array', () => {
      const transactions = [{ id: '1', amount: '50000' }];
      const state = { ...initialState, transactions };
      
      const newTransaction = { id: '2', amount: '25000' };
      const newState = financialManagementSlice(state, addTransaction(newTransaction));

      expect(state.transactions).toHaveLength(1);
      expect(newState.transactions).toHaveLength(2);
      expect(state.transactions).not.toBe(newState.transactions);
    });

    test('should not mutate treasury object', () => {
      const treasury = { balance: '1000000', allocation: [] };
      const state = { ...initialState, treasury };
      
      const balanceUpdate = { balance: '1200000' };
      const newState = financialManagementSlice(state, updateTreasuryBalance(balanceUpdate));

      expect(state.treasury.balance).toBe('1000000');
      expect(newState.treasury.balance).toBe('1200000');
      expect(state.treasury).not.toBe(newState.treasury);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty treasury allocation', () => {
      const actual = financialManagementSlice(
        initialState,
        setTreasuryAllocation([])
      );

      expect(actual.treasury.allocation).toEqual([]);
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle large transaction amounts', () => {
      const largeTransaction = {
        id: '1',
        type: 'major_funding',
        amount: '10000000000000000000', // 10 ETH in wei
        token: 'ETH',
        status: 'pending',
      };

      const actual = financialManagementSlice(initialState, addTransaction(largeTransaction));

      expect(actual.transactions[0].amount).toBe('10000000000000000000');
    });

    test('should handle complex filter combinations', () => {
      const complexFilters = {
        type: 'proposal_funding',
        status: 'completed',
        dateRange: {
          start: '2025-01-01',
          end: '2025-12-31',
        },
        amountRange: {
          min: '1000',
          max: '1000000',
        },
      };

      const actual = financialManagementSlice(
        initialState,
        setTransactionFilters(complexFilters)
      );

      expect(actual.transactionFilters).toEqual({
        ...initialState.transactionFilters,
        ...complexFilters,
      });
    });

    test('should handle treasury balance with decimal precision', () => {
      const preciseBalance = {
        balance: '1234567.89012345',
        availableBalance: '123456.78901234',
      };

      const actual = financialManagementSlice(
        initialState,
        updateTreasuryBalance(preciseBalance)
      );

      expect(actual.treasury.balance).toBe('1234567.89012345');
      expect(actual.treasury.availableBalance).toBe('123456.78901234');
    });
  });
});