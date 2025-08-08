# MyVoting Component Test Suite

A comprehensive test suite for the MyVoting React component, covering all contract initialization, blockchain interactions, and user interface functionality.

## Overview

This test suite provides complete coverage for the MyVoting component with four specialized test categories:

- **Unit Tests** - Basic component functionality and isolated unit tests
- **Contract Tests** - Blockchain contract interactions and Web3 functionality  
- **Utility Tests** - Helper functions, filtering, sorting, and data formatting
- **Integration Tests** - End-to-end user workflows and component integration

## Quick Start

```bash
# Install test dependencies
npm install

# Run all tests
npm run test:voting

# Run specific test categories
npm run test:voting:unit
npm run test:voting:contract
npm run test:voting:utils
npm run test:voting:integration

# Run with coverage report
npm run test:voting:coverage

# Run in watch mode for development
npm run test:voting:watch
```

## Test Files Structure

```
src/pages/Investor/__tests__/
├── README.md                     # This documentation
├── setup.js                      # Test configuration and utilities
├── runTests.js                    # Custom test runner script
├── MyVoting.test.js              # Unit tests - component rendering and basic functionality
├── MyVoting.contract.test.js     # Contract tests - blockchain interactions
├── MyVoting.utils.test.js        # Utility tests - helper functions and data processing
└── MyVoting.integration.test.js  # Integration tests - complete user workflows
```

## Test Categories

### 1. Unit Tests (`MyVoting.test.js`)

Tests basic component functionality without complex integrations:

- **Component Rendering** - Loading states, authenticated/unauthenticated views
- **Network Handling** - Network switching, state management
- **Contract Initialization** - Provider setup, contract instantiation
- **Error Handling** - MetaMask errors, network failures
- **State Management** - Component state updates, sidebar toggling

**Run with:**
```bash
npm run test:voting:unit
```

### 2. Contract Tests (`MyVoting.contract.test.js`)

Tests all blockchain contract interactions and Web3 functionality:

- **Contract Initialization** - Address validation, provider setup
- **Proposal ID Fetching** - `getProposalsIdByInvestor` method calls
- **Proposal Details** - Data fetching and BigInt handling
- **Investor Details** - Vote information retrieval
- **Voting Functions** - Transaction execution and error scenarios
- **Token Approval** - ERC20 token interactions

**Run with:**
```bash
npm run test:voting:contract
```

### 3. Utility Tests (`MyVoting.utils.test.js`)

Tests helper functions and data processing logic:

- **Proposal Filtering** - Status-based filtering (active, executed, funded)
- **Search Functionality** - Text search in descriptions and proposer addresses
- **Sorting Logic** - Various sorting methods (newest, funding, votes)
- **Data Formatting** - Number formatting, percentage calculations
- **Validation Functions** - Input validation, error handling
- **Performance Utilities** - Debouncing, memoization

**Run with:**
```bash
npm run test:voting:utils
```

### 4. Integration Tests (`MyVoting.integration.test.js`)

Tests complete user workflows and component interactions:

- **Authentication Flow** - Login process and state transitions
- **Network Connection** - Complete network switching workflow
- **Proposal Loading** - Full data loading and display cycle
- **Filtering & Search** - Complete UI interaction testing
- **Voting Flow** - End-to-end voting process
- **Error Recovery** - Comprehensive error scenario testing
- **Responsive Design** - Mobile and accessibility testing

**Run with:**
```bash
npm run test:voting:integration
```

## Available Test Scripts

| Script | Description | Example |
|--------|-------------|---------|
| `npm run test:voting` | Run all tests | Default execution |
| `npm run test:voting:unit` | Run only unit tests | Component testing |
| `npm run test:voting:contract` | Run only contract tests | Blockchain testing |
| `npm run test:voting:utils` | Run only utility tests | Helper function testing |
| `npm run test:voting:integration` | Run only integration tests | End-to-end testing |
| `npm run test:voting:watch` | Run in watch mode | Development testing |
| `npm run test:voting:coverage` | Run with coverage report | Quality assurance |
| `npm run test:voting:ci` | Run for CI/CD | Automated testing |

## Custom Test Runner

The test suite includes a custom runner (`runTests.js`) with enhanced features:

### Command Line Options

```bash
# Basic usage
node runTests.js [test-type] [options]

# Examples
node runTests.js unit --watch --verbose
node runTests.js contract --coverage
node runTests.js all --bail --silent
```

### Available Options

- `--watch, -w` - Run tests in watch mode
- `--coverage, -c` - Generate code coverage report
- `--verbose, -v` - Show detailed test output
- `--silent, -s` - Minimal output (errors only)
- `--update-snapshots, -u` - Update component snapshots
- `--bail, -b` - Stop on first test failure
- `--help, -h` - Show help message

## Mock Configuration

The test suite uses comprehensive mocking for external dependencies:

### Ethers.js Mocking
```javascript
// Blockchain provider and contract mocking
const mockProvider = TestUtils.createMockProvider();
const mockContract = TestUtils.createMockContract();
```

### Component Mocking
```javascript
// Header, Sidebar, Footer, Auth components
// Simplified versions for isolated testing
```

### Network Utilities
```javascript
// Network detection and contract address resolution
getContractAddress.mockReturnValue('0xTestAddress');
```

## Test Utilities

The `setup.js` file provides helper utilities for test creation:

### TestUtils
- `createMockEthereum()` - Mock Ethereum provider
- `createMockContract()` - Mock DAO contract with default methods
- `createMockProvider()` - Mock ethers provider
- `createProposalData()` - Generate test proposal data
- `simulateNetworkSwitch()` - Helper for network testing

### CommonMocks
- Pre-configured mocks for ethers, toast, networks
- Consistent mock implementations across tests

### Performance & A11y Utils
- `measureRenderTime()` - Performance testing helpers
- `checkAriaLabels()` - Accessibility validation
- `checkKeyboardNavigation()` - Keyboard accessibility testing

## Coverage Requirements

The test suite enforces minimum coverage thresholds:

- **Global Coverage**: 70% branches, 80% functions/lines/statements
- **MyVoting Component**: 75% branches, 85% functions/lines/statements

View coverage reports in `coverage/voting/lcov-report/index.html`

## Testing Best Practices

### 1. Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names that explain the scenario
- Follow AAA pattern: Arrange, Act, Assert

### 2. Mock Management
- Use `beforeEach` and `afterEach` for mock setup/cleanup
- Reset mocks between tests to avoid interference
- Mock external dependencies, not internal logic

### 3. Async Testing
- Use `await waitFor()` for async operations
- Wrap user interactions in `act()`
- Handle promise rejections properly

### 4. Error Testing
- Test both success and failure scenarios
- Verify error messages and toast notifications
- Test edge cases and boundary conditions

## Debugging Tests

### Common Issues

1. **Test Timeouts**
   - Increase timeout in jest config or individual tests
   - Check for unresolved promises or missing awaits

2. **Mock Issues**
   - Verify mock implementations match expected signatures
   - Check mock reset/cleanup between tests

3. **Async Problems**
   - Use `waitFor` for DOM updates
   - Wrap state changes in `act()`

### Debug Commands
```bash
# Run with verbose output
npm run test:voting:unit -- --verbose

# Run single test file
npx jest MyVoting.contract.test.js --verbose

# Debug with Node debugger
node --inspect-brk node_modules/.bin/jest MyVoting.test.js --runInBand
```

## Continuous Integration

### CI Configuration
```bash
# Run tests in CI environment
npm run test:voting:ci

# This runs with:
# --coverage: Generate coverage report
# --bail: Stop on first failure
# --silent: Minimal output for CI logs
```

### Coverage Reports
- HTML report: `coverage/voting/lcov-report/index.html`
- XML report: `coverage/voting/junit.xml`
- JSON data: `coverage/voting/coverage-final.json`

## Contributing

When adding new tests:

1. Follow the existing file structure and naming conventions
2. Add appropriate mocks in `setup.js` if needed
3. Update this README if adding new test categories
4. Ensure new tests pass coverage requirements
5. Test both success and error scenarios

### Test Writing Checklist
- [ ] Test covers both success and failure cases
- [ ] Appropriate mocks are used and cleaned up
- [ ] Async operations are properly handled with `waitFor`
- [ ] Test name clearly describes the scenario
- [ ] Coverage thresholds are maintained
- [ ] No hardcoded values or magic numbers

## Support

For questions or issues with the test suite:

1. Check this README for common solutions
2. Run tests with `--verbose` flag for detailed output
3. Verify all dependencies are installed with `npm install`
4. Check that mock implementations match actual API signatures

## Version History

- **v1.0.0** - Initial comprehensive test suite
  - Complete unit, contract, utility, and integration tests
  - Custom test runner with advanced options
  - Coverage reporting and CI integration
  - Comprehensive mocking and test utilities