# Ganjes DAO API Reference

## Table of Contents
1. [Contract Overview](#contract-overview)
2. [Core Functions](#core-functions)
3. [View Functions](#view-functions)
4. [Admin Functions](#admin-functions)
5. [Events](#events)
6. [Errors](#errors)
7. [Modifiers](#modifiers)
8. [Constants](#constants)

## Contract Overview

### GanjesDAOOptimized
The main DAO contract implementing proposal-based governance with token deposits and investment voting.

**Address**: `0xd1F5595bd570d82EEB3A425E9B6bC9d770C3BAa8` (BSC Testnet)

**Inheritance**: `ReentrancyGuard`, `Pausable`

## Core Functions

### createProposal

Creates a new funding proposal.

```solidity
function createProposal(
    string calldata _description, 
    string calldata _projectName,
    string calldata _projectUrl,
    uint256 _fundingGoal
) external onlyProposalCreator nonReentrant whenNotPausedCustom
```

**Parameters:**
- `_description`: Detailed description of the project (required, non-empty)
- `_projectName`: Name of the project (required, non-empty)
- `_projectUrl`: URL for project information (required, non-empty)
- `_fundingGoal`: Amount of tokens requested (10 - 1,000,000 tokens)

**Requirements:**
- Caller must have ≥100 tokens
- Must approve DAO to spend 100 tokens for deposit
- Must wait 1 hour since last proposal
- Must not exceed 10 proposals per user
- Contract must not be paused

**Returns:** Emits `ProposalCreated` event with proposal ID

**Example:**
```javascript
const tx = await dao.createProposal(
    "A revolutionary DeFi platform that...",
    "DeFi Revolution",
    "https://github.com/user/defi-project",
    ethers.parseEther("1000")
);
```

---

### vote

Vote on a proposal with token investment.

```solidity
function vote(
    uint256 _proposalId, 
    bool _support, 
    uint256 _investmentAmount
) external validProposal(_proposalId) onlyVoter nonReentrant whenNotPausedCustom
```

**Parameters:**
- `_proposalId`: ID of the proposal to vote on
- `_support`: `true` for support, `false` for against
- `_investmentAmount`: Amount of tokens to invest (≥ minimum investment)

**Requirements:**
- Valid proposal ID
- Voter has minimum token balance
- Proposer cannot vote on own proposal
- Voting period must be active
- User hasn't already voted
- Investment amount ≥ minimum investment
- Investment amount ≤ funding goal

**Vote Weight:** Based on voter's total token balance
**Investment:** Separate locked amount, refundable if proposal fails

**Example:**
```javascript
// Vote in support with 50 token investment
const tx = await dao.vote(1, true, ethers.parseEther("50"));
```

---

### executeProposal

Execute a proposal after voting period ends (admin only).

```solidity
function executeProposal(uint256 _proposalId) 
    external validProposal(_proposalId) onlyAdmin nonReentrant whenNotPausedCustom
```

**Parameters:**
- `_proposalId`: ID of the proposal to execute

**Requirements:**
- Valid proposal ID
- Caller must be admin
- Proposal not already executed
- Voting period must have ended

**Success Criteria:**
1. **Funding Success**: Total investments ≥ funding goal
2. **Voting Success**: Quorum reached AND more votes for than against

**Outcomes:**
- **Success**: Transfers funding goal to proposer + refunds deposit
- **Failure**: Allows investors and proposer to claim refunds

---

### claimRefund

Claim refund for investment in failed proposal.

```solidity
function claimRefund(uint256 _proposalId) 
    external validProposal(_proposalId) nonReentrant
```

**Parameters:**
- `_proposalId`: ID of the failed proposal

**Requirements:**
- Valid proposal ID
- Proposal must be executed
- Proposal must have failed
- User must have investment to refund

**Example:**
```javascript
const tx = await dao.claimRefund(1);
```

---

### refundProposalDeposit

Refund proposal deposit for failed proposals (admin or proposer).

```solidity
function refundProposalDeposit(uint256 _proposalId) 
    external validProposal(_proposalId) onlyAdmin nonReentrant
```

**Parameters:**
- `_proposalId`: ID of the failed proposal

**Requirements:**
- Valid proposal ID
- Caller is admin or proposer
- Proposal executed and failed
- Deposit not already refunded

## View Functions

### getProposal

Get comprehensive proposal information.

```solidity
function getProposal(uint256 _proposalId) external view validProposal(_proposalId) 
    returns (
        uint256 id,
        address proposer,
        string memory description,
        string memory projectName,
        string memory projectUrl,
        uint256 fundingGoal,
        uint256 proposalDeposit,
        uint256 endTime,
        bool executed,
        bool passed,
        bool depositRefunded,
        uint256 totalVotesFor,
        uint256 totalVotesAgainst,
        uint256 totalInvested,
        uint32 votersFor,
        uint32 votersAgainst
    )
```

**Example:**
```javascript
const proposal = await dao.getProposal(1);
console.log(`Project: ${proposal.projectName}`);
console.log(`Goal: ${ethers.formatEther(proposal.fundingGoal)} tokens`);
```

---

### checkProposalRequirements

Check if address can create proposals with detailed status.

```solidity
function checkProposalRequirements(address _proposer) external view 
    returns (
        bool canCreateProposal,
        bool hasMinTokens,
        bool hasDepositTokens,
        bool hasAllowance,
        bool cooldownPassed,
        bool belowMaxProposals,
        uint256 userBalance,
        uint256 currentAllowance,
        uint256 tokensNeeded,
        uint256 depositNeeded,
        uint256 timeUntilNextProposal,
        uint256 proposalsCreated,
        string memory statusMessage
    )
```

**Example:**
```javascript
const req = await dao.checkProposalRequirements(userAddress);
if (!req.canCreateProposal) {
    console.log(`Cannot create: ${req.statusMessage}`);
}
```

---

### getUserInvestment

Get user's investment in specific proposal.

```solidity
function getUserInvestment(uint256 _proposalId, address _user) 
    external view validProposal(_proposalId) 
    returns (
        uint256 investment, 
        bool hasVoted, 
        uint256 voteTime
    )
```

---

### getDAOStats

Get overall DAO statistics.

```solidity
function getDAOStats() external view 
    returns (
        uint256 totalProposals,
        uint256 totalFunding,
        uint256 totalActiveInvestors,
        uint256 totalDepositsLocked,
        uint256 contractBalance
    )
```

---

### getAllProposalIds

Get array of all proposal IDs.

```solidity
function getAllProposalIds() external view returns (uint256[] memory)
```

---

### getProposalCountByUser

Get number of proposals created by user.

```solidity
function getProposalCountByUser(address _user) external view returns (uint256)
```

---

### getTimeUntilNextProposal

Get remaining cooldown time for user.

```solidity
function getTimeUntilNextProposal(address _user) external view returns (uint256)
```

**Returns:** Seconds until user can create next proposal (0 if ready)

## Token Management Functions

### approveDAO

Approve DAO contract to spend user's tokens.

```solidity
function approveDAO(uint256 _amount) external returns (bool success)
```

---

### increaseDAOAllowance

Increase allowance for DAO contract.

```solidity
function increaseDAOAllowance(uint256 _addedValue) external returns (bool success)
```

---

### decreaseDAOAllowance

Decrease allowance for DAO contract.

```solidity
function decreaseDAOAllowance(uint256 _subtractedValue) external returns (bool success)
```

---

### getDAOAllowance

Get current allowance for DAO contract.

```solidity
function getDAOAllowance(address _owner) external view returns (uint256 allowance)
```

---

### checkAllowanceSufficiency

Check if user has sufficient allowance for operation.

```solidity
function checkAllowanceSufficiency(address _user, uint256 _requiredAmount) 
    external view 
    returns (
        bool hasAllowance, 
        uint256 currentAllowance, 
        uint256 shortfall
    )
```

## Admin Functions

### setVotingDuration

Set voting duration for new proposals.

```solidity
function setVotingDuration(uint256 _duration) external onlyAdmin
```

**Parameters:**
- `_duration`: New voting duration in seconds (1 minute - 30 days)

---

### setMinInvestmentAmount

Set minimum investment amount for voting.

```solidity
function setMinInvestmentAmount(uint256 _minInvestmentAmount) external onlyAdmin
```

---

### setMaxProposalsPerUser

Set maximum proposals per user.

```solidity
function setMaxProposalsPerUser(uint256 _maxProposals) external onlyAdmin
```

**Parameters:**
- `_maxProposals`: New maximum (1-100)

---

### addAdmin

Add new admin to the DAO.

```solidity
function addAdmin(address _newAdmin) external onlyAdmin validAddress(_newAdmin)
```

**Requirements:**
- Caller is admin
- New admin not already admin
- Less than 10 total admins

---

### removeAdmin

Remove admin from the DAO.

```solidity
function removeAdmin(address _admin) external onlyAdmin validAddress(_admin)
```

**Requirements:**
- Target is admin
- Cannot remove primary admin
- Must have at least one admin remaining

---

### pause / unpause

Emergency pause/unpause functions.

```solidity
function pause() external onlyAdmin
function unpause() external onlyAdmin
```

---

### emergencyWithdraw

Emergency withdrawal with safety limits.

```solidity
function emergencyWithdraw(
    uint256 _amount, 
    address _to, 
    string calldata _reason
) external onlyAdmin validAddress(_to) nonReentrant
```

**Parameters:**
- `_amount`: Amount to withdraw (≤5% of total balance)
- `_to`: Recipient address
- `_reason`: Reason for emergency withdrawal

## Events

### ProposalCreated
```solidity
event ProposalCreated(
    uint256 indexed proposalId, 
    address indexed proposer, 
    string indexed projectName,
    uint256 fundingGoal, 
    uint256 proposalDeposit, 
    uint256 endTime,
    uint256 timestamp
);
```

### Voted
```solidity
event Voted(
    uint256 indexed proposalId, 
    address indexed voter, 
    bool indexed support,
    uint256 weight, 
    uint256 investmentAmount, 
    uint256 timestamp
);
```

### ProposalExecuted
```solidity
event ProposalExecuted(
    uint256 indexed proposalId, 
    bool passed, 
    uint256 amountAllocated, 
    uint256 timestamp
);
```

### RefundClaimed
```solidity
event RefundClaimed(
    uint256 indexed proposalId, 
    address indexed investor, 
    uint256 amount, 
    uint256 timestamp
);
```

### ProposalDepositRefunded
```solidity
event ProposalDepositRefunded(
    uint256 indexed proposalId, 
    address indexed proposer, 
    uint256 amount, 
    uint256 timestamp
);
```

### ConfigurationChanged
```solidity
event ConfigurationChanged(
    string indexed parameter, 
    uint256 oldValue, 
    uint256 newValue, 
    uint256 timestamp
);
```

### AdminAdded / AdminRemoved
```solidity
event AdminAdded(address indexed newAdmin, address indexed addedBy, uint256 timestamp);
event AdminRemoved(address indexed removedAdmin, address indexed removedBy, uint256 timestamp);
```

### EmergencyWithdrawal
```solidity
event EmergencyWithdrawal(
    address indexed recipient, 
    uint256 amount, 
    string reason, 
    uint256 timestamp
);
```

## Custom Errors

### Access Control
```solidity
error Unauthorized();
error ZeroAddress();
```

### Token Errors
```solidity
error InsufficientTokens(uint256 required, uint256 available);
error InsufficientAllowance(uint256 required, uint256 available);
error TransferFailed();
```

### Proposal Errors
```solidity
error InvalidProposal(uint256 proposalId);
error ProposalAlreadyExecuted(uint256 proposalId);
error InvalidFundingGoal(uint256 goal);
error ProposalCooldownActive(uint256 timeRemaining);
error MaxProposalsReached(uint256 maxAllowed);
```

### Voting Errors
```solidity
error VotingPeriodEnded(uint256 proposalId);
error VotingPeriodNotEnded(uint256 proposalId);
error AlreadyVoted(uint256 proposalId);
error ProposerCannotVote(uint256 proposalId);
```

### System Errors
```solidity
error ContractPaused();
```

## Modifiers

### onlyAdmin
```solidity
modifier onlyAdmin() {
    if (!admins[msg.sender] && msg.sender != admin) revert Unauthorized();
    _;
}
```

### onlyProposalCreator
```solidity
modifier onlyProposalCreator() {
    uint256 userBalance = governanceToken.balanceOf(msg.sender);
    if (userBalance < TOTAL_TOKENS_REQUIRED) {
        revert InsufficientTokens(TOTAL_TOKENS_REQUIRED, userBalance);
    }
    _;
}
```

### onlyVoter
```solidity
modifier onlyVoter() {
    uint256 userBalance = governanceToken.balanceOf(msg.sender);
    if (userBalance < minInvestmentAmount) {
        revert InsufficientTokens(minInvestmentAmount, userBalance);
    }
    _;
}
```

### validProposal
```solidity
modifier validProposal(uint256 _proposalId) {
    if (_proposalId == 0 || _proposalId > proposalCount) {
        revert InvalidProposal(_proposalId);
    }
    _;
}
```

### validAddress
```solidity
modifier validAddress(address _addr) {
    if (_addr == address(0)) revert ZeroAddress();
    _;
}
```

### whenNotPausedCustom
```solidity
modifier whenNotPausedCustom() {
    if (paused()) revert ContractPaused();
    _;
}
```

## Constants

### Proposal Constants
```solidity
uint256 public constant MIN_TOKENS_FOR_PROPOSAL = 100 * 10**18;    // 100 tokens
uint256 public constant PROPOSAL_DEPOSIT_AMOUNT = 100 * 10**18;    // 100 tokens
uint256 public constant TOTAL_TOKENS_REQUIRED = 100 * 10**18;      // 100 tokens
uint256 public constant MIN_FUNDING_GOAL = 10 * 10**18;            // 10 tokens
uint256 public constant MAX_FUNDING_GOAL = 1000000 * 10**18;       // 1M tokens
uint256 public constant PROPOSAL_COOLDOWN = 1 hours;               // 1 hour
```

### Voting Constants
```solidity
uint256 public constant MIN_QUORUM_PERCENT = 50;                   // 50%
uint256 public constant MIN_VOTING_DURATION = 1 minutes;           // 1 minute
uint256 public constant MAX_VOTING_DURATION = 30 days;             // 30 days
```

### Security Constants
```solidity
uint256 public constant MAX_EMERGENCY_WITHDRAW_PERCENT = 5;        // 5%
```

## Usage Examples

### Complete Proposal Workflow

```javascript
// 1. Check requirements
const req = await dao.checkProposalRequirements(userAddress);
if (!req.canCreateProposal) {
    throw new Error(req.statusMessage);
}

// 2. Approve tokens if needed
if (!req.hasAllowance) {
    await token.approve(daoAddress, ethers.parseEther("100"));
}

// 3. Create proposal
const createTx = await dao.createProposal(
    "Detailed description...",
    "Project Name",
    "https://project-url.com",
    ethers.parseEther("1000")
);
const receipt = await createTx.wait();

// 4. Get proposal ID from event
const event = receipt.logs.find(log => 
    dao.interface.parseLog(log).name === "ProposalCreated"
);
const proposalId = dao.interface.parseLog(event).args.proposalId;

// 5. Vote on proposal
await dao.vote(proposalId, true, ethers.parseEther("50"));

// 6. After voting period, execute proposal (admin)
await dao.executeProposal(proposalId);

// 7. Check results
const proposal = await dao.getProposal(proposalId);
console.log("Proposal passed:", proposal.passed);
```

### Monitoring Events

```javascript
// Listen for new proposals
dao.on("ProposalCreated", (proposalId, proposer, projectName, fundingGoal) => {
    console.log(`New proposal ${proposalId}: ${projectName}`);
    console.log(`Funding goal: ${ethers.formatEther(fundingGoal)} tokens`);
});

// Listen for votes
dao.on("Voted", (proposalId, voter, support, weight, investment) => {
    console.log(`Vote on proposal ${proposalId}: ${support ? 'FOR' : 'AGAINST'}`);
    console.log(`Investment: ${ethers.formatEther(investment)} tokens`);
});
```