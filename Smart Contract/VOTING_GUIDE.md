# 🗳️ Ganjes DAO Voting Guide

## 📋 How to Vote on Proposals

### Method 1: Interactive Voting (Recommended)
```bash
npm run vote-proposal
```

**Features:**
- ✅ Shows all active proposals
- ✅ Interactive prompts for all parameters
- ✅ Validates all inputs before submission
- ✅ Displays proposal details and voting statistics
- ✅ Confirms transaction before submission

### Method 2: Quick Vote with Environment Variables
```bash
PROPOSAL_ID=1 VOTE_CHOICE=for INVESTMENT_AMOUNT=50 npm run vote-proposal
```

### Method 3: Direct Command Line
```bash
node scripts/quickVote.cjs 1 for 50
node scripts/quickVote.cjs 2 against 25
```

## 📊 Voting Requirements

### To Vote You Need:
- ✅ **Minimum token balance** (default: 10 tokens)
- ✅ **Tokens for investment** (locked until proposal execution)
- ✅ **Active proposal** (voting period not ended)
- ✅ **Not be the proposer** (can't vote on own proposals)
- ✅ **Haven't voted already** (one vote per proposal)

### Voting Mechanics:
- **Vote Weight**: Based on your total token balance
- **Investment**: Separate token amount locked in proposal
- **Support Options**: FOR or AGAINST
- **Voting Period**: Set by admin (default: 5 minutes)

## 🎯 Voting Examples

### Interactive Mode:
```bash
npm run vote-proposal
```

**Sample Session:**
```
🗳️  Ganjes DAO Voting System
============================

📝 Voting account: 0x123...abc
💳 Your Token Balance: 1000.0 tokens
💵 Minimum Investment: 10.0 tokens

🗳️  ACTIVE PROPOSALS:
==================================================

📋 Proposal #1
   📛 Project: Ganjes DeFi Marketplace
   👤 Proposer: 0x456...def
   💰 Goal: 500.0 tokens
   📈 Invested: 0.0 tokens
   ⏰ Time Left: 2h 30m
   🗳️  Status: 🟢 Available to vote

📋 Proposal #2
   📛 Project: NFT Trading Platform
   👤 Proposer: 0x789...ghi
   💰 Goal: 1000.0 tokens
   📈 Invested: 250.0 tokens
   ⏰ Time Left: 1h 15m
   🗳️  Status: 🟢 Available to vote

🆔 Enter Proposal ID to vote on: 1
🗳️  Your vote (for/against): for
💰 Investment amount (min 10.0 tokens): 50

📊 Vote Summary:
   🆔 Proposal ID: #1
   📛 Project: Ganjes DeFi Marketplace
   🗳️  Vote: FOR
   💰 Investment: 50.0 tokens
   📊 Vote Weight: 1000.0 tokens

❓ Confirm your vote? (yes/no): yes

🔐 Approving DAO to spend tokens...
✅ Token approval confirmed
🗳️  Submitting your vote...
⏳ Waiting for transaction confirmation...

🎉 Vote Successfully Submitted!
```

### Quick Command Line:
```bash
# Vote FOR proposal #1 with 50 tokens
node scripts/quickVote.cjs 1 for 50

# Vote AGAINST proposal #2 with 25 tokens  
node scripts/quickVote.cjs 2 against 25

# Vote FOR proposal #3 with 100 tokens
node scripts/quickVote.cjs 3 for 100
```

### Environment Variable Method:
```bash
# Vote FOR proposal #1 with 50 tokens
PROPOSAL_ID=1 VOTE_CHOICE=for INVESTMENT_AMOUNT=50 npm run vote-proposal

# Vote AGAINST proposal #2 with 25 tokens
PROPOSAL_ID=2 VOTE_CHOICE=against INVESTMENT_AMOUNT=25 npm run vote-proposal
```

## 📈 Understanding Vote Results

### Vote Weight vs Investment:
- **Vote Weight**: Your total token balance (determines voting power)
- **Investment**: Tokens you lock in the proposal (shows commitment)
- **Example**: 1000 tokens balance = 1000 vote weight, 50 token investment

### Proposal Success Criteria:
A proposal passes if **either** condition is met:

1. **Funding Target**: Total investments ≥ funding goal
2. **Voting Majority**: 
   - Quorum reached (50% of total supply voting)
   - More votes FOR than AGAINST

### After Voting:
- **✅ Proposal Passes**: 
  - Proposer receives funding
  - Your investment goes to proposer
  - Proposer's deposit is refunded

- **❌ Proposal Fails**: 
  - You can claim your investment back
  - Proposer can claim deposit back
  - Use `claimRefund()` function

## 🔧 Troubleshooting

### Common Issues:

#### 1. "Insufficient tokens"
```
❌ Insufficient tokens. You need at least 10.0 tokens to vote
```
**Solution**: Get more tokens or reduce investment amount

#### 2. "Already voted"
```
❌ You have already voted on this proposal with 50.0 tokens
```
**Solution**: You can only vote once per proposal

#### 3. "Voting period ended"
```
❌ Voting period for this proposal has ended
```
**Solution**: Check active proposals with `npm run get-proposals`

#### 4. "Cannot vote on own proposal"
```
❌ You cannot vote on your own proposal
```
**Solution**: This is by design to prevent self-voting

#### 5. "Investment exceeds funding goal"
```
❌ Investment cannot exceed funding goal of 500.0 tokens
```
**Solution**: Reduce your investment amount

### Network Issues:
- Ensure you're connected to BSC Testnet
- Check you have sufficient BNB for gas fees
- Verify DAO_ADDRESS and TOKEN_ADDRESS in .env

## 📊 Checking Vote Status

### Before Voting:
```bash
# See all active proposals
npm run get-proposals

# View specific proposal details
PROPOSAL_ID=1 npm run view-proposal
```

### After Voting:
```bash
# Check updated proposal stats
npm run get-proposals

# View your voting history
PROPOSAL_ID=1 npm run view-proposal
```

## 💡 Voting Strategy Tips

### For Investors:
1. **Research Projects**: Read descriptions and check project URLs
2. **Assess Viability**: Consider if funding goal is reasonable
3. **Diversify**: Don't put all tokens in one proposal
4. **Time Consideration**: Vote early to influence others

### Investment Amount Strategy:
- **Conservative**: 10-50 tokens per proposal
- **Moderate**: 50-200 tokens for promising projects  
- **Aggressive**: Large amounts for projects you strongly believe in

### Vote Choice Considerations:
- **Vote FOR**: If you believe project will succeed and benefit DAO
- **Vote AGAINST**: If you think project is not viable or overpriced
- **Investment Size**: Shows your confidence level in the project

## 🔄 Complete Voting Workflow

1. **Check Active Proposals**:
   ```bash
   npm run get-proposals
   ```

2. **Review Proposal Details**:
   ```bash
   PROPOSAL_ID=1 npm run view-proposal
   ```

3. **Submit Your Vote**:
   ```bash
   # Interactive mode (recommended)
   npm run vote-proposal
   
   # Or quick mode
   node scripts/quickVote.cjs 1 for 50
   ```

4. **Monitor Results**:
   ```bash
   npm run get-proposals
   ```

5. **After Execution**:
   - If passed: Funds automatically transferred
   - If failed: Claim refund with contract function

## 📋 Command Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `npm run vote-proposal` | Interactive voting | `npm run vote-proposal` |
| `node scripts/quickVote.cjs X Y Z` | Quick vote | `node scripts/quickVote.cjs 1 for 50` |
| `npm run get-proposals` | List all proposals | `npm run get-proposals` |
| `PROPOSAL_ID=X npm run view-proposal` | View proposal details | `PROPOSAL_ID=1 npm run view-proposal` |

## ⚠️ Important Notes

### Token Economics:
- **Voting is binding**: Once you vote, tokens are locked
- **No vote changes**: You cannot change your vote
- **Refunds available**: Only if proposal fails
- **Gas costs**: Small BNB fee for transactions

### Security:
- **One vote per proposal**: Prevents double voting
- **Proposer exclusion**: Prevents self-voting manipulation
- **Time limits**: Voting periods are enforced
- **Investment caps**: Cannot exceed funding goals

Your Ganjes DAO voting system is now fully operational! 🎉