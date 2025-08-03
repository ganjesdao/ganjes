# 🏛️ GanjesDAO Functions Reference

**Updated Contract Address:** `0x96200d82e180d09Ba12DCd25eefB14C5BE85def0`  
**Network:** BSC Testnet  
**Version:** 2.0 with Voting Duration Management  
**Date:** August 2, 2025

---

## 📋 Table of Contents

1. [Contract Overview](#contract-overview)
2. [Read Functions](#read-functions)
3. [Write Functions](#write-functions)
4. [Admin Functions](#admin-functions)
5. [Multi-Signature Functions](#multi-signature-functions)
6. [Testing Scripts](#testing-scripts)
7. [Constants & Configuration](#constants--configuration)

---

## 🔍 Contract Overview

### Key Features
- ✅ **Modular Architecture**: Separated into multiple contracts for better maintainability
- ✅ **3-Day Default Voting**: New proposals have 72-hour voting periods
- ✅ **Multi-Signature Security**: 2/3 approval required for admin actions
- ✅ **Voting Duration Management**: Admins can extend/reduce voting time
- ✅ **Investment-Based Voting**: Vote with token investment for skin in the game
- ✅ **Proposal Fee System**: Anti-spam mechanism with refunds for passed proposals
- ✅ **Emergency Pause**: Contract can be paused for security
- ✅ **Comprehensive Events**: Full audit trail of all operations

### Security Compliance
- ✅ **Audit Compliant**: Addresses all findings from security audit
- ✅ **Reentrancy Protection**: Custom guards on all functions
- ✅ **Voting Period Enforcement**: Fixed premature execution vulnerability
- ✅ **Block-Based Timing**: Secure timing mechanism
- ✅ **Multi-Sig Governance**: Decentralized admin control

---

## 📖 Read Functions

### Contract Status
```javascript
// Get overall contract status
const status = await dao.getContractStatus();
// Returns: isPaused, totalProposals, totalParameterProposals, totalMultiSigProposals, daoBalance, activeInvestorsCount
```

### Governance Parameters
```javascript
// Get current governance settings
const params = await dao.getGovernanceParameters();
// Returns: minInvestmentAmount, minTokensForProposal, minVotingTokens, minQuorumPercent, votingDuration

// Get voting duration configuration
const durationInfo = await dao.getVotingDurationInfo();
// Returns: defaultDurationBlocks, defaultDurationSeconds, minDurationBlocks, maxDurationBlocks, currentVotingDuration
```

### Proposal Information
```javascript
// Get all proposal IDs
const proposalIds = await dao.getAllProposalIds();

// Get basic proposal details
const basicDetails = await dao.getProposalBasicDetails(proposalId);
// Returns: id, proposer, description, projectName, projectUrl, fundingGoal, endBlock, executed, passed

// Get voting details
const votingDetails = await dao.getProposalVotingDetails(proposalId);
// Returns: totalVotesFor, totalVotesAgainst, votersFor, votersAgainst, totalInvested

// Check if proposal is active
const isActive = await dao.isProposalActive(proposalId);

// Get timing information
const currentBlock = await dao.getCurrentBlock();
const blocksUntilEnd = await dao.getBlocksUntilEnd(proposalId);
const timeUntilEnd = await dao.estimateTimeUntilEnd(proposalId);

// Get proposal fee
const proposalFee = await dao.getProposalFee(proposalId);
```

### Multi-Signature Information
```javascript
// Check if address is admin
const isAdmin = await dao.isOwner(address);

// Get required approvals
const required = await dao.getRequiredApprovals();

// Get multi-sig proposal details
const multiSigDetails = await dao.getMultiSigProposalDetails(proposalId);
// Returns: id, proposer, action, value, target, approvals, executed
```

### Financial Information
```javascript
// Get DAO token balance
const balance = await dao.getDAOBalance();

// Get total funded amount
const totalFunded = await dao.getTotalFundedAmount();

// Get funding record
const record = await dao.getFundingRecord(recordId);
// Returns: proposalId, recipient, amount, blockNumber
```

---

## ✍️ Write Functions

### Token Operations
```javascript
// Deposit tokens to DAO
await dao.deposit(amount);
```

### Proposal Creation
```javascript
// Create funding proposal
await dao.createProposal(description, projectName, projectUrl, fundingGoal);
```

### Voting
```javascript
// Vote on proposal with investment
await dao.vote(proposalId, support, investmentAmount);
```

### Refunds
```javascript
// Refund investments from failed proposals
await dao.refundInvestments(proposalId);
```

---

## 👑 Admin Functions

### Proposal Management
```javascript
// Execute proposal (admin only)
await dao.executeProposal(proposalId);

// Refund proposal fee for failed proposals (admin only)
await dao.refundProposalFee(proposalId);
```

### Voting Duration Management ⭐ **NEW**
```javascript
// Increase voting duration (admin only)
await dao.increaseVotingDuration(proposalId, additionalSeconds);

// Decrease voting duration (admin only)
await dao.decreaseVotingDuration(proposalId, reductionSeconds);
```

### Parameter Proposals
```javascript
// Create parameter change proposal (admin only)
await dao.createParameterProposal(parameterName, newValue, description);

// Execute parameter proposal (admin only)
await dao.executeParameterProposal(proposalId);
```

---

## 🔐 Multi-Signature Functions

### Multi-Sig Proposal Management
```javascript
// Create multi-sig proposal (admin only)
await dao.createMultiSigProposal(action, value, target);

// Approve multi-sig proposal (admin only)
await dao.approveMultiSigProposal(proposalId);

// Execute multi-sig proposal (admin only)
await dao.executeMultiSigProposal(proposalId);
```

### Available Multi-Sig Actions
- `"pause"` - Emergency pause contract
- `"unpause"` - Resume contract operations
- `"increaseVotingDuration"` - Extend proposal voting time
- `"decreaseVotingDuration"` - Reduce proposal voting time
- `"executeProposal"` - Execute passed proposals
- `"emergencyExecute"` - Emergency proposal execution

---

## 🧪 Testing Scripts

### Quick Test Commands
```bash
# Test all read functions
npm run test:read

# Test all write functions
npm run test:write

# Test multi-signature functions
npm run test:multisig

# Test voting duration management
npm run test:duration

# Test proposal creation
npm run test:proposal

# Test voting system
npm run test:voting

# Check proposal status
npm run check:proposal
```

### Individual Script Files
- `scripts/dao-read-functions.js` - Comprehensive read function testing
- `scripts/dao-write-functions.js` - All write function demonstrations
- `scripts/dao-multisig-functions.js` - Multi-sig operations testing
- `scripts/test-voting-duration.js` - Voting duration management testing
- `scripts/test-proposal.js` - Proposal creation testing
- `scripts/test-voting.js` - Voting system testing
- `scripts/check-proposal.js` - Proposal status monitoring

---

## ⚙️ Constants & Configuration

### Default Values
```javascript
DEFAULT_VOTING_DURATION = 3 days (72 hours)
MIN_VOTING_DURATION = 5 minutes
MAX_VOTING_DURATION = 30 days
MIN_INVESTMENT_AMOUNT = 10 tokens
MIN_TOKENS_FOR_PROPOSAL = 100 tokens
MIN_VOTING_TOKENS = 10 tokens
MIN_QUORUM_PERCENT = 50%
REQUIRED_MULTI_SIG_APPROVALS = 2/3
```

### Admin Addresses
- `0x073f5395476468e4fc785301026607bc4ebab128` ✅
- `0xc55999C2D16dB17261c7140963118efaFb64F897` ✅
- `0x891fc568C192832D5Ce12C66e95bC47aF5aE8A8F` ✅

### Contract Addresses
- **DAO Contract**: `0x96200d82e180d09Ba12DCd25eefB14C5BE85def0`
- **Token Contract**: `0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb`

---

## 🔗 Useful Links

- **BSC Testnet Explorer**: https://testnet.bscscan.com/address/0x96200d82e180d09Ba12DCd25eefB14C5BE85def0
- **Token Contract**: https://testnet.bscscan.com/address/0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb
- **BSC Testnet Faucet**: https://testnet.binance.org/faucet-smart

---

## 📝 Usage Examples

### Create a Proposal
```javascript
// 1. Approve proposal fee
await token.approve(daoAddress, proposalFee);

// 2. Create proposal
await dao.createProposal(
  "Fund Mobile App Development",
  "GanjesDAO Mobile App",
  "https://github.com/ganjes-dao/mobile-app",
  ethers.parseEther("1000")
);
```

### Vote on a Proposal
```javascript
// 1. Approve investment amount
await token.approve(daoAddress, investmentAmount);

// 2. Cast vote with investment
await dao.vote(proposalId, true, ethers.parseEther("50"));
```

### Extend Voting Time (Admin)
```javascript
// Add 24 hours to proposal voting period
await dao.increaseVotingDuration(proposalId, 86400);
```

### Multi-Sig Pause Contract (Admin)
```javascript
// 1. Create pause proposal
await dao.createMultiSigProposal("pause", 0, "0x0000000000000000000000000000000000000000");

// 2. Other admins approve
await dao.approveMultiSigProposal(multiSigProposalId);

// 3. Execute when enough approvals
await dao.executeMultiSigProposal(multiSigProposalId);
```

---

## ⚠️ Important Notes

1. **Admin Functions**: Require multi-signature approval (2/3 owners)
2. **Proposal Fees**: 100 tokens per proposal (refunded if passed)
3. **Voting Investment**: Minimum 10 tokens per vote
4. **Voting Duration**: Default 3 days, adjustable by admins
5. **Security**: All functions have reentrancy protection
6. **Timing**: Uses block numbers for secure timing
7. **Emergency**: Contract can be paused by multi-sig

---

**🎉 DAO 2.0 is fully deployed and operational with comprehensive voting duration management!**