# Ganjes DAO Smart Contracts

A decentralized autonomous organization (DAO) for community-driven project funding with token-based governance.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- MetaMask or Web3 wallet
- BSC Testnet BNB for gas fees
- **Existing ERC20 token** for DAO governance

### Installation
```bash
# Clone and install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and set your PRIVATE_KEY and TOKEN_ADDRESS (existing ERC20 token)

# Compile contracts
npm run compile

# Deploy DAO contract to BSC Testnet
npm run deploy:optimized
```

### Create Your First Proposal
```bash
# Interactive proposal creation
npm run create-proposal

# Or create a test proposal
npm run test-proposal
```

## 📋 Overview

The Ganjes DAO enables:
- **Proposal Creation**: Submit funding requests for projects
- **Token-Based Voting**: Vote by investing tokens in proposals
- **Automated Execution**: Smart contract handles fund distribution
- **Refund Mechanism**: Get investments back from failed proposals

## 🏗 Architecture

### Core Contracts

| Contract | Purpose | Location |
|----------|---------|----------|
| `GanjesDAOOptimized.sol` | Main DAO logic | `contracts/` |
| `ProposalManagement.sol` | Proposal handling | `contracts/modules/` |
| `IERC20.sol` | Token interface | `contracts/interfaces/` |
| `ReentrancyGuard.sol` | Security library | `contracts/libraries/` |
| `Pausable.sol` | Emergency controls | `contracts/libraries/` |

**Note**: DAO works with any existing ERC20 token specified during deployment.

### Key Features

- **Security**: ReentrancyGuard, Pausable, Access Control
- **Efficiency**: Gas-optimized operations
- **Transparency**: Comprehensive event logging
- **Flexibility**: Admin-configurable parameters

## 💰 Economics

### Proposal Creation
- **Required Tokens**: 100 tokens minimum balance
- **Deposit**: 100 tokens (refunded if proposal fails)
- **Funding Range**: 10 - 1,000,000 tokens

### Voting System
- **Vote Weight**: Based on token balance
- **Investment**: Separate token amount locked in proposal
- **Minimum Investment**: 10 tokens (configurable)

### Success Criteria
Proposals pass by either:
1. **Funding Target**: Total investments ≥ funding goal
2. **Voting Majority**: Quorum + more support than opposition

## 🛠 Scripts & Tools

### Development Scripts
```bash
npm run compile          # Compile smart contracts
npm run test            # Run test suite
npm run clean           # Clean build artifacts
npm run node            # Start local Hardhat node
```

### Deployment Scripts
```bash
npm run deploy          # Deploy to BSC Testnet
npm run deploy:optimized # Deploy optimized version
npm run verify          # Verify contracts on BSCScan
```

### Proposal Scripts
```bash
npm run create-proposal  # Interactive proposal creation
npm run test-proposal   # Create test proposal
npm run create-proposal help # Show help
```

### Utility Scripts
```bash
node scripts/diagnostics.js    # Check contract health
node scripts/updateEnv.js      # Update environment config
```

## 📖 Documentation

- **[Proposal Creation Guide](PROPOSAL_GUIDE.md)** - Complete guide for creating and managing proposals
- **[API Reference](docs/API.md)** - Contract function documentation
- **[Security Audit](docs/SECURITY.md)** - Security considerations and audit results

## 🔗 Deployed Contracts

### BSC Testnet
- **DAO Contract**: `0xd1F5595bd570d82EEB3A425E9B6bC9d770C3BAa8`
- **Token Contract**: `0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb`
- **Network**: BSC Testnet (Chain ID: 97)
- **RPC**: `https://data-seed-prebsc-1-s1.binance.org:8545/`

### Contract Verification
- [DAO on BSCScan](https://testnet.bscscan.com/address/0xd1F5595bd570d82EEB3A425E9B6bC9d770C3BAa8)
- [Token on BSCScan](https://testnet.bscscan.com/address/0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb)

## 🔧 Configuration

### Environment Variables
```bash
# Network Configuration
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
PRIVATE_KEY=your_private_key_here

# Contract Addresses
TOKEN_ADDRESS=0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb
DAO_ADDRESS=0xd1F5595bd570d82EEB3A425E9B6bC9d770C3BAa8

# Admin Addresses
ADMIN_1=0x073f5395476468e4fc785301026607bc4ebab128
ADMIN_2=0xc55999C2D16dB17261c7140963118efaFb64F897
ADMIN_3=0x891fc568C192832D5Ce12C66e95bC47aF5aE8A8F

# Gas Configuration
GAS_LIMIT=8000000
GAS_PRICE=5000000000

# API Keys
BSCSCAN_API_KEY=your_api_key_here
```

### DAO Parameters
```solidity
MIN_TOKENS_FOR_PROPOSAL = 100 tokens    // Min balance to create proposals
PROPOSAL_DEPOSIT_AMOUNT = 100 tokens     // Deposit per proposal
MIN_FUNDING_GOAL = 10 tokens            // Minimum funding request
MAX_FUNDING_GOAL = 1M tokens            // Maximum funding request
PROPOSAL_COOLDOWN = 1 hour              // Time between proposals
MAX_PROPOSALS_PER_USER = 10             // Max proposals per user
MIN_QUORUM_PERCENT = 50%                // Voting quorum requirement
```

## 🔒 Security Features

### Access Control
- **Multi-Admin System**: Multiple authorized administrators
- **Role-Based Permissions**: Different permission levels
- **Admin Limits**: Maximum 10 admins, cannot remove primary admin

### Economic Security
- **Proposal Deposits**: Prevents spam proposals
- **Investment Locks**: Tokens locked during voting
- **Refund Mechanisms**: Protect investor funds
- **Emergency Controls**: Admin pause/unpause capabilities

### Technical Security
- **ReentrancyGuard**: Prevents reentrancy attacks
- **Input Validation**: Comprehensive parameter checking
- **Custom Errors**: Gas-efficient error handling
- **Event Logging**: Complete audit trail

## 📊 Usage Examples

### Creating a Proposal
```javascript
// Using the interactive script
npm run create-proposal

// Direct contract interaction
const tx = await dao.createProposal(
    "Building a DeFi lending platform with innovative features...",
    "DeFi Lender Pro",
    "https://github.com/myproject/defi-lender",
    ethers.parseEther("1000") // 1000 tokens
);
```

### Voting on Proposals
```javascript
// Vote in support with 50 token investment
const tx = await dao.vote(
    1,                           // Proposal ID
    true,                        // Support
    ethers.parseEther("50")      // Investment amount
);
```

### Checking Proposal Status
```javascript
// Get comprehensive proposal info
const proposal = await dao.getProposal(1);
console.log(`Proposal: ${proposal.projectName}`);
console.log(`Funding Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
console.log(`Total Invested: ${ethers.formatEther(proposal.totalInvested)} tokens`);
console.log(`Votes For: ${proposal.votersFor}`);
console.log(`Votes Against: ${proposal.votersAgainst}`);
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/GanjesDAO.test.js

# Run tests with gas reporting
REPORT_GAS=true npm run test
```

### Test Coverage
```bash
# Generate coverage report
npx hardhat coverage
```

### Local Testing
```bash
# Start local node
npm run node

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Run tests against local deployment
npm run test:local
```

## 🚨 Troubleshooting

### Common Issues

1. **"Insufficient tokens" Error**
   - Ensure you have at least 100 tokens
   - Check token balance: `await token.balanceOf(address)`

2. **"Insufficient allowance" Error**
   - Approve DAO to spend tokens: `await token.approve(daoAddress, amount)`
   - Or use the automatic approval in scripts

3. **"Proposal cooldown active" Error**
   - Wait for cooldown period to end (1 hour between proposals)
   - Check remaining time: `await dao.getTimeUntilNextProposal(address)`

4. **Network Issues**
   - Verify BSC Testnet connection
   - Check RPC URL in environment
   - Ensure sufficient BNB for gas fees

### Getting Help

1. Check the [Proposal Guide](PROPOSAL_GUIDE.md) for detailed instructions
2. Review contract source code for function details
3. Check BSCScan for transaction details
4. Contact development team for support

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Compile contracts
npm run compile

# Run tests
npm run test
```

### Code Style
- Solidity: Follow OpenZeppelin standards
- JavaScript: ESLint configuration included
- Documentation: Update docs for new features

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Update documentation
5. Submit pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [Ganjes DAO](https://ganjes.org)
- **GitHub**: [Repository](https://github.com/ganjes/dao-contracts)
- **Documentation**: [Full Docs](https://docs.ganjes.org)
- **Community**: [Discord](https://discord.gg/ganjes)

## 📞 Support

- **Technical Issues**: Create an issue on GitHub
- **General Questions**: Join our Discord
- **Security Concerns**: security@ganjes.org

---

**Built with ❤️ by the Ganjes Team**