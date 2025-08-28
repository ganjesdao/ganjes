# Ganjes DAO Proposal Management Scripts

## 📋 Available Scripts

### 1. **Get All Proposals** - `getAllProposals.js`
Fetches and displays all proposals in the DAO with comprehensive information and filtering options.

**Usage:**
```bash
# Basic usage - get all proposals
npm run get-proposals

# Filter by status
npm run get-proposals -- --status active
npm run get-proposals -- --status pending
npm run get-proposals -- --status passed
npm run get-proposals -- --status failed

# Filter by proposer
npm run get-proposals -- --proposer 0x123...abc

# Filter by minimum funding amount
npm run get-proposals -- --min-funding 100

# Sort proposals
npm run get-proposals -- --sort funding
npm run get-proposals -- --sort votes
npm run get-proposals -- --sort recent

# Show full descriptions
npm run get-proposals -- --show-description

# Combined filters
npm run get-proposals -- --status active --sort funding --show-description
```

**Features:**
- ✅ Lists all proposals with key details
- ✅ Shows voting progress and funding status
- ✅ Filters by status, proposer, and funding amount
- ✅ Multiple sorting options
- ✅ Comprehensive statistics summary
- ✅ Time remaining for active proposals
- ✅ Success rate calculations

### 2. **Get Proposal Details** - `getProposalDetails.js`
Shows detailed information for a specific proposal including voting, funding, and user participation.

**Usage:**
```bash
# Get details for proposal #1
npm run get-proposal-details 1

# Get details for proposal #5
npm run get-proposal-details 5

# Help
npm run get-proposal-details --help
```

**Features:**
- ✅ Complete proposal information
- ✅ Voting statistics and distribution
- ✅ Funding progress and status
- ✅ Time remaining information
- ✅ User's personal investment details
- ✅ Refund eligibility status

### 3. **Create New Proposal** - `createProposal.js`
Interactive script for creating new proposals with validation and guidance.

**Usage:**
```bash
# Interactive proposal creation
npm run create-proposal

# Help
npm run create-proposal help
```

### 4. **Create Test Proposal** - `createTestProposal.js`
Creates a sample proposal for testing purposes.

**Usage:**
```bash
# Create test proposal
npm run test-proposal
```

## 📊 Sample Output

### All Proposals List:
```
🏛️  Fetching All Proposals from Ganjes DAO
==========================================

📝 Using account: 0x073f...b128
🏛️  DAO Contract: 0xd1F5...BAa8
📊 Total Proposals: 2
🔍 Found 2 proposal(s)

================================================================================
📊 PROPOSAL SUMMARY (2 shown)
================================================================================

🏷️  PROPOSAL #2
==================================================
📋 Project Name: Test Project 1
👤 Proposer: 0xc55999...F897
💰 Funding Goal: 5000.0 tokens
💵 Deposit: 100.0 tokens
📅 Voting Ends: 8/3/2025, 12:24:23 PM
📊 Status: ⏳ PENDING EXECUTION
🗳️  Voting: No votes yet
💸 Funding: 0.0 / 5000.0 tokens (0%)
🔗 Project URL: google.com
✅ Executed: No

🏷️  PROPOSAL #1
==================================================
📋 Project Name: Ganjes DeFi Marketplace
👤 Proposer: 0x073f...b128
💰 Funding Goal: 500.0 tokens
💵 Deposit: 100.0 tokens
📅 Voting Ends: 8/3/2025, 12:07:33 PM
📊 Status: ⏳ PENDING EXECUTION
🗳️  Voting: No votes yet
💸 Funding: 0.0 / 500.0 tokens (0%)
🔗 Project URL: https://github.com/ganjes/defi-marketplace
✅ Executed: No

================================================================================
📈 STATISTICS
================================================================================
📊 Total Proposals: 2
🗳️  Active Voting: 0
⏳ Pending Execution: 2
✅ Passed: 0
❌ Failed: 0
💰 Total Funding Requested: 5500.0 tokens
💸 Total Funding Distributed: 0.0 tokens
📈 Total Community Investment: 0.0 tokens
📊 Average Funding Request: 2750.0 tokens
📈 Success Rate: 0.0%
```

## 🔧 Configuration

### Environment Variables (.env)
```bash
# DAO Contract Address
DAO_ADDRESS=0x1c62B1D96982D1793b30031f23E0EB4a126496b2

# Token Contract Address
TOKEN_ADDRESS=0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb

# Network Configuration
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
PRIVATE_KEY=your_private_key_here
```

### NPM Scripts Added to package.json:
```json
{
  "scripts": {
    "get-proposals": "hardhat run scripts/getAllProposals.js --network bsc-testnet",
    "get-proposal-details": "hardhat run scripts/getProposalDetails.js --network bsc-testnet",
    "create-proposal": "hardhat run scripts/createProposal.js --network bsc-testnet",
    "test-proposal": "hardhat run scripts/createTestProposal.js --network bsc-testnet"
  }
}
```

## 📋 Data Displayed

### For Each Proposal:
- **Basic Info**: ID, project name, proposer address
- **Financial**: Funding goal, deposit amount, current investment
- **Timing**: Voting end time, time remaining
- **Status**: Execution status, pass/fail result
- **Voting**: Vote counts, vote distribution percentages
- **Links**: Project URL for additional information

### Summary Statistics:
- **Totals**: Total proposals, funding requested/distributed
- **Status Breakdown**: Active, pending, passed, failed counts
- **Performance**: Success rate, average funding request
- **Community**: Total investment amount

## 🎯 Use Cases

### For DAO Members:
- **Browse Proposals**: See all available proposals to vote on
- **Track Progress**: Monitor funding and voting progress
- **Make Decisions**: Get detailed info before voting
- **Check History**: Review past proposals and outcomes

### For Proposers:
- **Monitor Status**: Track their proposal's progress
- **Create Proposals**: Interactive guidance for submission
- **Check Requirements**: Verify eligibility before proposing

### For Administrators:
- **DAO Overview**: Complete picture of DAO activity
- **Execution Planning**: See which proposals need execution
- **Performance Analysis**: Track DAO success metrics
- **Audit Trail**: Complete proposal history

## 🔍 Filtering & Sorting Options

### Status Filters:
- `active` - Currently accepting votes
- `pending` - Voting ended, awaiting execution
- `passed` - Successfully funded proposals
- `failed` - Rejected or failed proposals

### Sorting Options:
- `funding` - Sort by funding goal (highest first)
- `votes` - Sort by total vote count
- `recent` - Sort by most recent voting end time
- `id` - Sort by proposal ID (default, newest first)

### Other Filters:
- **Proposer Address**: Show only proposals by specific user
- **Minimum Funding**: Filter by minimum funding amount
- **Description**: Include/exclude full descriptions

## ⚠️ Troubleshooting

### Common Issues:

1. **"No proposals found"**
   - Check DAO_ADDRESS in .env file
   - Verify network connection
   - Confirm DAO contract is deployed

2. **"Invalid proposal ID"**
   - Use valid proposal numbers (1, 2, 3, etc.)
   - Check if proposal exists with get-proposals first

3. **Network errors**
   - Verify BSC Testnet RPC URL
   - Check internet connection
   - Ensure sufficient BNB for gas fees

4. **Contract interaction errors**
   - Verify contract ABI is up to date
   - Check if contract is deployed on current network
   - Ensure private key has proper permissions

## 🚀 Quick Start

1. **Setup Environment:**
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **View All Proposals:**
   ```bash
   npm run get-proposals
   ```

3. **Get Specific Proposal:**
   ```bash
   npm run get-proposal-details 1
   ```

4. **Create New Proposal:**
   ```bash
   npm run create-proposal
   ```

Your Ganjes DAO proposal management system is now fully equipped with comprehensive tools for viewing, analyzing, and creating proposals! 🎉