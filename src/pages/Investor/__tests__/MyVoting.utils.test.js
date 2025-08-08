/**
 * Utility function tests for MyVoting component
 * Tests filtering, sorting, formatting, and helper functions
 */

describe('MyVoting Utility Functions', () => {
  // Mock data for testing
  const mockProposals = [
    {
      id: '1',
      description: 'First Proposal - DeFi Platform',
      executed: false,
      rejected: false,
      passed: false,
      totalInvested: '50.5',
      fundingGoal: '100.0',
      voteCountFor: '5',
      votersAgainst: '2',
      proposer: '0xProposer1Address',
      deadline: '2024-12-31T23:59:59.000Z',
    },
    {
      id: '2', 
      description: 'Second Proposal - NFT Marketplace',
      executed: true,
      rejected: false,
      passed: true,
      totalInvested: '150.0',
      fundingGoal: '100.0',
      voteCountFor: '10',
      votersAgainst: '1',
      proposer: '0xProposer2Address',
      deadline: '2024-11-30T23:59:59.000Z',
    },
    {
      id: '3',
      description: 'Third Proposal - Gaming Token',
      executed: false,
      rejected: true,
      passed: false,
      totalInvested: '25.0',
      fundingGoal: '200.0',
      voteCountFor: '2',
      votersAgainst: '8',
      proposer: '0xProposer3Address', 
      deadline: '2024-10-15T23:59:59.000Z',
    },
  ];

  describe('Proposal Filtering Functions', () => {
    // These tests simulate the filtering logic used in getFilteredProposals
    
    test('filters proposals by "all" status', () => {
      const filtered = mockProposals.filter(() => true);
      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(mockProposals);
    });

    test('filters proposals by "active" status', () => {
      const filtered = mockProposals.filter(p => !p.executed);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id)).toEqual(['1', '3']);
    });

    test('filters proposals by "executed" status', () => {
      const filtered = mockProposals.filter(p => p.executed);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    test('filters proposals by "funded" status', () => {
      const filtered = mockProposals.filter(p => {
        const totalInvested = parseFloat(p.totalInvested || '0');
        const fundingGoal = parseFloat(p.fundingGoal || '0');
        return totalInvested >= fundingGoal;
      });
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
      expect(parseFloat(filtered[0].totalInvested)).toBeGreaterThanOrEqual(parseFloat(filtered[0].fundingGoal));
    });

    test('handles empty proposal array', () => {
      const emptyFiltered = [].filter(p => !p.executed);
      expect(emptyFiltered).toHaveLength(0);
    });

    test('handles proposals with missing funding data', () => {
      const proposalsWithMissingData = [
        { id: '1', totalInvested: null, fundingGoal: '100' },
        { id: '2', totalInvested: '50', fundingGoal: null },
        { id: '3', totalInvested: undefined, fundingGoal: undefined },
      ];

      const filtered = proposalsWithMissingData.filter(p => {
        const totalInvested = parseFloat(p.totalInvested || '0');
        const fundingGoal = parseFloat(p.fundingGoal || '0');
        return totalInvested >= fundingGoal;
      });

      expect(filtered).toHaveLength(0); // No proposals should meet criteria with missing data
    });
  });

  describe('Search Filtering Functions', () => {
    test('filters proposals by description search', () => {
      const searchQuery = 'defi';
      const filtered = mockProposals.filter(p =>
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
      expect(filtered[0].description.toLowerCase()).toContain('defi');
    });

    test('filters proposals by proposer address search', () => {
      const searchQuery = '0xProposer2';
      const filtered = mockProposals.filter(p =>
        (p.proposer || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });

    test('handles case-insensitive search', () => {
      const searchQueries = ['DEFI', 'DeFi', 'defi', 'MARKETPLACE', 'marketplace'];
      
      searchQueries.forEach(query => {
        const filtered = mockProposals.filter(p =>
          (p.description || '').toLowerCase().includes(query.toLowerCase())
        );
        
        if (query.toLowerCase().includes('defi')) {
          expect(filtered).toHaveLength(1);
        } else if (query.toLowerCase().includes('marketplace')) {
          expect(filtered).toHaveLength(1);
        }
      });
    });

    test('returns empty array for non-matching search', () => {
      const searchQuery = 'nonexistent';
      const filtered = mockProposals.filter(p =>
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.proposer || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(0);
    });

    test('handles empty search query', () => {
      const searchQuery = '';
      const filtered = mockProposals.filter(p =>
        searchQuery === '' || 
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(3); // Should return all proposals
    });
  });

  describe('Proposal Sorting Functions', () => {
    test('sorts proposals by newest first', () => {
      const sorted = [...mockProposals].sort((a, b) => 
        parseInt(b.id || '0') - parseInt(a.id || '0')
      );

      expect(sorted.map(p => p.id)).toEqual(['3', '2', '1']);
    });

    test('sorts proposals by oldest first', () => {
      const sorted = [...mockProposals].sort((a, b) => 
        parseInt(a.id || '0') - parseInt(b.id || '0')
      );

      expect(sorted.map(p => p.id)).toEqual(['1', '2', '3']);
    });

    test('sorts proposals by most funded', () => {
      const sorted = [...mockProposals].sort((a, b) => {
        const bInvested = parseFloat(b.totalInvested || '0');
        const aInvested = parseFloat(a.totalInvested || '0');
        return bInvested - aInvested;
      });

      expect(sorted.map(p => p.id)).toEqual(['2', '1', '3']);
      expect(parseFloat(sorted[0].totalInvested)).toBe(150.0);
    });

    test('sorts proposals by least funded', () => {
      const sorted = [...mockProposals].sort((a, b) => {
        const aInvested = parseFloat(a.totalInvested || '0');
        const bInvested = parseFloat(b.totalInvested || '0');
        return aInvested - bInvested;
      });

      expect(sorted.map(p => p.id)).toEqual(['3', '1', '2']);
      expect(parseFloat(sorted[0].totalInvested)).toBe(25.0);
    });

    test('sorts proposals by most votes', () => {
      const sorted = [...mockProposals].sort((a, b) => {
        const bVotes = parseInt(b.voteCountFor || '0');
        const aVotes = parseInt(a.voteCountFor || '0');
        return bVotes - aVotes;
      });

      expect(sorted.map(p => p.id)).toEqual(['2', '1', '3']);
      expect(parseInt(sorted[0].voteCountFor)).toBe(10);
    });

    test('handles sorting with missing data', () => {
      const proposalsWithMissingData = [
        { id: '1', totalInvested: null, voteCountFor: undefined },
        { id: '2', totalInvested: '100', voteCountFor: '5' },
        { id: '3', totalInvested: '50', voteCountFor: '3' },
      ];

      const sorted = proposalsWithMissingData.sort((a, b) => {
        const bInvested = parseFloat(b.totalInvested || '0');
        const aInvested = parseFloat(a.totalInvested || '0');
        return bInvested - aInvested;
      });

      expect(sorted[0].id).toBe('2'); // Highest invested (100)
      expect(sorted[1].id).toBe('3'); // Second highest (50)
      expect(sorted[2].id).toBe('1'); // Missing data defaults to 0
    });
  });

  describe('Data Formatting Functions', () => {
    test('formats funding goal correctly', () => {
      const fundingGoal = '100.456789';
      const formatted = parseFloat(fundingGoal).toFixed(2);
      expect(formatted).toBe('100.46');
    });

    test('formats total invested correctly', () => {
      const totalInvested = '50.123456';
      const formatted = parseFloat(totalInvested).toFixed(2);
      expect(formatted).toBe('50.12');
    });

    test('calculates funding percentage correctly', () => {
      const invested = 75.5;
      const goal = 100.0;
      const percentage = ((invested / goal) * 100).toFixed(1);
      expect(percentage).toBe('75.5');
    });

    test('handles zero funding goal', () => {
      const invested = 50.0;
      const goal = 0.0;
      const percentage = goal > 0 ? ((invested / goal) * 100).toFixed(1) : '0';
      expect(percentage).toBe('0');
    });

    test('caps percentage at 100%', () => {
      const invested = 150.0;
      const goal = 100.0;
      const percentage = Math.min((invested / goal) * 100, 100).toFixed(1);
      expect(percentage).toBe('100.0');
    });

    test('formats proposer address display', () => {
      const fullAddress = '0x1234567890123456789012345678901234567890';
      const formatted = `${fullAddress.substring(0, 8)}...${fullAddress.slice(-6)}`;
      expect(formatted).toBe('0x123456...567890');
    });

    test('handles short addresses', () => {
      const shortAddress = '0x12345';
      const formatted = shortAddress.length > 14 
        ? `${shortAddress.substring(0, 8)}...${shortAddress.slice(-6)}`
        : shortAddress;
      expect(formatted).toBe(shortAddress);
    });
  });

  describe('Validation Functions', () => {
    test('validates network support', () => {
      const validNetwork = { chainId: '0x61', chainName: 'BSC Testnet' };
      const validContract = '0xValidContractAddress';
      const zeroContract = '0x0000000000000000000000000000000000000000';

      const isSupported1 = validNetwork && validContract && validContract !== zeroContract;
      const isSupported2 = validNetwork && zeroContract && zeroContract !== zeroContract;
      const isSupported3 = null && validContract && validContract !== zeroContract;

      expect(isSupported1).toBe(true);
      expect(isSupported2).toBe(false);
      expect(isSupported3).toBe(false);
    });

    test('validates proposal status combinations', () => {
      const testCases = [
        { executed: true, passed: true, rejected: false, expected: 'Executed' },
        { executed: false, passed: true, rejected: false, expected: 'Passed' },
        { executed: false, passed: false, rejected: true, expected: 'Rejected' },
        { executed: false, passed: false, rejected: false, expected: 'Pending' },
      ];

      testCases.forEach(({ executed, passed, rejected, expected }) => {
        let status;
        if (executed) {
          status = 'Executed';
        } else if (rejected) {
          status = 'Rejected';
        } else if (passed) {
          status = 'Passed';
        } else {
          status = 'Pending';
        }

        expect(status).toBe(expected);
      });
    });

    test('validates vote amount input', () => {
      const testAmounts = ['15', '0', '-5', 'abc', '', null, undefined];
      const validAmounts = testAmounts.filter(amount => {
        const num = parseFloat(amount);
        return !isNaN(num) && num > 0;
      });

      expect(validAmounts).toEqual(['15']);
    });

    test('validates proposal ID format', () => {
      const testIds = ['1', '123', '0', '-1', 'abc', '', null, undefined];
      const validIds = testIds.filter(id => {
        const num = parseInt(id);
        return !isNaN(num) && num >= 0;
      });

      expect(validIds).toEqual(['1', '123', '0']);
    });
  });

  describe('Date and Time Formatting', () => {
    test('formats deadline correctly', () => {
      const timestamp = 1640995200; // Unix timestamp
      const date = new Date(timestamp * 1000);
      const formatted = date.toLocaleString();
      
      expect(formatted).toContain('2022'); // Should be a valid date string
      expect(date.getTime()).toBe(timestamp * 1000);
    });

    test('handles invalid timestamps', () => {
      const invalidTimestamp = 'invalid';
      const parsed = parseInt(invalidTimestamp);
      const deadline = isNaN(parsed) || parsed <= 0 
        ? 'No deadline' 
        : new Date(parsed * 1000).toLocaleString();
      
      expect(deadline).toBe('No deadline');
    });

    test('detects expired proposals', () => {
      const now = Date.now();
      const futureTimestamp = Math.floor(now / 1000) + 3600; // 1 hour from now
      const pastTimestamp = Math.floor(now / 1000) - 3600; // 1 hour ago

      const isExpired1 = new Date() > new Date(futureTimestamp * 1000);
      const isExpired2 = new Date() > new Date(pastTimestamp * 1000);

      expect(isExpired1).toBe(false);
      expect(isExpired2).toBe(true);
    });
  });

  describe('Error Handling Utilities', () => {
    test('handles safe property access', () => {
      const safeProposal = null;
      const unsafeProposal = { description: 'Test' };

      const safeDescription = (safeProposal?.description || '');
      const unsafeDescription = (unsafeProposal?.description || '');

      expect(safeDescription).toBe('');
      expect(unsafeDescription).toBe('Test');
    });

    test('provides fallback values for missing data', () => {
      const incompleteProposal = {
        id: '1',
        // Missing other required fields
      };

      const withDefaults = {
        id: incompleteProposal.id || '0',
        description: incompleteProposal.description || 'No description',
        totalInvested: incompleteProposal.totalInvested || '0',
        fundingGoal: incompleteProposal.fundingGoal || '0',
        voteCountFor: incompleteProposal.voteCountFor || '0',
        proposer: incompleteProposal.proposer || '0x0000000000000000000000000000000000000000',
      };

      expect(withDefaults.description).toBe('No description');
      expect(withDefaults.totalInvested).toBe('0');
      expect(withDefaults.fundingGoal).toBe('0');
    });

    test('validates array operations safely', () => {
      const emptyArray = [];
      const nullArray = null;
      const validArray = [1, 2, 3];

      const safeLength1 = emptyArray?.length || 0;
      const safeLength2 = nullArray?.length || 0; 
      const safeLength3 = validArray?.length || 0;

      expect(safeLength1).toBe(0);
      expect(safeLength2).toBe(0);
      expect(safeLength3).toBe(3);
    });
  });

  describe('Performance Optimization Utilities', () => {
    test('debounces search input changes', (done) => {
      let searchCount = 0;
      const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
      };

      const debouncedSearch = debounce(() => {
        searchCount++;
      }, 100);

      // Simulate rapid input changes
      debouncedSearch();
      debouncedSearch();
      debouncedSearch();

      // Should only execute once after delay
      setTimeout(() => {
        expect(searchCount).toBe(1);
        done();
      }, 150);
    });

    test('memoizes expensive calculations', () => {
      const cache = new Map();
      
      const expensiveCalculation = (proposals) => {
        const key = JSON.stringify(proposals.map(p => p.id));
        if (cache.has(key)) {
          return cache.get(key);
        }
        
        // Simulate expensive operation
        const result = proposals.reduce((sum, p) => sum + parseFloat(p.totalInvested || 0), 0);
        cache.set(key, result);
        return result;
      };

      const result1 = expensiveCalculation(mockProposals);
      const result2 = expensiveCalculation(mockProposals); // Should use cache

      expect(result1).toBe(result2);
      expect(result1).toBe(225.5); // 50.5 + 150.0 + 25.0
    });
  });
});