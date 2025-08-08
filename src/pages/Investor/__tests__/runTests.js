#!/usr/bin/env node

/**
 * Test runner script for MyVoting component
 * Provides different test execution modes and reporting
 */

const { execSync } = require('child_process');
const path = require('path');

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bright}${colors.cyan}🧪 ${msg}${colors.reset}`),
};

// Test configurations
const testConfigs = {
  unit: {
    name: 'Unit Tests',
    pattern: 'MyVoting.test.js',
    description: 'Basic component functionality and isolated unit tests',
  },
  contract: {
    name: 'Contract Tests',
    pattern: 'MyVoting.contract.test.js',
    description: 'Blockchain contract interactions and Web3 functionality',
  },
  utils: {
    name: 'Utility Tests',
    pattern: 'MyVoting.utils.test.js',
    description: 'Helper functions, filtering, sorting, and data formatting',
  },
  integration: {
    name: 'Integration Tests',
    pattern: 'MyVoting.integration.test.js',
    description: 'End-to-end user workflows and component integration',
  },
  all: {
    name: 'All Tests',
    pattern: '__tests__/',
    description: 'Complete test suite execution',
  },
};

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';
const options = {
  watch: args.includes('--watch') || args.includes('-w'),
  coverage: args.includes('--coverage') || args.includes('-c'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  silent: args.includes('--silent') || args.includes('-s'),
  updateSnapshots: args.includes('--update-snapshots') || args.includes('-u'),
  bail: args.includes('--bail') || args.includes('-b'),
};

function displayHelp() {
  console.log(`
${colors.bright}${colors.cyan}MyVoting Component Test Runner${colors.reset}

${colors.bright}Usage:${colors.reset}
  npm run test:voting [test-type] [options]
  node runTests.js [test-type] [options]

${colors.bright}Test Types:${colors.reset}`);

  Object.entries(testConfigs).forEach(([key, config]) => {
    console.log(`  ${colors.green}${key.padEnd(12)}${colors.reset} - ${config.description}`);
  });

  console.log(`
${colors.bright}Options:${colors.reset}
  --watch, -w           Run tests in watch mode
  --coverage, -c        Generate code coverage report
  --verbose, -v         Show detailed test output
  --silent, -s          Minimal output (errors only)
  --update-snapshots, -u Update component snapshots
  --bail, -b            Stop on first test failure
  --help, -h            Show this help message

${colors.bright}Examples:${colors.reset}
  ${colors.cyan}npm run test:voting unit --watch${colors.reset}
  ${colors.cyan}npm run test:voting contract --coverage${colors.reset}
  ${colors.cyan}npm run test:voting integration --verbose${colors.reset}
  ${colors.cyan}npm run test:voting all --coverage --bail${colors.reset}
`);
}

function buildJestCommand(testType, options) {
  const config = testConfigs[testType];
  if (!config) {
    throw new Error(`Unknown test type: ${testType}`);
  }

  let command = 'npx jest';
  
  // Add test pattern
  if (testType !== 'all') {
    command += ` --testPathPattern="${config.pattern}"`;
  } else {
    command += ' --testPathPattern="src/pages/Investor/__tests__/"';
  }

  // Add options
  if (options.watch) command += ' --watch';
  if (options.coverage) command += ' --coverage --coverageDirectory=coverage/voting';
  if (options.verbose) command += ' --verbose';
  if (options.silent) command += ' --silent';
  if (options.updateSnapshots) command += ' --updateSnapshot';
  if (options.bail) command += ' --bail';

  // Add Jest configuration
  command += ' --setupFilesAfterEnv=src/pages/Investor/__tests__/setup.js';
  command += ' --testEnvironment=jsdom';
  command += ' --collectCoverageFrom="src/pages/Investor/MyVoting.jsx"';
  command += ' --collectCoverageFrom="src/pages/Investor/component/*.jsx"';

  return command;
}

function runTests(testType, options) {
  const config = testConfigs[testType];
  
  if (!config) {
    log.error(`Unknown test type: ${testType}`);
    log.info('Available test types: ' + Object.keys(testConfigs).join(', '));
    process.exit(1);
  }

  log.header(`Running ${config.name}`);
  log.info(config.description);

  if (options.coverage) {
    log.info('Code coverage will be generated');
  }

  if (options.watch) {
    log.info('Running in watch mode - press q to quit');
  }

  console.log(''); // Add spacing

  try {
    const command = buildJestCommand(testType, options);
    
    if (options.verbose) {
      log.info(`Executing: ${command}`);
      console.log('');
    }

    execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CI: process.env.CI || 'false',
      }
    });

    console.log('');
    log.success(`${config.name} completed successfully!`);

    if (options.coverage) {
      log.info('Coverage report generated in: coverage/voting/');
      log.info('Open coverage/voting/lcov-report/index.html to view detailed coverage');
    }

  } catch (error) {
    console.log('');
    log.error(`${config.name} failed with exit code: ${error.status}`);
    
    if (!options.silent) {
      console.log('');
      log.info('Troubleshooting tips:');
      console.log('  • Check that all dependencies are installed: npm install');
      console.log('  • Verify test files exist in the correct location');
      console.log('  • Run with --verbose for more detailed output');
      console.log('  • Check for syntax errors in test files');
    }
    
    process.exit(error.status || 1);
  }
}

// Main execution
function main() {
  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    displayHelp();
    process.exit(0);
  }

  // Validate test type
  if (testType && !testConfigs[testType]) {
    log.error(`Invalid test type: ${testType}`);
    log.info('Run with --help to see available options');
    process.exit(1);
  }

  // Show configuration summary unless silent
  if (!options.silent) {
    console.log('');
    log.header('Test Configuration Summary');
    console.log(`Test Type: ${colors.green}${testType}${colors.reset}`);
    console.log(`Watch Mode: ${options.watch ? colors.green : colors.red}${options.watch}${colors.reset}`);
    console.log(`Coverage: ${options.coverage ? colors.green : colors.red}${options.coverage}${colors.reset}`);
    console.log(`Verbose: ${options.verbose ? colors.green : colors.red}${options.verbose}${colors.reset}`);
    console.log('');
  }

  // Run the tests
  runTests(testType, options);
}

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception occurred:');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled promise rejection:');
  console.error(reason);
  process.exit(1);
});

// Run main function
main();