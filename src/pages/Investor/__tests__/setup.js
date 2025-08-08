/**
 * Test setup file for MyVoting component tests
 * Provides common mocks, utilities, and configurations
 */

import { configure } from '@testing-library/react';
import '@testing-library/jest-dom';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
});

// Global test environment setup
beforeAll(() => {
  // Suppress console warnings during tests
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    // Filter out known warnings that don't affect functionality
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render is no longer supported') ||
       message.includes('Warning: componentWillMount has been renamed'))
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args) => {
    // Filter out known errors that are expected in tests
    const message = args[0];
    if (
      typeof message === 'string' &&
      (message.includes('Error: Not implemented: HTMLFormElement.prototype.requestSubmit') ||
       message.includes('The above error occurred in the'))
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  // Setup ResizeObserver mock
  global.ResizeObserver = class ResizeObserver {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {
      this.cb([{ borderBoxSize: { inlineSize: 0, blockSize: 0 } }], this);
    }
    unobserve() {}
    disconnect() {}
  };

  // Setup IntersectionObserver mock
  global.IntersectionObserver = class IntersectionObserver {
    constructor(cb) {
      this.cb = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock window.getComputedStyle
  Object.defineProperty(window, 'getComputedStyle', {
    value: () => ({
      getPropertyValue: () => '',
    }),
  });
});

// Global test cleanup
afterAll(() => {
  // Restore original console methods
  console.warn = console.warn;
  console.error = console.error;
});

// Common test utilities
export const TestUtils = {
  // Create mock ethereum provider
  createMockEthereum: () => ({
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    isMetaMask: true,
    chainId: '0x61',
  }),

  // Create mock contract with default methods
  createMockContract: (overrides = {}) => ({
    getProposalsIdByInvestor: jest.fn().mockResolvedValue(['1', '2']),
    proposals: jest.fn().mockResolvedValue({
      id: BigInt(1),
      description: 'Test Proposal',
      fundingGoal: BigInt('100000000000000000000'),
      proposer: '0x742d35Cc6234B4C4b5D3b8b123E4F5678901234567',
      votersFor: BigInt(5),
      votersAgainst: BigInt(2),
      totalVotesFor: BigInt('50000000000000000000'),
      totalInvested: BigInt('75000000000000000000'),
      totalVotesAgainst: BigInt('20000000000000000000'),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
      passed: false,
      rejected: false,
      executed: false,
    }),
    getInvestorDetails: jest.fn().mockResolvedValue({
      investors: ['0x1234567890123456789012345678901234567890'],
      investments: [BigInt('15000000000000000000')],
      voteSupports: [true],
      timestamps: [BigInt(1640995200)],
      hasVotedFlags: [true],
    }),
    vote: jest.fn().mockResolvedValue({
      hash: '0xTxHash123',
      wait: jest.fn().mockResolvedValue({ status: 1 }),
    }),
    interface: {
      hasFunction: jest.fn().mockReturnValue(true),
    },
    ...overrides,
  }),

  // Create mock provider
  createMockProvider: () => ({
    send: jest.fn().mockResolvedValue([]),
    getSigner: jest.fn().mockResolvedValue({
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    }),
  }),

  // Create mock token contract
  createMockTokenContract: () => ({
    approve: jest.fn().mockResolvedValue({
      hash: '0xApprovalHash123',
      wait: jest.fn().mockResolvedValue({ status: 1 }),
    }),
    balanceOf: jest.fn().mockResolvedValue(BigInt('1000000000000000000000')),
    transfer: jest.fn(),
    transferFrom: jest.fn(),
  }),

  // Helper to wait for async operations
  waitForAsync: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create proposal data with specific status
  createProposalData: (status = 'active') => {
    const baseData = {
      id: BigInt(1),
      description: 'Test Proposal',
      fundingGoal: BigInt('100000000000000000000'),
      proposer: '0x742d35Cc6234B4C4b5D3b8b123E4F5678901234567',
      votersFor: BigInt(5),
      votersAgainst: BigInt(2),
      totalVotesFor: BigInt('50000000000000000000'),
      totalInvested: BigInt('75000000000000000000'),
      totalVotesAgainst: BigInt('20000000000000000000'),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 86400),
      passed: false,
      rejected: false,
      executed: false,
    };

    switch (status) {
      case 'executed':
        return { ...baseData, executed: true, passed: true };
      case 'rejected':
        return { ...baseData, rejected: true };
      case 'funded':
        return { ...baseData, totalInvested: BigInt('150000000000000000000') };
      case 'expired':
        return { ...baseData, endTime: BigInt(Math.floor(Date.now() / 1000) - 86400) };
      default:
        return baseData;
    }
  },

  // Helper to simulate user interactions
  simulateNetworkSwitch: async (fireEvent, screen) => {
    const networkButton = screen.getByTestId('network-switch-btn');
    fireEvent.click(networkButton);
    await TestUtils.waitForAsync(100);
  },

  // Helper to setup authenticated state
  setupAuthenticatedState: () => {
    Object.defineProperty(window, 'sessionStorage', {
      writable: true,
      value: {
        getItem: jest.fn().mockReturnValue('mock-auth-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
    });
  },

  // Helper to setup unauthenticated state
  setupUnauthenticatedState: () => {
    Object.defineProperty(window, 'sessionStorage', {
      writable: true,
      value: {
        getItem: jest.fn().mockReturnValue(null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
    });
  },

  // Helper to mock environment variables
  setupEnvironment: (overrides = {}) => {
    const defaultEnv = {
      REACT_APP_TOKEN_ADDRESS: '0xTokenAddress123',
      REACT_APP_BASE_API_URL: 'https://api.test.com',
      REACT_APP_DAO_BSC_TEST_ADDRESS: '0xDAOAddress123',
    };

    Object.assign(process.env, defaultEnv, overrides);
  },

  // Helper to create error scenarios
  createErrorScenarios: () => ({
    networkError: new Error('could not detect network'),
    userRejection: new Error('user rejected'),
    insufficientAllowance: new Error('insufficient allowance'),
    insufficientBalance: new Error('insufficient balance'),
    invalidProposal: new Error('InvalidProposal'),
    contractNotFound: new Error('Contract not found'),
  }),

  // Helper to assert toast calls
  expectToastCalls: (toast, expectedCalls) => {
    expectedCalls.forEach(({ type, message }) => {
      expect(toast[type]).toHaveBeenCalledWith(message);
    });
  },

  // Helper to create multiple proposals for testing
  createMultipleProposals: (count = 3) => {
    return Array.from({ length: count }, (_, index) => ({
      id: BigInt(index + 1),
      description: `Test Proposal ${index + 1}`,
      fundingGoal: BigInt('100000000000000000000'),
      proposer: `0x742d35Cc6234B4C4b5D3b8b123E4F56789012345${index.toString().padStart(2, '0')}`,
      votersFor: BigInt(Math.floor(Math.random() * 10) + 1),
      votersAgainst: BigInt(Math.floor(Math.random() * 5)),
      totalVotesFor: BigInt(`${Math.floor(Math.random() * 50) + 10}000000000000000000`),
      totalInvested: BigInt(`${Math.floor(Math.random() * 75) + 25}000000000000000000`),
      totalVotesAgainst: BigInt(`${Math.floor(Math.random() * 20) + 5}000000000000000000`),
      endTime: BigInt(Math.floor(Date.now() / 1000) + (86400 * (index + 1))),
      passed: Math.random() > 0.5,
      rejected: Math.random() > 0.8,
      executed: Math.random() > 0.7,
    }));
  },
};

// Export common mock implementations
export const CommonMocks = {
  ethers: {
    BrowserProvider: jest.fn(),
    Contract: jest.fn(),
    formatEther: jest.fn().mockImplementation((value) => {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return (num / 1e18).toString();
    }),
    formatUnits: jest.fn().mockImplementation((value, decimals = 18) => {
      const num = typeof value === 'string' ? parseFloat(value) : Number(value);
      return (num / Math.pow(10, decimals)).toString();
    }),
    parseEther: jest.fn().mockImplementation((value) => {
      return (parseFloat(value) * 1e18).toString();
    }),
  },

  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },

  networks: {
    getContractAddress: jest.fn().mockReturnValue('0xContractAddress123'),
    isTestnet: jest.fn().mockReturnValue(true),
  },

  router: {
    useNavigate: () => jest.fn(),
  },
};

// Performance testing helpers
export const PerformanceUtils = {
  measureRenderTime: async (renderFn) => {
    const start = performance.now();
    await renderFn();
    const end = performance.now();
    return end - start;
  },

  simulateSlowNetwork: (delay = 2000) => {
    return new Promise(resolve => setTimeout(resolve, delay));
  },

  createLargeDataset: (size = 100) => {
    return TestUtils.createMultipleProposals(size);
  },
};

// Accessibility testing helpers
export const A11yUtils = {
  checkAriaLabels: (container) => {
    const elementsNeedingLabels = container.querySelectorAll('button, input, select, textarea');
    const missingLabels = [];
    
    elementsNeedingLabels.forEach(element => {
      const hasLabel = element.getAttribute('aria-label') || 
                      element.getAttribute('aria-labelledby') ||
                      element.closest('label');
      
      if (!hasLabel) {
        missingLabels.push(element);
      }
    });
    
    return missingLabels;
  },

  checkKeyboardNavigation: (container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    return Array.from(focusableElements).map(el => ({
      element: el,
      tabIndex: el.tabIndex,
      disabled: el.disabled,
    }));
  },
};

// Export everything for easy importing
export default {
  TestUtils,
  CommonMocks,
  PerformanceUtils,
  A11yUtils,
};