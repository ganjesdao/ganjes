# GanjesDAO - BSC Testnet Deployment Guide

## Prerequisites

### 1. BSC Testnet Setup
- **Network Name**: BSC Testnet
- **RPC URL**: `https://data-seed-prebsc-1-s1.binance.org:8545/`
- **Chain ID**: `97`
- **Currency Symbol**: `tBNB`
- **Block Explorer**: `https://testnet.bscscan.com/`

### 2. Get Test BNB
- Visit: https://testnet.binance.org/faucet-smart
- Connect your wallet and request test BNB

### 3. Governance Token
You'll need an ERC20 token address for the constructor. Options:
- Deploy a test token first
- Use an existing BSC testnet token
- **Recommended Test Token**: BUSD Testnet `0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee`

## Deployment Steps in Remix

### Step 1: Configure Remix for BSC Testnet
1. Open Remix IDE (https://remix.ethereum.org)
2. Go to "Deploy & Run Transactions" tab
3. Change Environment to "Injected Provider - MetaMask"
4. Ensure MetaMask is connected to BSC Testnet
5. Select your deployment account

### Step 2: Upload Contract Files
Create this folder structure in Remix:
```
contracts/
├── interfaces/
│   ├── IERC20.sol
│   └── IGanjesDAO.sol
├── libraries/
│   └── ReentrancyGuard.sol
├── storage/
│   └── DAOStorage.sol
├── contracts/
│   ├── ProposalManager.sol
│   ├── VotingSystem.sol
│   └── FundManager.sol
└── GanjesDAO.sol
```

### Step 3: Compile Contracts
1. Select Solidity Compiler tab
2. Set compiler version to `0.8.20`
3. Compile all contracts in order:
   - interfaces/IERC20.sol
   - interfaces/IGanjesDAO.sol
   - libraries/ReentrancyGuard.sol
   - storage/DAOStorage.sol
   - contracts/ProposalManager.sol
   - contracts/VotingSystem.sol
   - contracts/FundManager.sol
   - GanjesDAO.sol

### Step 4: Deploy Main Contract
1. Select "Deploy & Run Transactions" tab
2. Choose `GanjesDAO` contract
3. Enter constructor parameter:
   - `_governanceToken`: Token contract address
4. Click "Deploy"
5. Confirm transaction in MetaMask

## Constructor Parameters

### Option 1: Use Existing Test Token
```
_governanceToken: 0xdB37969EF73c69E83bDD06A75d2186feFBD27D5e
```

### Option 2: Deploy Your Own Test Token First
Deploy a simple ERC20 token:
```solidity
// SimpleToken.sol
pragma solidity ^0.8.20;

contract SimpleToken {
    string public name = "Ganjes Test Token";
    string public symbol = "GTT";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10**18;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}
```

## Post-Deployment Verification

### 1. Check Contract on BSCScan
- Visit: https://testnet.bscscan.com/
- Search for your contract address
- Verify contract source code (optional)

### 2. Test Basic Functions
```javascript
// In Remix console or web3
// Check DAO balance
await contract.getDAOBalance()

// Check admin
await contract.admin()

// Check voting duration
await contract.votingDuration()

// Check min investment
await contract.minInvestmentAmount()
```

### 3. Initial Configuration
Set up the DAO parameters:
```javascript
// Set voting duration (5 minutes = 300 seconds)
await contract.setVotingDuration(300)

// Set minimum investment (10 tokens)
await contract.setMinInvestmentAmount("10000000000000000000")
```

## Gas Estimates (BSC Testnet)
- Contract Deployment: ~3,000,000 gas
- Create Proposal: ~200,000 gas
- Vote: ~150,000 gas
- Execute Proposal: ~100,000 gas

## Troubleshooting
1. **Out of Gas**: Increase gas limit to 5,000,000
2. **Compilation Error**: Check import paths are correct
3. **Transaction Failed**: Ensure sufficient tBNB balance
4. **MetaMask Issues**: Switch network and refresh page

## Contract Addresses (After Deployment)
- DAO Contract: `[YOUR_DEPLOYED_ADDRESS]`
- Governance Token: `[TOKEN_ADDRESS_USED]`
- Admin: `[YOUR_WALLET_ADDRESS]`

## Next Steps
1. Fund the DAO with governance tokens
2. Create test proposals
3. Test voting mechanism
4. Test proposal execution