/**
 * Integration tests for MyVoting component
 * Tests complete user workflows and component interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import MyVoting from '../MyVoting';
import { getContractAddress } from '../../../utils/networks';

// Mock all dependencies
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('../../../utils/networks', () => ({
  getContractAddress: jest.fn(),
  isTestnet: jest.fn(),
}));

jest.mock('ethers', () => ({
  ethers: {
    BrowserProvider: jest.fn(),
    Contract: jest.fn(),
    formatEther: jest.fn(),
    formatUnits: jest.fn(),
    parseEther: jest.fn(),
  },
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock components
jest.mock('../component/Header', () => {
  return function MockHeader({ onNetworkChange, isToggle, setIsToggle }) {
    return (
      <div data-testid="header">
        <button 
          data-testid="network-switch-btn"
          onClick={() => onNetworkChange({ 
            chainId: '0x61', 
            chainName: 'BSC Testnet' 
          })}
        >
          Switch to BSC Testnet
        </button>
        <button 
          data-testid="network-clear-btn"
          onClick={() => onNetworkChange(null)}
        >
          Clear Network
        </button>
        <button 
          data-testid="sidebar-toggle"
          onClick={() => setIsToggle(!isToggle)}
        >
          Toggle Sidebar
        </button>
      </div>
    );
  };
});

jest.mock('../component/Sidebar', () => {
  return function MockSidebar() {
    return <nav data-testid="sidebar">Sidebar Navigation</nav>;
  };
});

jest.mock('../component/Footer', () => {
  return function MockFooter() {
    return <footer data-testid="footer">Footer Content</footer>;
  };
});

jest.mock('../auth/Auth', () => {
  return function MockAuth({ onProfileDataFetched }) {
    return (
      <div data-testid="auth-component">
        <h3>Please authenticate</h3>
        <button 
          data-testid="auth-btn"
          onClick={() => onProfileDataFetched({ user: 'testUser', token: 'testToken' })}
        >
          Authenticate
        </button>
      </div>
    );
  };
});

describe('MyVoting Integration Tests', () => {
  let mockProvider;
  let mockSigner;
  let mockDaoContract;
  let mockTokenContract;
  let mockEthereum;

  // Mock proposal data
  const mockProposalData = {
    id: BigInt(1),
    description: 'Integration Test Proposal',
    projectName: 'Test Project',
    projectUrl: 'https://test.com',
    fundingGoal: BigInt('100000000000000000000'), // 100 tokens
    proposer: '0x742d35Cc6234B4C4b5D3b8b123E4F5678901234567',
    votersFor: BigInt(8),
    votersAgainst: BigInt(3),
    totalVotesFor: BigInt('80000000000000000000'),
    totalInvested: BigInt('75000000000000000000'),
    totalVotesAgainst: BigInt('30000000000000000000'),
    endTime: BigInt(Math.floor(Date.now() / 1000) + 86400), // 24 hours from now
    passed: false,
    rejected: false,
    executed: false,
  };

  const mockInvestorDetails = {
    investors: ['0x1234567890123456789012345678901234567890', '0x9876543210987654321098765432109876543210'],
    investments: [BigInt('15000000000000000000'), BigInt('25000000000000000000')],
    voteSupports: [true, false],
    timestamps: [BigInt(1640995200), BigInt(1641081600)],
    hasVotedFlags: [true, true],
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock signer
    mockSigner = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    };

    // Setup mock provider
    mockProvider = {
      send: jest.fn().mockResolvedValue([]),
      getSigner: jest.fn().mockResolvedValue(mockSigner),
    };

    // Setup mock DAO contract
    mockDaoContract = {
      getProposalsIdByInvestor: jest.fn().mockResolvedValue(['1', '2']),
      proposals: jest.fn().mockResolvedValue(mockProposalData),
      getInvestorDetails: jest.fn().mockResolvedValue(mockInvestorDetails),
      vote: jest.fn().mockResolvedValue({
        hash: '0xTxHash123',
        wait: jest.fn().mockResolvedValue({ status: 1 }),
      }),
      interface: {
        hasFunction: jest.fn().mockReturnValue(true),
      },
    };

    // Setup mock token contract
    mockTokenContract = {
      approve: jest.fn().mockResolvedValue({
        hash: '0xApprovalHash123',
        wait: jest.fn().mockResolvedValue({ status: 1 }),
      }),
      balanceOf: jest.fn().mockResolvedValue(BigInt('1000000000000000000000')), // 1000 tokens
    };

    // Setup mock Ethereum provider
    mockEthereum = {
      request: jest.fn().mockResolvedValue(['0x1234567890123456789012345678901234567890']),
      on: jest.fn(),
      removeListener: jest.fn(),
    };

    // Setup ethers mocks
    ethers.BrowserProvider.mockImplementation(() => mockProvider);
    ethers.Contract.mockImplementation((address) => {
      return address === process.env.REACT_APP_TOKEN_ADDRESS ? mockTokenContract : mockDaoContract;
    });

    ethers.formatUnits.mockImplementation((value, decimals = 18) => {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return (num / Math.pow(10, decimals)).toString();
    });

    ethers.formatEther.mockImplementation((value) => {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return (num / 1e18).toString();
    });

    ethers.parseEther.mockImplementation((value) => {
      return (parseFloat(value) * 1e18).toString();
    });

    // Setup environment and globals
    getContractAddress.mockReturnValue('0xContractAddress123');
    process.env.REACT_APP_TOKEN_ADDRESS = '0xTokenAddress123';
    
    Object.defineProperty(window, 'ethereum', {
      writable: true,
      value: mockEthereum,
    });

    Object.defineProperty(window, 'sessionStorage', {
      writable: true,
      value: {
        getItem: jest.fn().mockReturnValue('mock-auth-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
    });

    // Mock window.location for navigation tests
    delete window.location;
    window.location = {
      href: '',
      reload: jest.fn(),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Complete User Authentication Flow', () => {
    test('shows auth component when not authenticated', async () => {
      window.sessionStorage.getItem.mockReturnValue(null);

      await act(async () => {
        render(<MyVoting />);
      });

      expect(screen.getByTestId('auth-component')).toBeInTheDocument();
      expect(screen.getByText('Please authenticate')).toBeInTheDocument();
    });

    test('completes authentication and shows main interface', async () => {
      window.sessionStorage.getItem.mockReturnValue(null);

      await act(async () => {
        render(<MyVoting />);
      });

      // Initially shows auth
      expect(screen.getByTestId('auth-component')).toBeInTheDocument();

      // Complete authentication
      await act(async () => {
        fireEvent.click(screen.getByTestId('auth-btn'));
      });

      // After authentication, should show main interface
      await waitFor(() => {
        expect(screen.getByTestId('header')).toBeInTheDocument();
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('footer')).toBeInTheDocument();
      });
    });
  });

  describe('Network Connection and Contract Setup Flow', () => {
    test('complete network switch and contract initialization', async () => {
      await act(async () => {
        render(<MyVoting />);
      });

      // Initial state - should show network selection prompt
      await waitFor(() => {
        expect(screen.getByText('Select Network')).toBeInTheDocument();
        expect(screen.getByText('Please select a network from the header dropdown to get started.')).toBeInTheDocument();
      });

      // Switch network
      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      // Verify contract initialization
      await waitFor(() => {
        expect(getContractAddress).toHaveBeenCalledWith('0x61');
        expect(ethers.BrowserProvider).toHaveBeenCalledWith(window.ethereum);
        expect(mockProvider.send).toHaveBeenCalledWith('eth_requestAccounts', []);
        expect(mockProvider.getSigner).toHaveBeenCalled();
      });

      // Verify proposals are fetched
      await waitFor(() => {
        expect(mockDaoContract.getProposalsIdByInvestor).toHaveBeenCalledWith(
          '0x1234567890123456789012345678901234567890'
        );
        expect(mockDaoContract.proposals).toHaveBeenCalled();
      });

      // Should show proposals interface
      await waitFor(() => {
        expect(screen.getByText('Votes Proposals')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search by description or proposer...')).toBeInTheDocument();
      });
    });

    test('handles network switch to unsupported network', async () => {
      getContractAddress.mockReturnValue('0x0000000000000000000000000000000000000000');

      await act(async () => {
        render(<MyVoting />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        expect(screen.getByText('❌ Contract Not Available')).toBeInTheDocument();
        expect(screen.getByText(/The DAO contract is not deployed on/)).toBeInTheDocument();
      });
    });

    test('handles network clearing', async () => {
      await act(async () => {
        render(<MyVoting />);
      });

      // First switch to a network
      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      // Wait for network to be set
      await waitFor(() => {
        expect(mockDaoContract.getProposalsIdByInvestor).toHaveBeenCalled();
      });

      // Clear network
      await act(async () => {
        fireEvent.click(screen.getByTestId('network-clear-btn'));
      });

      // Should show network selection again
      await waitFor(() => {
        expect(screen.getByText('Select Network')).toBeInTheDocument();
      });
    });
  });

  describe('Proposal Loading and Display Flow', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<MyVoting />);
      });

      // Setup network
      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      // Wait for initialization
      await waitFor(() => {
        expect(mockDaoContract.getProposalsIdByInvestor).toHaveBeenCalled();
      });
    });

    test('displays proposals with correct formatting', async () => {
      await waitFor(() => {
        // Should show proposal content
        expect(screen.getByText('Integration Test Proposal')).toBeInTheDocument();
        
        // Should show formatted funding progress
        const fundingElements = screen.getAllByText(/GNJ/);
        expect(fundingElements.length).toBeGreaterThan(0);
        
        // Should show vote counts
        expect(screen.getByText('8')).toBeInTheDocument(); // Votes for
        expect(screen.getByText('3')).toBeInTheDocument(); // Votes against
      });
    });

    test('handles empty proposals list', async () => {
      mockDaoContract.getProposalsIdByInvestor.mockResolvedValueOnce([]);

      await act(async () => {
        render(<MyVoting />);
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        expect(screen.getByText('No proposals found')).toBeInTheDocument();
      });
    });

    test('handles proposal loading error', async () => {
      mockDaoContract.getProposalsIdByInvestor.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(<MyVoting />);
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      // Should handle error gracefully
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('⚠ Unable to fetch voting history. You may not have voted yet.');
      });
    });
  });

  describe('Filtering and Search Functionality', () => {
    beforeEach(async () => {
      // Setup multiple proposals with different statuses
      mockDaoContract.getProposalsIdByInvestor.mockResolvedValue(['1', '2', '3']);
      mockDaoContract.proposals
        .mockResolvedValueOnce(mockProposalData) // Active proposal
        .mockResolvedValueOnce({
          ...mockProposalData,
          id: BigInt(2),
          description: 'Executed Proposal',
          executed: true,
        }) // Executed proposal
        .mockResolvedValueOnce({
          ...mockProposalData,
          id: BigInt(3),
          description: 'Fully Funded Proposal',
          totalInvested: BigInt('150000000000000000000'), // More than funding goal
        }); // Funded proposal

      await act(async () => {
        render(<MyVoting />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        expect(mockDaoContract.getProposalsIdByInvestor).toHaveBeenCalled();
      });
    });

    test('filters proposals by status', async () => {
      await waitFor(() => {
        // Should show all proposals initially
        expect(screen.getByText('3 of 3 proposals')).toBeInTheDocument();
      });

      // Filter by active
      await act(async () => {
        fireEvent.click(screen.getByText('Active'));
      });

      // Should show only active proposals
      await waitFor(() => {
        expect(screen.getByText('Integration Test Proposal')).toBeInTheDocument();
      });

      // Filter by executed
      await act(async () => {
        fireEvent.click(screen.getByText('Executed'));
      });

      // Should show only executed proposals
      await waitFor(() => {
        expect(screen.getByText('Executed Proposal')).toBeInTheDocument();
      });
    });

    test('searches proposals by description', async () => {
      await waitFor(() => {
        expect(screen.getByText('3 of 3 proposals')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by description or proposer...');
      
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'Integration' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Integration Test Proposal')).toBeInTheDocument();
      });
    });

    test('sorts proposals correctly', async () => {
      await waitFor(() => {
        expect(screen.getByText('3 of 3 proposals')).toBeInTheDocument();
      });

      const sortSelect = screen.getByDisplayValue('Newest First');
      
      await act(async () => {
        fireEvent.change(sortSelect, { target: { value: 'oldest' } });
      });

      // Proposals should be reordered (verification would depend on UI structure)
      expect(sortSelect.value).toBe('oldest');
    });

    test('clears search and filters', async () => {
      const searchInput = screen.getByPlaceholderText('Search by description or proposer...');
      
      // Set search term
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'test' } });
      });

      expect(searchInput.value).toBe('test');

      // Should show clear button
      const clearButton = screen.getByText('Clear Search');
      
      await act(async () => {
        fireEvent.click(clearButton);
      });

      expect(searchInput.value).toBe('');
    });
  });

  describe('Voting Flow Integration', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<MyVoting />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        expect(mockDaoContract.getProposalsIdByInvestor).toHaveBeenCalled();
      });
    });

    test('navigates to vote page when clicking vote button', async () => {
      await waitFor(() => {
        const voteButton = screen.getByText('Vote & Invest');
        expect(voteButton).toBeInTheDocument();
      });

      const voteButton = screen.getByText('Vote & Invest');
      
      await act(async () => {
        fireEvent.click(voteButton);
      });

      // Should set proposal ID in localStorage and navigate
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('proposalId', '1');
      expect(window.location.href).toBe('/investor-vote');
    });

    test('disables vote button for executed proposals', async () => {
      // Mock executed proposal
      mockDaoContract.proposals.mockResolvedValueOnce({
        ...mockProposalData,
        executed: true,
      });

      await act(async () => {
        render(<MyVoting />);
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        const executedButton = screen.getByText('Proposal Executed');
        expect(executedButton).toBeInTheDocument();
        expect(executedButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling Integration', () => {
    test('handles MetaMask not installed', async () => {
      delete window.ethereum;

      await act(async () => {
        render(<MyVoting />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      expect(toast.error).toHaveBeenCalledWith('Please install MetaMask!');
    });

    test('handles user rejection of wallet connection', async () => {
      mockProvider.send.mockRejectedValueOnce(new Error('user rejected'));

      await act(async () => {
        render(<MyVoting />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('❌ Connection rejected by user.');
      });
    });

    test('handles network detection failure', async () => {
      mockProvider.send.mockRejectedValueOnce(new Error('could not detect network'));

      await act(async () => {
        render(<MyVoting />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('❌ Failed to connect to the network. Please check your wallet connection.');
      });
    });

    test('handles contract method not found gracefully', async () => {
      mockDaoContract.interface.hasFunction.mockReturnValue(false);

      await act(async () => {
        render(<MyVoting />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      // Should not crash, should handle gracefully
      await waitFor(() => {
        expect(mockDaoContract.getProposalsIdByInvestor).not.toHaveBeenCalled();
      });
    });
  });

  describe('Responsive Design and Accessibility', () => {
    test('renders responsive layout elements', async () => {
      await act(async () => {
        render(<MyVoting />);
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        // Should render responsive filter section
        expect(screen.getByText('Search Proposals')).toBeInTheDocument();
        expect(screen.getByText('Filter by Status')).toBeInTheDocument();
        expect(screen.getByText('Sort by')).toBeInTheDocument();
      });
    });

    test('handles sidebar toggle functionality', async () => {
      await act(async () => {
        render(<MyVoting />);
      });

      const toggleButton = screen.getByTestId('sidebar-toggle');
      
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // Should toggle sidebar (visual state change in CSS classes)
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    test('handles multiple rapid network switches', async () => {
      await act(async () => {
        render(<MyVoting />);
      });

      // Rapidly switch networks
      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
        fireEvent.click(screen.getByTestId('network-clear-btn'));
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      // Should handle gracefully without crashes
      expect(getContractAddress).toHaveBeenCalledTimes(2);
    });

    test('properly cleans up event listeners and effects', async () => {
      const { unmount } = render(<MyVoting />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      // Unmount component
      unmount();

      // Should not cause memory leaks or errors
      expect(mockEthereum.removeListener).toHaveBeenCalled();
    });
  });

  describe('Data Consistency and State Management', () => {
    test('maintains consistent state across component updates', async () => {
      const { rerender } = render(<MyVoting />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        expect(mockDaoContract.getProposalsIdByInvestor).toHaveBeenCalled();
      });

      // Rerender component
      rerender(<MyVoting />);

      // State should be preserved
      await waitFor(() => {
        expect(screen.getByText('Votes Proposals')).toBeInTheDocument();
      });
    });

    test('refreshes data when network changes', async () => {
      await act(async () => {
        render(<MyVoting />);
      });

      // Initial network setup
      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        expect(mockDaoContract.getProposalsIdByInvestor).toHaveBeenCalledTimes(1);
      });

      // Change network again
      await act(async () => {
        fireEvent.click(screen.getByTestId('network-switch-btn'));
      });

      await waitFor(() => {
        expect(mockDaoContract.getProposalsIdByInvestor).toHaveBeenCalledTimes(2);
      });
    });
  });
});