# Ganjes DAO Proposal Creation Guide

## Table of Contents
1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Creating Proposals](#creating-proposals)
4. [Proposal Lifecycle](#proposal-lifecycle)
5. [Voting System](#voting-system)
6. [Scripts Usage](#scripts-usage)
7. [Troubleshooting](#troubleshooting)
8. [Contract Details](#contract-details)

## Overview

The Ganjes DAO is a decentralized autonomous organization that allows token holders to propose and vote on funding projects. The system uses a proposal-based governance model where:

- **Proposers** create funding requests for their projects
- **Investors** vote by investing tokens in proposals they support
- **Successful proposals** receive funding from the DAO treasury
- **Failed proposals** allow investors to claim refunds

## Requirements

### For Creating Proposals

| Requirement | Amount | Purpose |
|-------------|--------|---------|
| **Minimum Token Balance** | 100 tokens | Ensures proposer has stake in DAO |
| **Proposal Deposit** | 100 tokens | Prevents spam, refunded if proposal fails |
| **Total Required** | 100 tokens | Deposited when creating proposal |

### Additional Constraints

- **Cooldown Period**: 1 hour between proposals per user
- **Maximum Proposals**: 10 proposals per user
- **Funding Goal Range**: 10 - 1,000,000 tokens
- **Voting Duration**: 5 minutes (configurable by admin)

## Creating Proposals

### Method 1: Interactive Script (Recommended)

```bash
npm run create-proposal
```

This launches an interactive CLI that guides you through:

1. **Account Verification**
   - Checks token balance
   - Validates proposal requirements
   - Shows current allowances

2. **Proposal Details Input**
   - Project name
   - Project URL
   - Funding goal (in tokens)
   - Detailed description

3. **Validation & Confirmation**
   - Input validation
   - Proposal summary review
   - Final confirmation

4. **Submission**
   - Automatic token approval if needed
   - Transaction submission
   - Confirmation and proposal ID

### Method 2: Test Proposal

```bash
npm run test-proposal
```

Creates a pre-configured test proposal with sample data for testing purposes.

### Method 3: Direct Contract Interaction

```solidity
function createProposal(
    string calldata _description, 
    string calldata _projectName,
    string calldata _projectUrl,
    uint256 _fundingGoal
) external
```

## Proposal Lifecycle

### 1. Creation Phase
```
User submits proposal → Deposit locked → Proposal ID assigned → Voting begins
```

**Requirements Met:**
- ✅ Sufficient token balance
- ✅ Approved token spending
- ✅ Valid funding goal
- ✅ Cooldown period passed
- ✅ Below maximum proposals

### 2. Voting Phase
```
Proposal active → Users vote + invest → Voting period ends
```

**Duration:** 5 minutes (default, admin configurable)

**Voting Rules:**
- Proposers cannot vote on their own proposals
- Minimum investment required to vote
- Vote weight = voter's token balance
- Investment locked until proposal execution

### 3. Execution Phase
```
Voting ends → Admin executes → Funds distributed OR refunds available
```

**Success Criteria (either one):**
1. **Funding Target Met**: Total investments ≥ funding goal
2. **Voting Success**: Quorum reached AND more votes for than against

**Outcomes:**
- **✅ Success**: Proposer receives funding + deposit refund
- **❌ Failure**: Investors can claim refunds, proposer can claim deposit

### 4. Post-Execution
```
Proposal executed → Funds claimed → Records updated
```

## Voting System

### How to Vote

Voting requires investing tokens in the proposal:

```solidity
function vote(
    uint256 _proposalId, 
    bool _support, 
    uint256 _investmentAmount
) external
```

### Voting Mechanics

| Parameter | Description |
|-----------|-------------|
| `_proposalId` | ID of proposal to vote on |
| `_support` | `true` for support, `false` for against |
| `_investmentAmount` | Tokens to invest (minimum required) |

### Vote Weight Calculation

```
Vote Weight = Voter's Total Token Balance
Investment = Separate token amount locked in proposal
```

### Investment Rules

- **Minimum**: Set by admin (default: 10 tokens)
- **Maximum**: Cannot exceed proposal funding goal
- **Lock Period**: Until proposal execution
- **Refund**: Available if proposal fails

## Scripts Usage

### Interactive Proposal Creation

```bash
npm run create-proposal
```

**Example Session:**
```
🚀 Ganjes DAO Proposal Creation Tool
===================================

📝 Using account: 0x073f5...b128
🏛️  DAO Contract: 0xd1F5...BAa8
💰 Token Contract: 0x538C...CAb

💳 Account Status:
  - Token Balance: 9,994,800.0 tokens
  - Required Deposit: 100.0 tokens
  - Min Tokens Required: 100.0 tokens

📋 Proposal Requirements:
  - Can Create Proposal: ✅
  - Has Min Tokens: ✅
  - Has Deposit Tokens: ✅
  - Has Allowance: ✅
  - Cooldown Passed: ✅
  - Below Max Proposals: ✅
  - Status: Ready to create proposal

📝 Please provide proposal details:

🎯 Project Name: My DeFi Project
🌐 Project URL: https://github.com/myproject/defi
💰 Funding Goal (in tokens): 1000
📄 Project Description: A revolutionary DeFi platform...

📋 Proposal Summary:
  - Project Name: My DeFi Project
  - Project URL: https://github.com/myproject/defi
  - Funding Goal: 1000.0 tokens
  - Required Deposit: 100.0 tokens

❓ Do you want to create this proposal? (yes/no): yes

⏳ Creating proposal...
🎉 Proposal Created Successfully!
  - Proposal ID: 2
  - Transaction Hash: 0x...
```

### Test Proposal Creation

```bash
npm run test-proposal
```

Creates a sample proposal automatically for testing.

### Help Information

```bash
npm run create-proposal help
```

Shows detailed help and requirements.

## Troubleshooting

### Common Issues

#### 1. Insufficient Token Balance
```
❌ Error: InsufficientTokens(100000000000000000000, 50000000000000000000)
```
**Solution**: Ensure you have at least 100 tokens in your wallet.

#### 2. Insufficient Allowance
```
❌ Error: InsufficientAllowance(100000000000000000000, 0)
```
**Solution**: The script will automatically approve tokens, or manually approve:
```javascript
await token.approve(daoAddress, ethers.parseEther("100"));
```

#### 3. Proposal Cooldown Active
```
❌ Error: ProposalCooldownActive(2847)
```
**Solution**: Wait for the cooldown period to end (shown in seconds).

#### 4. Maximum Proposals Reached
```
❌ Error: MaxProposalsReached(10)
```
**Solution**: You've reached the maximum of 10 proposals per user.

#### 5. Invalid Funding Goal
```
❌ Error: InvalidFundingGoal(5000000000000000000)
```
**Solution**: Ensure funding goal is between 10 and 1,000,000 tokens.

### Network Issues

#### 1. Wrong Network
Ensure you're connected to BSC Testnet:
```
RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
Chain ID: 97
```

#### 2. Gas Issues
If transactions fail due to gas:
```javascript
// Increase gas limit in transaction
const tx = await dao.createProposal(..., { gasLimit: 500000 });
```

### Contract Issues

#### 1. Contract Paused
```
❌ Error: ContractPaused()
```
**Solution**: Wait for admin to unpause the contract.

#### 2. Invalid Proposal ID
```
❌ Error: InvalidProposal(999)
```
**Solution**: Use valid proposal ID (1 to current proposal count).

## Contract Details

### Deployed Contracts

| Contract | Address | Network |
|----------|---------|---------|
| **Ganjes DAO** | `0xd1F5595bd570d82EEB3A425E9B6bC9d770C3BAa8` | BSC Testnet |
| **Governance Token** | `0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb` | BSC Testnet |

### Key Functions

#### Proposal Management
```solidity
// Create new proposal
function createProposal(string _description, string _projectName, string _projectUrl, uint256 _fundingGoal)

// Vote on proposal
function vote(uint256 _proposalId, bool _support, uint256 _investmentAmount)

// Execute proposal (admin only)
function executeProposal(uint256 _proposalId)

// Claim refund for failed proposal
function claimRefund(uint256 _proposalId)
```

#### View Functions
```solidity
// Get proposal details
function getProposal(uint256 _proposalId) returns (...)

// Check if user can create proposal
function checkProposalRequirements(address _proposer) returns (...)

// Get user's investment in proposal
function getUserInvestment(uint256 _proposalId, address _user) returns (...)

// Get DAO statistics
function getDAOStats() returns (...)
```

#### Token Management
```solidity
// Approve DAO to spend tokens
function approveDAO(uint256 _amount) returns (bool)

// Check allowance
function getDAOAllowance(address _owner) returns (uint256)
```

### Events

```solidity
event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string indexed projectName, uint256 fundingGoal, uint256 proposalDeposit, uint256 endTime, uint256 timestamp);

event Voted(uint256 indexed proposalId, address indexed voter, bool indexed support, uint256 weight, uint256 investmentAmount, uint256 timestamp);

event ProposalExecuted(uint256 indexed proposalId, bool passed, uint256 amountAllocated, uint256 timestamp);

event RefundClaimed(uint256 indexed proposalId, address indexed investor, uint256 amount, uint256 timestamp);
```

### Constants

```solidity
uint256 public constant MIN_TOKENS_FOR_PROPOSAL = 100 * 10**18;    // 100 tokens
uint256 public constant PROPOSAL_DEPOSIT_AMOUNT = 100 * 10**18;    // 100 tokens  
uint256 public constant MIN_FUNDING_GOAL = 10 * 10**18;            // 10 tokens
uint256 public constant MAX_FUNDING_GOAL = 1000000 * 10**18;       // 1M tokens
uint256 public constant PROPOSAL_COOLDOWN = 1 hours;               // 1 hour
uint256 public constant MIN_QUORUM_PERCENT = 50;                   // 50%
```

## Security Features

### Spam Prevention
- **Proposal Deposit**: 100 tokens locked per proposal
- **Cooldown Period**: 1 hour between proposals
- **Maximum Proposals**: 10 per user
- **Minimum Funding**: 10 tokens minimum

### Access Control
- **Admin Functions**: Restricted to authorized admins
- **Proposer Restrictions**: Cannot vote on own proposals
- **Voter Requirements**: Minimum token balance required

### Economic Security
- **Deposit Recovery**: Refunded for failed proposals
- **Investment Lock**: Tokens locked during voting
- **Refund Mechanism**: Available for failed proposals
- **Emergency Controls**: Admin pause/unpause functionality

## Best Practices

### For Proposers

1. **Prepare Clear Documentation**
   - Detailed project description
   - Valid project URL with documentation
   - Realistic funding goals

2. **Engage Community**
   - Share proposal details before creation
   - Respond to questions and feedback
   - Build support before voting begins

3. **Choose Appropriate Funding**
   - Not too low (minimum 10 tokens)
   - Not too high (maximum 1M tokens)
   - Realistic for project scope

### For Voters/Investors

1. **Due Diligence**
   - Review project documentation
   - Check proposer's history
   - Assess feasibility

2. **Investment Strategy**
   - Only invest what you can afford
   - Consider proposal success likelihood
   - Remember investments are locked until execution

3. **Active Participation**
   - Vote on proposals you evaluate
   - Engage with proposer for clarifications
   - Monitor proposal progress

## FAQ

### Q: How long does voting last?
**A:** Default is 5 minutes, but admins can configure this between 1 minute and 30 days.

### Q: Can I change my vote?
**A:** No, votes are final once submitted.

### Q: What happens if I don't vote?
**A:** Nothing, voting is optional. However, active participation helps the DAO ecosystem.

### Q: Can I vote on multiple proposals?
**A:** Yes, you can vote on as many proposals as you want (subject to token balance).

### Q: How do I get my deposit back?
**A:** For failed proposals, call `claimRefund()`. For successful proposals, deposits are automatically refunded.

### Q: Can admins vote?
**A:** Yes, admins can vote like any other token holder, but cannot vote on their own proposals.

### Q: What happens if the DAO runs out of funds?
**A:** Proposals requiring more funding than available will fail, but investors can still claim refunds.

---

## Support

For technical issues or questions:
- Check the troubleshooting section above
- Review the contract source code
- Contact the development team

**Contract Verification:**
- BSC Testnet Explorer: https://testnet.bscscan.com/
- DAO Contract: `0xd1F5595bd570d82EEB3A425E9B6bC9d770C3BAa8`
- Token Contract: `0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb`