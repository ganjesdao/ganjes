# 🚀 Quick Commands for Ganjes DAO

## 📋 View All Proposals
```bash
npm run get-proposals
```

## 🔍 View Specific Proposal

### Method 1: Using Environment Variable
```bash
PROPOSAL_ID=1 npm run view-proposal
PROPOSAL_ID=2 npm run view-proposal
```

### Method 2: Using Direct Script
```bash
node scripts/quickView.cjs 1
node scripts/quickView.cjs 2
```

### Method 3: Using Original Script (Fixed)
```bash
PROPOSAL_ID=1 npm run get-proposal-details
```

## 🆕 Create New Proposal
```bash
npm run create-proposal
```

## 🧪 Create Test Proposal
```bash
npm run test-proposal
```

## 🎯 Working Examples

### View Proposal #1 in Detail:
```bash
# Any of these work:
PROPOSAL_ID=1 npm run view-proposal
node scripts/quickView.cjs 1
PROPOSAL_ID=1 npm run get-proposal-details
```

### Get All Proposals with Filters:
```bash
# Basic list
npm run get-proposals

# Filter active proposals
npm run get-proposals -- --status active

# Sort by funding amount
npm run get-proposals -- --sort funding

# Show full descriptions
npm run get-proposals -- --show-description
```

## ⚡ Quick Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `npm run get-proposals` | List all proposals | `npm run get-proposals` |
| `PROPOSAL_ID=X npm run view-proposal` | View specific proposal | `PROPOSAL_ID=1 npm run view-proposal` |
| `node scripts/quickView.cjs X` | Quick proposal view | `node scripts/quickView.cjs 1` |
| `npm run create-proposal` | Create new proposal | `npm run create-proposal` |

## 🔧 Troubleshooting

### Error: "Unrecognized positional argument"
**Solution**: Use environment variable instead:
```bash
# ❌ This doesn't work
npm run view-proposal 1

# ✅ This works
PROPOSAL_ID=1 npm run view-proposal
# OR
node scripts/quickView.cjs 1
```

### Error: "Proposal doesn't exist"
**Solution**: Check available proposals first:
```bash
npm run get-proposals
```

### Error: "DAO_ADDRESS not set"
**Solution**: Set in .env file or use environment variable:
```bash
DAO_ADDRESS=0x123...abc PROPOSAL_ID=1 npm run view-proposal
```

## 📊 Sample Output

```
🔍 Fetching Details for Proposal #1
==================================================
📝 Using account: 0x073f...b128
🏛️  DAO Contract: 0xd1F5...BAa8

📋 BASIC INFORMATION
==============================
🆔 Proposal ID: #1
📛 Project Name: Ganjes DeFi Marketplace
👤 Proposer: 0x073f...b128
💰 Funding Goal: 500.0 tokens
💵 Proposal Deposit: 100.0 tokens
🔗 Project URL: https://github.com/ganjes/defi-marketplace

⏰ TIMING INFORMATION
==============================
📅 Voting Ends: 8/3/2025, 12:07:33 PM
⏳ Voting Period: ENDED
📊 Status: ⏳ PENDING EXECUTION

🗳️  VOTING STATISTICS
==============================
👍 Votes FOR: 0.0 vote weight (0 voters)
👎 Votes AGAINST: 0.0 vote weight (0 voters)
📊 Vote Distribution: No votes yet

💸 FUNDING INFORMATION
==============================
💰 Goal: 500.0 tokens
📈 Invested: 0.0 tokens
📊 Funding Progress: 0.0%
✅ Funding Goal Met: NO
```

## ✅ Issue Fixed!

The original error `Error HH308: Unrecognized positional argument 1` has been resolved with multiple solutions:

1. **Environment Variable Method**: `PROPOSAL_ID=1 npm run view-proposal`
2. **Direct Script Method**: `node scripts/quickView.cjs 1`
3. **Fixed Original Method**: `PROPOSAL_ID=1 npm run get-proposal-details`

All methods now work correctly! 🎉