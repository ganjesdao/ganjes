# GanjesDAO - Modular DAO Smart Contract

A comprehensive, security-focused DAO implementation with modular architecture for funding proposals, governance, and multi-signature management.

## 🏗️ Architecture

### Modular Design
The codebase has been refactored from a monolithic contract into a modular architecture:

```
contracts/
├── interfaces/
│   ├── IERC20.sol                 # Standard ERC20 interface
│   └── IDAOStructs.sol           # All DAO data structures
├── libraries/
│   └── DAOConstants.sol          # Configuration constants
├── base/
│   ├── Security.sol              # ReentrancyGuard, Pausable, MultiSig
│   ├── ProposalManager.sol       # Funding proposals management
│   ├── MultiSigManager.sol       # Multi-signature operations
│   └── ParameterManager.sol      # Governance parameter updates
├── GanjesDAO.sol                 # Main contract inheriting all modules
└── MockERC20.sol                 # Test token implementation
```

## 🔐 Security Features

✅ **Multi-Signature Governance**: 3-10 owners, configurable approval threshold  
✅ **Reentrancy Protection**: Custom guard on all state-changing functions  
✅ **Pausable Operations**: Emergency pause/unpause capability  
✅ **Voting Period Enforcement**: Critical fix preventing premature execution  
✅ **Token Validation**: Minimum balance requirements for proposals/voting  
✅ **Proposal Fees**: Anti-spam mechanism with refunds for successful proposals  
✅ **Block-based Timing**: More secure than timestamp-based timing  

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Compilation
```bash
npm run compile
```

### Testing
```bash
npm run test
```

### Deployment
```bash
# Local network
npm run node      # Terminal 1
npm run deploy    # Terminal 2

# Specific network
npm run deploy:localhost
```

## 📋 Contract Features

### 1. Funding Proposals
- **Creation**: Token holders can create funding proposals with fees
- **Voting**: Investment-based voting with minimum thresholds
- **Execution**: Automatic execution after voting period with proper validation
- **Refunds**: Investment refunds for failed proposals

### 2. Governance Parameters
- **Dynamic Configuration**: Voting duration, quorum thresholds, token requirements
- **Parameter Proposals**: Community-driven parameter updates
- **Validation**: Range checks and security constraints

### 3. Multi-Signature Management
- **Admin Operations**: Pause/unpause, emergency execution, parameter updates
- **Approval System**: M-of-N signature requirement
- **Emergency Functions**: Critical operations during pause state

### 4. Investment Management
- **Fee System**: Proposal creation fees with refund mechanism
- **Investment Tracking**: Individual investment records per proposal
- **Activity Monitoring**: Investor activity and status tracking

## 🔧 Configuration

### Default Parameters
- **Min Tokens for Proposal**: 100 tokens
- **Min Voting Tokens**: 10 tokens  
- **Min Quorum**: 50%
- **Min Investment**: 10 tokens
- **Voting Duration**: 5 minutes (configurable)

### Time Constants
- **Average Block Time**: 12 seconds
- **Min Voting Duration**: 5 minutes (~25 blocks)
- **Max Voting Duration**: 30 days (~216,000 blocks)
- **Inactivity Period**: 90 days (~648,000 blocks)

## 📊 Events & Monitoring

### Key Events
```solidity
event ProposalCreated(uint256 indexed proposalId, address indexed proposer, ...);
event Voted(uint256 indexed proposalId, address indexed voter, bool support, ...);
event ProposalExecuted(uint256 indexed proposalId, bool passed, ...);
event ProposalFeeCollected/Refunded(uint256 indexed proposalId, ...);
event MultiSigProposalCreated/Executed(uint256 indexed proposalId, ...);
event Paused/Unpaused(address indexed owner, ...);
```

### Off-Chain Indexing
For large-scale DAOs, implement off-chain indexing using:
- **The Graph Protocol**
- **SubQuery** 
- **Custom event indexers**

Index these events for efficient querying:
- `ProposalCreated`, `ProposalExecuted`
- `InvestorDeactivated`, `Voted`
- All multi-sig and parameter events

## 🔍 View Functions

### Proposal Information
```solidity
getProposalBasicDetails(uint256 proposalId)
getProposalVotingDetails(uint256 proposalId)
isProposalActive(uint256 proposalId)
getBlocksUntilEnd(uint256 proposalId)
```

### DAO Status
```solidity
getContractStatus()
getDAOBalance()
getGovernanceParameters()
getTotalFundedAmount()
```

### Fee Management
```solidity
getProposalFee(uint256 proposalId)
getTotalProposalFeesPaid(address proposer)
getCurrentProposalFeeAmount()
```

## 🛡️ Security Audit Compliance

This implementation addresses all findings from the security audit:

1. ✅ **Solidity Pragma**: Fixed to ^0.8.24
2. ✅ **Centralization Risk**: Multi-sig governance implemented
3. ✅ **Pause Mechanism**: Full pausable functionality
4. ✅ **Voting Period**: Critical timing enforcement fix
5. ✅ **Reentrancy**: Custom guard implementation
6. ✅ **Token Validation**: Strengthened holder requirements
7. ✅ **Gas Optimization**: Paginated queries, bounded iterations
8. ✅ **Investment Handling**: Comprehensive refund mechanisms

## 📝 Usage Examples

### Creating a Proposal
```javascript
// Approve tokens for proposal fee
await token.approve(dao.address, proposalFee);

// Create proposal
await dao.createProposal(
  "Fund Development Team",
  "Core Development", 
  "https://project.com",
  ethers.utils.parseEther("1000")
);
```

### Voting on Proposal
```javascript
// Approve investment amount
await token.approve(dao.address, investmentAmount);

// Vote with investment
await dao.vote(proposalId, true, investmentAmount);
```

### Multi-Sig Operations
```javascript
// Create admin proposal
await dao.createMultiSigProposal("pause", 0, ethers.constants.AddressZero);

// Approve proposal (requires multiple owners)
await dao.approveMultiSigProposal(proposalId);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- **Documentation**: [Link to docs]
- **Security Audit**: Available in `security_audit_report.pdf`
- **Governance Forum**: [Link to governance]
- **Discord**: [Link to community]