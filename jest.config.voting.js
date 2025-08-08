/**
 * Jest configuration specifically for MyVoting component tests
 * Provides optimized settings for contract interaction testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/pages/Investor/__tests__/setup.js'
  ],

  // Module paths
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/src/pages/Investor/__tests__/**/*.test.js',
    '<rootDir>/src/pages/Investor/__tests__/**/*.spec.js'
  ],

  // Coverage configuration
  collectCoverage: false, // Enable with --coverage flag
  collectCoverageFrom: [
    'src/pages/Investor/MyVoting.jsx',
    'src/pages/Investor/component/*.{js,jsx}',
    'src/utils/networks.js',
    '!src/pages/Investor/__tests__/**',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  coverageDirectory: 'coverage/voting',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/pages/Investor/MyVoting.jsx': {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },

  // Module directories
  moduleDirectories: [
    'node_modules',
    '<rootDir>/src'
  ],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: false, // Enable with --verbose flag

  // Error handling
  bail: false, // Enable with --bail flag

  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/coverage/'
  ],

  // Mock configuration
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Global variables for tests
  globals: {
    'process.env.NODE_ENV': 'test',
    'process.env.REACT_APP_TOKEN_ADDRESS': '0xTestTokenAddress',
    'process.env.REACT_APP_DAO_BSC_TEST_ADDRESS': '0xTestDAOAddress'
  },

  // Custom test results processor
  testResultsProcessor: undefined,

  // Snapshot configuration
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],

  // Extensions to resolve
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(ethers|@testing-library|react-toastify)/)'
  ],

  // Error on deprecated features
  errorOnDeprecated: true,

  // Force exit after tests complete
  forceExit: false,

  // Detect open handles
  detectOpenHandles: false,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Custom reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage/voting',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Notify configuration
  notify: false,
  notifyMode: 'failure-change',

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // Custom matcher configuration
  setupFiles: [],

  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};