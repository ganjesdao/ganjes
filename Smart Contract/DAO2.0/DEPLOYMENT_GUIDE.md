# GanjesDAO Deployment & Verification Guide

This guide provides step-by-step commands to deploy and verify the GanjesDAO contract on BSC Testnet/Mainnet.

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **npm** or **yarn**
3. **BSC Testnet BNB** for gas fees
4. **BSCScan API Key** for verification

## ⚙️ Environment Setup

### 1. Clone and Install Dependencies
```bash
cd "/Users/ramavatarrai/Desktop/React_projects/Ganjes/Smart Contract/DAO2.0"
npm install
```

### 2. Configure Environment Variables
Create/edit `.env` file:
```bash
# Network Configuration
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/  # BSC Testnet
# RPC_URL=https://bsc-dataseed1.binance.org/              # BSC Mainnet

# Deployer Private Key (Keep this secret!)
PRIVATE_KEY=your_private_key_here

# Governance Token Contract Address
TOKEN_ADDRESS=0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb

# Multi-sig Admin Addresses (minimum 3 required)
ADMIN_1=0x073f5395476468e4fc785301026607bc4ebab128 
ADMIN_2=0xc55999C2D16dB17261c7140963118efaFb64F897
ADMIN_3=0x891fc568C192832D5Ce12C66e95bC47aF5aE8A8F

# Multi-signature Requirements
REQUIRED_SIGNATURES=2

# Gas Configuration
GAS_LIMIT=8000000
GAS_PRICE=5000000000  # 5 gwei

# BSCScan API Key for verification
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

### 3. Get Testnet BNB
```bash
# Visit BSC Testnet Faucet
open https://testnet.binance.org/faucet-smart
```

## 🚀 Deployment Commands

### Compile Contracts
```bash
npm run compile
```

### Deploy to BSC Testnet
```bash
npm run deploy:bsc
```

### Deploy to BSC Mainnet
```bash
npm run deploy:bsc-mainnet
```

### Deploy to Local Network
```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy locally
npm run deploy:localhost
```

## 🔍 Verification Commands

### Verify on BSC Testnet
```bash
npm run verify:dao
```

### Manual Verification (if automated fails)
```bash
npx hardhat verify --network bscTestnet \
  CONTRACT_ADDRESS \
  "TOKEN_ADDRESS" \
  "[\"ADMIN1\",\"ADMIN2\",\"ADMIN3\"]" \
  REQUIRED_SIGNATURES
```

**Example:**
```bash
npx hardhat verify --network bscTestnet \
  0x3aB24B47Dc4F4f7af154BEC8eDD290f49555A951 \
  "0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb" \
  "[\"0x073f5395476468e4fc785301026607bc4ebab128\",\"0xc55999C2D16dB17261c7140963118efaFb64F897\",\"0x891fc568C192832D5Ce12C66e95bC47aF5aE8A8F\"]" \
  2
```

## 📊 Available Scripts

```bash
# Compilation
npm run compile          # Compile all contracts
npm run clean           # Clean artifacts and cache

# Deployment
npm run deploy          # Deploy to Hardhat local network
npm run deploy:localhost # Deploy to localhost
npm run deploy:bsc      # Deploy to BSC Testnet
npm run deploy:bsc-mainnet # Deploy to BSC Mainnet

# Verification
npm run verify:dao      # Verify DAO contract on BSCScan

# Testing
npm run test           # Run test suite
npm run node           # Start local Hardhat network
```

## 📝 Step-by-Step Deployment Process

### 1. Pre-deployment Checks
```bash
# Check account balance
npx hardhat console --network bscTestnet
> const balance = await ethers.provider.getBalance("YOUR_ADDRESS")
> console.log("Balance:", ethers.formatEther(balance), "BNB")
```

### 2. Deploy Contract
```bash
npm run deploy:bsc
```

**Expected Output:**
```
🏛️  Deploying GanjesDAO to BSC Testnet...
=========================================
Deploying with account: 0x073f5395476468E4fC785301026607bc4ebab128
Account balance: 0.183910014936 BNB

📋 Configuration:
Network: bscTestnet
Chain ID: 97n
Token Address: 0x538Cbe33fc06d67f6Cbb43EfcF6618f3a41BACAb
Admin Addresses: [...]
Required Signatures: 2

✅ GanjesDAO deployed to: 0x3aB24B47Dc4F4f7af154BEC8eDD290f49555A951

🎉 DAO DEPLOYMENT SUCCESSFUL!
```

### 3. Verify Contract
```bash
npm run verify:dao
```

**Expected Output:**
```
🔍 Verifying GanjesDAO contract on BSCScan...
📤 Submitting verification...
✅ Contract verified successfully!
🔗 View on BSCScan: https://testnet.bscscan.com/address/0x...#code
```

### 4. Update Environment
```bash
# Add deployed address to .env
echo "DAO_ADDRESS=0x3aB24B47Dc4F4f7af154BEC8eDD290f49555A951" >> .env
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. Gas Estimation Failed
```bash
# Increase gas limit in .env
GAS_LIMIT=10000000
GAS_PRICE=10000000000
```

#### 2. Network Connection Issues
```bash
# Try different RPC endpoints
RPC_URL=https://data-seed-prebsc-2-s1.binance.org:8545/
# or
RPC_URL=https://data-seed-prebsc-1-s2.binance.org:8545/
```

#### 3. Verification Timeout
```bash
# Wait 5-10 minutes after deployment, then retry
sleep 300
npm run verify:dao
```

#### 4. Invalid Constructor Arguments
```bash
# Check .env values are correct
cat .env | grep -E "(TOKEN_ADDRESS|ADMIN_|REQUIRED_SIGNATURES)"
```

#### 5. Insufficient Balance
```bash
# Check balance
npx hardhat console --network bscTestnet
> const [signer] = await ethers.getSigners()
> console.log(await ethers.provider.getBalance(signer.address))

# Get more testnet BNB
open https://testnet.binance.org/faucet-smart
```

## 🌐 Network Configurations

### BSC Testnet
- **Chain ID:** 97
- **RPC URL:** https://data-seed-prebsc-1-s1.binance.org:8545/
- **Explorer:** https://testnet.bscscan.com
- **Faucet:** https://testnet.binance.org/faucet-smart

### BSC Mainnet
- **Chain ID:** 56
- **RPC URL:** https://bsc-dataseed1.binance.org/
- **Explorer:** https://bscscan.com

## 📱 Quick Commands Reference

```bash
# One-liner deployment to BSC Testnet
cd "/Users/ramavatarrai/Desktop/React_projects/Ganjes/Smart Contract/DAO2.0" && npm run compile && npm run deploy:bsc

# One-liner verification
npm run verify:dao

# Check deployment status
npx hardhat console --network bscTestnet
> const dao = await ethers.getContractAt("GanjesDAO", "DEPLOYED_ADDRESS")
> console.log(await dao.getContractStatus())
```

## 🎯 Post-Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Contract verified on BSCScan
- [ ] Multi-sig owners configured correctly
- [ ] Required signatures set properly
- [ ] Token address linked correctly
- [ ] Update frontend with new contract address
- [ ] Test basic functions (create proposal, vote)
- [ ] Set up monitoring/alerts
- [ ] Document contract addresses
- [ ] Backup deployment artifacts

## 🔗 Useful Links

- **BSC Testnet Explorer:** https://testnet.bscscan.com
- **BSC Mainnet Explorer:** https://bscscan.com
- **BSC Testnet Faucet:** https://testnet.binance.org/faucet-smart
- **Hardhat Documentation:** https://hardhat.org/docs
- **BSCScan API Documentation:** https://docs.bscscan.com

---

💡 **Pro Tip:** Always test on BSC Testnet before deploying to Mainnet!