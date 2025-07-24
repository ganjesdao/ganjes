/**
 * Proposal Management Slice Tests
 * Testing proposal management state with TDD approach
 */

import proposalManagementSlice, {
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
} from './proposalManagementSlice';

describe('Proposal Management Slice', () => {
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

  test('should return the initial state', () => {
    expect(proposalManagementSlice(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('Proposal Fetching', () => {
    test('should handle fetch proposals start', () => {
      const actual = proposalManagementSlice(initialState, fetchProposalsStart());
      expect(actual.loading).toBe(true);
      expect(actual.error).toBe(null);
    });

    test('should handle fetch proposals success', () => {
      const proposalsData = {
        proposals: [
          {
            id: '1',
            title: 'Community Grant Program',
            description: 'Funding for community development',
            category: 'funding',
            status: 'active',
            votesFor: 150,
            votesAgainst: 25,
            totalVotes: 175,
            requiredQuorum: 100,
            endDate: '2025-08-01T00:00:00Z',
            createdAt: '2025-07-01T00:00:00Z',
            proposer: {
              id: 'user1',
              name: 'John Doe',
              walletAddress: '0x123...',
            },
          },
          {
            id: '2',
            title: 'Protocol Upgrade v2.0',
            description: 'Major protocol improvements',
            category: 'technical',
            status: 'pending',
            votesFor: 50,
            votesAgainst: 10,
            totalVotes: 60,
            requiredQuorum: 200,
            endDate: '2025-08-15T00:00:00Z',
            createdAt: '2025-07-10T00:00:00Z',
            proposer: {
              id: 'user2',
              name: 'Jane Smith',
              walletAddress: '0x456...',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      const actual = proposalManagementSlice(
        { ...initialState, loading: true },
        fetchProposalsSuccess(proposalsData)
      );

      expect(actual.loading).toBe(false);
      expect(actual.proposals).toEqual(proposalsData.proposals);
      expect(actual.pagination).toEqual(proposalsData.pagination);
      expect(actual.error).toBe(null);
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle fetch proposals failure', () => {
      const errorMessage = 'Failed to fetch proposals';
      const actual = proposalManagementSlice(
        { ...initialState, loading: true },
        fetchProposalsFailure(errorMessage)
      );

      expect(actual.loading).toBe(false);
      expect(actual.error).toBe(errorMessage);
      expect(actual.proposals).toEqual([]);
    });
  });

  describe('Current Proposal Management', () => {
    test('should handle setting current proposal', () => {
      const proposal = {
        id: '1',
        title: 'Test Proposal',
        description: 'Test description',
        status: 'active',
      };

      const actual = proposalManagementSlice(initialState, setCurrentProposal(proposal));

      expect(actual.currentProposal).toEqual(proposal);
    });

    test('should handle clearing current proposal', () => {
      const stateWithCurrentProposal = {
        ...initialState,
        currentProposal: { id: '1', title: 'Test' },
      };

      const actual = proposalManagementSlice(
        stateWithCurrentProposal,
        setCurrentProposal(null)
      );

      expect(actual.currentProposal).toBe(null);
    });
  });

  describe('Proposal Status Updates', () => {
    test('should handle updating proposal status', () => {
      const existingProposals = [
        {
          id: '1',
          title: 'Test Proposal',
          status: 'pending',
          votesFor: 50,
          votesAgainst: 10,
        },
        {
          id: '2',
          title: 'Another Proposal',
          status: 'active',
          votesFor: 100,
          votesAgainst: 20,
        },
      ];

      const stateWithProposals = {
        ...initialState,
        proposals: existingProposals,
      };

      const actual = proposalManagementSlice(
        stateWithProposals,
        updateProposalStatus({ proposalId: '1', status: 'approved' })
      );

      expect(actual.proposals[0].status).toBe('approved');
      expect(actual.proposals[1].status).toBe('active'); // Unchanged
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should not update status for non-existent proposal', () => {
      const existingProposals = [
        { id: '1', title: 'Test Proposal', status: 'pending' },
      ];

      const stateWithProposals = {
        ...initialState,
        proposals: existingProposals,
      };

      const actual = proposalManagementSlice(
        stateWithProposals,
        updateProposalStatus({ proposalId: '999', status: 'approved' })
      );

      expect(actual.proposals[0].status).toBe('pending'); // Unchanged
      expect(actual.lastUpdated).toBe(null); // No update occurred
    });
  });

  describe('Proposal CRUD Operations', () => {
    test('should handle adding a new proposal', () => {
      const newProposal = {
        id: '3',
        title: 'New Proposal',
        description: 'New proposal description',
        category: 'governance',
        status: 'pending',
        votesFor: 0,
        votesAgainst: 0,
        totalVotes: 0,
        createdAt: '2025-07-24T12:00:00Z',
      };

      const stateWithProposals = {
        ...initialState,
        proposals: [
          { id: '1', title: 'Existing Proposal 1' },
          { id: '2', title: 'Existing Proposal 2' },
        ],
      };

      const actual = proposalManagementSlice(stateWithProposals, addProposal(newProposal));

      expect(actual.proposals).toHaveLength(3);
      expect(actual.proposals[0]).toEqual(newProposal); // New proposal added at beginning
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle updating an existing proposal', () => {
      const existingProposals = [
        {
          id: '1',
          title: 'Original Title',
          description: 'Original description',
          category: 'funding',
        },
        {
          id: '2',
          title: 'Another Proposal',
          description: 'Another description',
          category: 'technical',
        },
      ];

      const proposalUpdate = {
        id: '1',
        title: 'Updated Title',
        description: 'Updated description',
      };

      const stateWithProposals = {
        ...initialState,
        proposals: existingProposals,
      };

      const actual = proposalManagementSlice(stateWithProposals, updateProposal(proposalUpdate));

      expect(actual.proposals[0].title).toBe('Updated Title');
      expect(actual.proposals[0].description).toBe('Updated description');
      expect(actual.proposals[0].category).toBe('funding'); // Unchanged field preserved
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should handle deleting a proposal', () => {
      const existingProposals = [
        { id: '1', title: 'Proposal 1' },
        { id: '2', title: 'Proposal 2' },
        { id: '3', title: 'Proposal 3' },
      ];

      const stateWithProposals = {
        ...initialState,
        proposals: existingProposals,
      };

      const actual = proposalManagementSlice(stateWithProposals, deleteProposal('2'));

      expect(actual.proposals).toHaveLength(2);
      expect(actual.proposals.find(p => p.id === '2')).toBeUndefined();
      expect(actual.lastUpdated).toBeDefined();
    });

    test('should clear current proposal when deleting it', () => {
      const existingProposals = [
        { id: '1', title: 'Proposal 1' },
        { id: '2', title: 'Proposal 2' },
      ];

      const stateWithCurrentProposal = {
        ...initialState,
        proposals: existingProposals,
        currentProposal: { id: '2', title: 'Proposal 2' },
      };

      const actual = proposalManagementSlice(stateWithCurrentProposal, deleteProposal('2'));

      expect(actual.proposals).toHaveLength(1);
      expect(actual.currentProposal).toBe(null);
    });
  });

  describe('Filters and Pagination', () => {
    test('should handle setting filters', () => {
      const filters = {
        status: 'active',
        category: 'funding',
        search: 'community',
      };

      const actual = proposalManagementSlice(initialState, setFilters(filters));

      expect(actual.filters.status).toBe('active');
      expect(actual.filters.category).toBe('funding');
      expect(actual.filters.search).toBe('community');
    });

    test('should handle partial filter updates', () => {
      const stateWithFilters = {
        ...initialState,
        filters: {
          status: 'all',
          category: 'technical',
          search: 'test',
          dateRange: null,
        },
      };

      const actual = proposalManagementSlice(
        stateWithFilters,
        setFilters({ status: 'pending' })
      );

      expect(actual.filters.status).toBe('pending');
      expect(actual.filters.category).toBe('technical'); // Preserved
      expect(actual.filters.search).toBe('test'); // Preserved
    });

    test('should handle setting pagination', () => {
      const pagination = {
        page: 3,
        limit: 50,
        total: 150,
        totalPages: 3,
      };

      const actual = proposalManagementSlice(initialState, setPagination(pagination));

      expect(actual.pagination).toEqual(pagination);
    });
  });

  describe('Error Handling and Reset', () => {
    test('should handle clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const actual = proposalManagementSlice(errorState, clearError());

      expect(actual.error).toBe(null);
    });

    test('should handle reset proposal management', () => {
      const modifiedState = {
        ...initialState,
        proposals: [{ id: '1', title: 'Test' }],
        currentProposal: { id: '1', title: 'Test' },
        loading: true,
        error: 'Some error',
      };

      const actual = proposalManagementSlice(modifiedState, resetProposalManagement());

      expect(actual).toEqual(initialState);
    });
  });

  describe('State Immutability', () => {
    test('should maintain state immutability', () => {
      const state = { ...initialState };
      const newState = proposalManagementSlice(state, fetchProposalsStart());
      
      expect(state).not.toBe(newState);
      expect(state.loading).toBe(false);
      expect(newState.loading).toBe(true);
    });

    test('should not mutate proposals array', () => {
      const proposals = [{ id: '1', title: 'Proposal1' }];
      const state = { ...initialState, proposals };
      
      const newProposal = { id: '2', title: 'Proposal2' };
      const newState = proposalManagementSlice(state, addProposal(newProposal));

      expect(state.proposals).toHaveLength(1);
      expect(newState.proposals).toHaveLength(2);
      expect(state.proposals).not.toBe(newState.proposals);
    });
  });

  describe('Edge Cases', () => {
    test('should handle updating non-existent proposal gracefully', () => {
      const stateWithProposals = {
        ...initialState,
        proposals: [{ id: '1', title: 'Proposal1' }],
      };

      const actual = proposalManagementSlice(
        stateWithProposals,
        updateProposal({ id: '999', title: 'Non-existent' })
      );

      expect(actual.proposals).toHaveLength(1);
      expect(actual.proposals[0].title).toBe('Proposal1'); // Unchanged
    });

    test('should handle deleting non-existent proposal gracefully', () => {
      const stateWithProposals = {
        ...initialState,
        proposals: [{ id: '1', title: 'Proposal1' }],
      };

      const actual = proposalManagementSlice(stateWithProposals, deleteProposal('999'));

      expect(actual.proposals).toHaveLength(1);
      expect(actual.proposals[0].title).toBe('Proposal1'); // Unchanged
    });

    test('should handle empty search filter', () => {
      const actual = proposalManagementSlice(
        initialState,
        setFilters({ search: '' })
      );

      expect(actual.filters.search).toBe('');
    });

    test('should handle proposal vote updates', () => {
      const existingProposals = [
        {
          id: '1',
          title: 'Test Proposal',
          votesFor: 100,
          votesAgainst: 20,
          totalVotes: 120,
        },
      ];

      const voteUpdate = {
        id: '1',
        votesFor: 150,
        votesAgainst: 25,
        totalVotes: 175,
      };

      const stateWithProposals = {
        ...initialState,
        proposals: existingProposals,
      };

      const actual = proposalManagementSlice(stateWithProposals, updateProposal(voteUpdate));

      expect(actual.proposals[0].votesFor).toBe(150);
      expect(actual.proposals[0].votesAgainst).toBe(25);
      expect(actual.proposals[0].totalVotes).toBe(175);
    });
  });
});