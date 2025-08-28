# ⏰ Proposal Voting Time Management Guide

## 🎯 Overview

Admins can now **extend** or **reduce** the voting time of specific active proposals, giving you flexible control over the voting process.

## 🔧 New Functions Added

### 1. **Extend Proposal Voting Time**
```solidity
function extendProposalVotingTime(uint256 _proposalId, uint256 _extensionTime)
```
- **Purpose**: Add more time to an active proposal
- **Access**: Admin only
- **Restrictions**: 
  - Only works on non-executed proposals
  - Cannot exceed maximum voting duration (30 days)

### 2. **Reduce Proposal Voting Time**
```solidity
function reduceProposalVotingTime(uint256 _proposalId, uint256 _reductionTime)
```
- **Purpose**: Reduce voting time of an active proposal
- **Access**: Admin only
- **Restrictions**:
  - Only works on non-executed proposals
  - Must leave at least minimum voting duration (1 minute)
  - Cannot reduce below current time + 1 minute

## 📋 Usage Examples

### Interactive Management (Recommended)
```bash
npm run manage-voting-time
```

**Features:**
- ✅ Shows all active proposals
- ✅ Interactive prompts for all parameters
- ✅ Safety validations before execution
- ✅ Confirmation steps
- ✅ Real-time feedback

### Environment Variable Method
```bash
# Extend proposal #1 by 2 hours (7200 seconds)
PROPOSAL_ID=1 ACTION=extend TIME_CHANGE=7200 npm run manage-voting-time

# Reduce proposal #2 by 30 minutes (1800 seconds)
PROPOSAL_ID=2 ACTION=reduce TIME_CHANGE=1800 npm run manage-voting-time
```

## 🕐 Time Examples

### Common Time Values:
```bash
# Minutes
30 minutes = 1800 seconds
60 minutes = 3600 seconds

# Hours  
2 hours = 7200 seconds
6 hours = 21600 seconds
12 hours = 43200 seconds

# Days
1 day = 86400 seconds
3 days = 259200 seconds
7 days = 604800 seconds
```

## 📊 Interactive Session Example

```bash
npm run manage-voting-time
```

**Sample Output:**
```
⏰ Ganjes DAO - Proposal Voting Time Management
============================================================

🔑 Admin account: 0x123...abc
🏛️  DAO contract: 0xebb...801
✅ Admin access confirmed

🔍 Fetching active proposals...

📊 ACTIVE PROPOSALS:
================================================================================

📋 Proposal #1
   📛 Project: DeFi Trading Platform
   👤 Proposer: 0x456...def
   ⏰ Ends: 8/3/2025, 8:30:00 PM
   ⏳ Time Left: 2h 15m 30s

📋 Proposal #2
   📛 Project: NFT Marketplace
   👤 Proposer: 0x789...ghi
   ⏰ Ends: 8/4/2025, 10:00:00 AM
   ⏳ Time Left: 15h 45m 20s

================================================================================

📋 Select an action:
1. Extend proposal voting time
2. Reduce proposal voting time
3. Exit

🆔 Enter choice (1-3): 1

🆔 Enter Proposal ID: 1

📋 Selected Proposal #1: DeFi Trading Platform
⏳ Current time left: 2h 15m 30s

⏰ How much time to add?
Examples: 3600 (1 hour), 7200 (2 hours), 86400 (1 day)
🕐 Enter seconds to add: 7200

📊 Extension Summary:
   🆔 Proposal: #1 - DeFi Trading Platform
   ➕ Adding: 2h 0m 0s
   🕐 Current end: 8/3/2025, 8:30:00 PM
   🕐 New end: 8/3/2025, 10:30:00 PM

❓ Confirm extension? (yes/no): yes

🔄 Extending proposal #1 by 2h 0m 0s...
⏳ Transaction submitted. Waiting for confirmation...

✅ Proposal voting time extended successfully!
🔗 Transaction hash: 0xabc...def
🕐 New end time: 8/3/2025, 10:30:00 PM
```

## ⚠️ Important Safety Features

### 1. **Admin Only Access**
- Only DAO admins can modify proposal voting times
- Prevents unauthorized manipulation

### 2. **Active Proposal Validation**
- Can only modify proposals that haven't been executed
- Automatically checks proposal status

### 3. **Time Constraints**
- **Extension Limit**: Cannot exceed 30 days total voting time
- **Reduction Limit**: Must leave at least 1 minute for voting
- **Smart Validation**: Prevents invalid time changes

### 4. **Event Logging**
```solidity
event ProposalVotingTimeChanged(
    uint256 indexed proposalId, 
    uint256 oldEndTime, 
    uint256 newEndTime, 
    uint256 timeChange, 
    bool isExtension, 
    uint256 timestamp
);
```

## 🎯 Use Cases

### When to **Extend** Voting Time:
- 📈 **High Interest**: Proposal gaining momentum, need more time for community
- 🐛 **Technical Issues**: Network congestion affecting voter participation  
- 📢 **Additional Discussion**: Community needs more time to debate
- 🌍 **Global Participation**: Accommodate different time zones

### When to **Reduce** Voting Time:
- 🎯 **Clear Consensus**: Overwhelming support/opposition, can close early
- 🚨 **Urgent Decisions**: Time-sensitive proposals needing quick action
- 💰 **Market Conditions**: Funding opportunities with deadlines
- 🔥 **Emergency Situations**: Critical DAO decisions

## 📋 Complete Workflow

### 1. **Check Active Proposals**
```bash
npm run get-proposals
```

### 2. **Manage Voting Time**
```bash
npm run manage-voting-time
```

### 3. **Verify Changes**
```bash
npm run get-proposals
# Check updated end times
```

### 4. **Monitor Results**
- Watch for increased/decreased participation
- Track voting completion times
- Analyze effectiveness of time changes

## 🛡️ Security Considerations

### Built-in Protections:
- ✅ **Admin-only functions** - Prevents unauthorized access
- ✅ **Proposal validation** - Ensures proposal exists and is active
- ✅ **Time bounds checking** - Prevents excessive extensions/reductions
- ✅ **Execution prevention** - Cannot modify completed proposals
- ✅ **Event logging** - Full audit trail of all changes

### Best Practices:
- 🔍 **Announce Changes**: Inform community of voting time modifications
- ⚖️ **Fair Usage**: Use modifications to improve fairness, not favor outcomes
- 📊 **Document Reasons**: Keep records of why changes were made
- 🕐 **Reasonable Limits**: Don't make extreme time changes without justification

## 🔗 Function Reference

| Function | Purpose | Parameters | Access |
|----------|---------|------------|--------|
| `extendProposalVotingTime` | Add time to proposal | `proposalId`, `extensionTime` | Admin |
| `reduceProposalVotingTime` | Remove time from proposal | `proposalId`, `reductionTime` | Admin |
| `increaseVotingDuration` | Change default duration | `increaseAmount` | Admin |
| `decreaseVotingDuration` | Change default duration | `decreaseAmount` | Admin |

## 📊 Command Reference

| Command | Purpose | Example |
|---------|---------|---------|
| `npm run manage-voting-time` | Interactive management | `npm run manage-voting-time` |
| Environment method | Direct command | `PROPOSAL_ID=1 ACTION=extend TIME_CHANGE=3600 npm run manage-voting-time` |
| `npm run get-proposals` | Check proposal status | `npm run get-proposals` |

Your DAO now has **complete voting time management capabilities**! ⏰✨