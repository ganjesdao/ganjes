// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./libraries/ReentrancyGuard.sol";
import "./libraries/Pausable.sol";

/**
 * @title GanjesDAOOptimized
 * @notice Optimized DAO contract with enhanced security and efficiency
 * @dev Implements proposal-based governance with token deposits and investment voting
 */
contract GanjesDAOOptimized is ReentrancyGuard, Pausable {
    
    // ============= STATE VARIABLES =============
    
    // Token and admin configuration
    IERC20 public immutable governanceToken;
    address public admin;
    mapping(address => bool) public admins;
    uint256 public adminCount;
    
    // DAO parameters - Made configurable with bounds
    uint256 public minInvestmentAmount;
    uint256 public votingDuration;
    uint256 public maxProposalsPerUser; // NEW: Prevent spam
    
    // Enhanced constants with better naming
    uint256 public constant MIN_TOKENS_FOR_PROPOSAL = 100 * 10**18;
    uint256 public constant PROPOSAL_DEPOSIT_AMOUNT = MIN_TOKENS_FOR_PROPOSAL;
    uint256 public constant TOTAL_TOKENS_REQUIRED = MIN_TOKENS_FOR_PROPOSAL; 
    uint256 public constant MIN_QUORUM_PERCENT = 50;
    uint256 public constant MIN_VOTING_DURATION = 1 minutes;
    uint256 public constant MAX_VOTING_DURATION = 30 days;
    uint256 public constant MAX_FUNDING_GOAL = 1000000 * 10**18; // NEW: 1M token max
    uint256 public constant MIN_FUNDING_GOAL = 10 * 10**18; // NEW: 10 token min
    uint256 public constant MAX_EMERGENCY_WITHDRAW_PERCENT = 5; // 5% max emergency withdraw
    
    // Proposal structure - Optimized layout
    struct Proposal {
        uint256 id;
        address proposer;
        uint256 fundingGoal;
        uint256 proposalDeposit;
        uint256 totalVotesFor;
        uint256 totalVotesAgainst;
        uint256 totalInvested;
        uint256 endTime;
        uint32 votersFor; // Using smaller int for gas optimization
        uint32 votersAgainst;
        bool executed;
        bool passed;
        bool depositRefunded;
        string description;
        string projectName;
        string projectUrl;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteTimestamp;
        mapping(address => uint256) investments;
    }
    
    struct VoteRecord {
        uint256 proposalId;
        uint256 investmentAmount;
        uint256 timestamp;
        bool support;
    }
    
    struct FundingRecord {
        uint256 proposalId;
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }
    
    // Storage - Optimized organization
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256[] public allProposalIds;
    
    mapping(uint256 => FundingRecord) public fundingHistory;
    uint256 public fundingRecordCount;
    
    mapping(address => uint256[]) public proposalsByProposer;
    mapping(address => VoteRecord[]) public votesByInvestor;
    mapping(address => bool) public activeInvestors;
    uint256 public activeInvestorCount;
    
    mapping(address => uint256) public totalProposalDeposits;
    mapping(address => uint256) public proposalCountByUser; // NEW: Track user proposals
    
    // Time-based restrictions - NEW security feature
    mapping(address => uint256) public lastProposalTime;
    uint256 public constant PROPOSAL_COOLDOWN = 1 hours; // Users can't spam proposals
    
    // ============= EVENTS =============
    
    event ProposalCreated(
        uint256 indexed proposalId, 
        address indexed proposer, 
        string indexed projectName,
        uint256 fundingGoal, 
        uint256 proposalDeposit, 
        uint256 endTime,
        uint256 timestamp
    );
    
    event Voted(
        uint256 indexed proposalId, 
        address indexed voter, 
        bool indexed support,
        uint256 weight, 
        uint256 investmentAmount, 
        uint256 timestamp
    );
    
    event ProposalExecuted(uint256 indexed proposalId, bool passed, uint256 amountAllocated, uint256 timestamp);
    event ProposalDepositRefunded(uint256 indexed proposalId, address indexed proposer, uint256 amount, uint256 timestamp);
    event RefundClaimed(uint256 indexed proposalId, address indexed investor, uint256 amount, uint256 timestamp);
    event FundsWithdrawn(address indexed recipient, uint256 amount, uint256 timestamp);
    event EmergencyWithdrawal(address indexed recipient, uint256 amount, string reason, uint256 timestamp);
    event AdminAdded(address indexed newAdmin, address indexed addedBy, uint256 timestamp);
    event AdminRemoved(address indexed removedAdmin, address indexed removedBy, uint256 timestamp);
    event ConfigurationChanged(string indexed parameter, uint256 oldValue, uint256 newValue, uint256 timestamp);
    
    // ============= ERRORS - Gas efficient custom errors =============
    
    error InsufficientTokens(uint256 required, uint256 available);
    error InsufficientAllowance(uint256 required, uint256 available);
    error InvalidProposal(uint256 proposalId);
    error ProposalAlreadyExecuted(uint256 proposalId);
    error VotingPeriodEnded(uint256 proposalId);
    error VotingPeriodNotEnded(uint256 proposalId);
    error AlreadyVoted(uint256 proposalId);
    error ProposerCannotVote(uint256 proposalId);
    error InvalidFundingGoal(uint256 goal);
    error ProposalCooldownActive(uint256 timeRemaining);
    error MaxProposalsReached(uint256 maxAllowed);
    error ZeroAddress();
    error Unauthorized();
    error TransferFailed();
    error ContractPaused();
    
    // ============= MODIFIERS =============
    
    modifier onlyAdmin() {
        if (!admins[msg.sender] && msg.sender != admin) revert Unauthorized();
        _;
    }
    
    modifier onlyProposalCreator() {
        uint256 userBalance = governanceToken.balanceOf(msg.sender);
        if (userBalance < TOTAL_TOKENS_REQUIRED) {
            revert InsufficientTokens(TOTAL_TOKENS_REQUIRED, userBalance);
        }
        _;
    }
    
    modifier onlyVoter() {
        uint256 userBalance = governanceToken.balanceOf(msg.sender);
        if (userBalance < minInvestmentAmount) {
            revert InsufficientTokens(minInvestmentAmount, userBalance);
        }
        _;
    }
    
    modifier validProposal(uint256 _proposalId) {
        if (_proposalId == 0 || _proposalId > proposalCount) {
            revert InvalidProposal(_proposalId);
        }
        _;
    }
    
    modifier validAddress(address _addr) {
        if (_addr == address(0)) revert ZeroAddress();
        _;
    }
    
    modifier whenNotPausedCustom() {
        if (paused()) revert ContractPaused();
        _;
    }
    
    // ============= CONSTRUCTOR =============
    
    constructor(address _governanceToken) validAddress(_governanceToken) {
        governanceToken = IERC20(_governanceToken);
        admin = msg.sender;
        admins[msg.sender] = true;
        adminCount = 1;
        proposalCount = 0;
        fundingRecordCount = 0;
        activeInvestorCount = 0;
        minInvestmentAmount = 10 * 10**18;
        votingDuration = 5 minutes;
        maxProposalsPerUser = 10; // NEW: Default limit
        
        emit AdminAdded(msg.sender, address(0), block.timestamp);
        emit ConfigurationChanged("minInvestmentAmount", 0, minInvestmentAmount, block.timestamp);
        emit ConfigurationChanged("votingDuration", 0, votingDuration, block.timestamp);
    }
    
    // ============= CORE FUNCTIONS =============
    
    /**
     * @notice Create a new proposal with enhanced validation
     * @param _description Detailed description of the proposal
     * @param _projectName Name of the project
     * @param _projectUrl URL for project information
     * @param _fundingGoal Amount of tokens requested
     */
    function createProposal(
        string calldata _description, 
        string calldata _projectName,
        string calldata _projectUrl,
        uint256 _fundingGoal
    ) 
        external 
        onlyProposalCreator
        nonReentrant
        whenNotPausedCustom
    {
        // Enhanced validation
        if (_fundingGoal < MIN_FUNDING_GOAL || _fundingGoal > MAX_FUNDING_GOAL) {
            revert InvalidFundingGoal(_fundingGoal);
        }
        
        if (bytes(_projectName).length == 0 || bytes(_projectUrl).length == 0 || bytes(_description).length == 0) {
            revert("Empty required fields");
        }
        
        // NEW: Cooldown check to prevent spam
        if (block.timestamp < lastProposalTime[msg.sender] + PROPOSAL_COOLDOWN) {
            uint256 timeRemaining = (lastProposalTime[msg.sender] + PROPOSAL_COOLDOWN) - block.timestamp;
            revert ProposalCooldownActive(timeRemaining);
        }
        
        // NEW: Max proposals per user check
        if (proposalCountByUser[msg.sender] >= maxProposalsPerUser) {
            revert MaxProposalsReached(maxProposalsPerUser);
        }

        
        
        // Auto-approve tokens if needed
        uint256 currentAllowance = governanceToken.allowance(msg.sender, address(this));
        
        try governanceToken.transferFrom(msg.sender, address(this), PROPOSAL_DEPOSIT_AMOUNT) {
            // Transfer succeeded
        } catch {
            // Provide more helpful error message
            if (currentAllowance < PROPOSAL_DEPOSIT_AMOUNT) {
                revert InsufficientAllowance(PROPOSAL_DEPOSIT_AMOUNT, currentAllowance);
            } else {
                // Could be insufficient balance or other issue
                uint256 balance = governanceToken.balanceOf(msg.sender);
                if (balance < PROPOSAL_DEPOSIT_AMOUNT) {
                    revert InsufficientTokens(PROPOSAL_DEPOSIT_AMOUNT, balance);
                } else {
                    revert TransferFailed();
                }
            }
        }
        
        // Create proposal
        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.description = _description;
        newProposal.projectName = _projectName;
        newProposal.projectUrl = _projectUrl;
        newProposal.fundingGoal = _fundingGoal;
        newProposal.proposalDeposit = PROPOSAL_DEPOSIT_AMOUNT;
        newProposal.endTime = block.timestamp + votingDuration;
        newProposal.executed = false;
        newProposal.passed = false;
        newProposal.depositRefunded = false;
        newProposal.votersFor = 0;
        newProposal.votersAgainst = 0;
        newProposal.totalInvested = 0;
        
        // Update tracking
        totalProposalDeposits[msg.sender] += PROPOSAL_DEPOSIT_AMOUNT;
        proposalCountByUser[msg.sender]++;
        lastProposalTime[msg.sender] = block.timestamp;
        
        allProposalIds.push(proposalCount);
        proposalsByProposer[msg.sender].push(proposalCount);
        
        emit ProposalCreated(
            proposalCount, 
            msg.sender, 
            _projectName,
            _fundingGoal, 
            PROPOSAL_DEPOSIT_AMOUNT, 
            newProposal.endTime,
            block.timestamp
        );
    }
    
    /**
     * @notice Vote on a proposal with investment
     * @param _proposalId ID of the proposal to vote on
     * @param _support True for support, false for against
     * @param _investmentAmount Amount of tokens to invest
     */
    function vote(uint256 _proposalId, bool _support, uint256 _investmentAmount) 
        external 
        validProposal(_proposalId)
        onlyVoter
        nonReentrant
        whenNotPausedCustom
    {
        Proposal storage proposal = proposals[_proposalId];
        
        // Validation checks with custom errors
        if (msg.sender == proposal.proposer) revert ProposerCannotVote(_proposalId);
        if (block.timestamp >= proposal.endTime) revert VotingPeriodEnded(_proposalId);
        if (proposal.hasVoted[msg.sender]) revert AlreadyVoted(_proposalId);
        if (proposal.executed) revert ProposalAlreadyExecuted(_proposalId);
        
        if (_investmentAmount < minInvestmentAmount) {
            revert InsufficientTokens(minInvestmentAmount, _investmentAmount);
        }
        if (_investmentAmount > proposal.fundingGoal) {
            revert("Investment exceeds funding goal");
        }
        
        // Check balance first
        uint256 voterBalance = governanceToken.balanceOf(msg.sender);
        if (voterBalance < _investmentAmount) {
            revert InsufficientTokens(_investmentAmount, voterBalance);
        }
        
        // Try transfer with better error handling
        uint256 currentAllowance = governanceToken.allowance(msg.sender, address(this));
        
        try governanceToken.transferFrom(msg.sender, address(this), _investmentAmount) {
            // Transfer succeeded
        } catch {
            // Provide more helpful error message
            if (currentAllowance < _investmentAmount) {
                revert InsufficientAllowance(_investmentAmount, currentAllowance);
            } else {
                revert TransferFailed();
            }
        }
        
        // Track active investors
        if (!activeInvestors[msg.sender]) {
            activeInvestors[msg.sender] = true;
            activeInvestorCount++;
        }
        
        // Record vote
        proposal.hasVoted[msg.sender] = true;
        proposal.voteTimestamp[msg.sender] = block.timestamp;
        proposal.investments[msg.sender] = _investmentAmount;
        proposal.totalInvested += _investmentAmount;
        
        if (_support) {
            proposal.totalVotesFor += voterBalance;
            proposal.votersFor++;
        } else {
            proposal.totalVotesAgainst += voterBalance;
            proposal.votersAgainst++;
        }
        
        votesByInvestor[msg.sender].push(VoteRecord({
            proposalId: _proposalId,
            support: _support,
            investmentAmount: _investmentAmount,
            timestamp: block.timestamp
        }));
        
        emit Voted(_proposalId, msg.sender, _support, voterBalance, _investmentAmount, block.timestamp);
    }
    
    /**
     * @notice Execute a proposal after voting period ends
     * @param _proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 _proposalId) 
        external 
        validProposal(_proposalId)
        onlyAdmin 
        nonReentrant 
        whenNotPausedCustom
    {
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.executed) revert ProposalAlreadyExecuted(_proposalId);
        if (block.timestamp < proposal.endTime) revert VotingPeriodNotEnded(_proposalId);
        
        proposal.executed = true;
        
        // Enhanced proposal evaluation
        bool passesByFunding = proposal.totalInvested >= proposal.fundingGoal;
        bool passesByVoting = false;
        
        if (!passesByFunding) {
            uint256 totalSupply = governanceToken.totalSupply();
            uint256 totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
            uint256 quorum = (totalSupply * MIN_QUORUM_PERCENT) / 100;
            passesByVoting = (totalVotes >= quorum && proposal.totalVotesFor > proposal.totalVotesAgainst);
        }
        
        if (passesByFunding || passesByVoting) {
            proposal.passed = true;
            
            // Enhanced fund transfer with safety checks
            uint256 daoBalance = governanceToken.balanceOf(address(this));
            uint256 totalRequired = proposal.fundingGoal + proposal.proposalDeposit;
            
            if (daoBalance < totalRequired) {
                revert("Insufficient DAO funds for funding and deposit refund");
            }
            
            // Transfer funding
            if (!governanceToken.transfer(proposal.proposer, proposal.fundingGoal)) {
                revert TransferFailed();
            }
            
            // Refund deposit for successful proposals
            if (!proposal.depositRefunded) {
                proposal.depositRefunded = true;
                totalProposalDeposits[proposal.proposer] -= proposal.proposalDeposit;
                
                if (!governanceToken.transfer(proposal.proposer, proposal.proposalDeposit)) {
                    revert TransferFailed();
                }
                
                emit ProposalDepositRefunded(_proposalId, proposal.proposer, proposal.proposalDeposit, block.timestamp);
            }
            
            // Record funding
            fundingRecordCount++;
            fundingHistory[fundingRecordCount] = FundingRecord({
                proposalId: _proposalId,
                recipient: proposal.proposer,
                amount: proposal.fundingGoal,
                timestamp: block.timestamp
            });
            
            emit FundsWithdrawn(proposal.proposer, proposal.fundingGoal, block.timestamp);
        }
        
        emit ProposalExecuted(_proposalId, proposal.passed, proposal.passed ? proposal.fundingGoal : 0, block.timestamp);
    }
    
    // ============= REFUND FUNCTIONS =============
    
    /**
     * @notice Claim refund for failed proposal investment
     * @param _proposalId ID of the failed proposal
     */
    function claimRefund(uint256 _proposalId) 
        external 
        validProposal(_proposalId)
        nonReentrant 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        if (!proposal.executed) revert("Proposal not yet executed");
        if (proposal.passed) revert("Cannot refund passed proposal");
        if (proposal.investments[msg.sender] == 0) revert("No investment to refund");
        
        uint256 refundAmount = proposal.investments[msg.sender];
        proposal.investments[msg.sender] = 0;
        
        if (!governanceToken.transfer(msg.sender, refundAmount)) {
            revert TransferFailed();
        }
        
        emit RefundClaimed(_proposalId, msg.sender, refundAmount, block.timestamp);
    }
    
    /**
     * @notice Admin function to refund proposal deposit for failed proposals
     * @param _proposalId ID of the failed proposal
     */
    function refundProposalDeposit(uint256 _proposalId) 
        external 
        validProposal(_proposalId)
        onlyAdmin 
        nonReentrant 
    {
        Proposal storage proposal = proposals[_proposalId];
        
        if (!proposal.executed) revert("Proposal not yet executed");
        if (proposal.passed) revert("Cannot refund deposit for passed proposal");
        if (proposal.depositRefunded) revert("Deposit already refunded");
        
        proposal.depositRefunded = true;
        totalProposalDeposits[proposal.proposer] -= proposal.proposalDeposit;
        
        if (!governanceToken.transfer(proposal.proposer, proposal.proposalDeposit)) {
            revert TransferFailed();
        }
        
        emit ProposalDepositRefunded(_proposalId, proposal.proposer, proposal.proposalDeposit, block.timestamp);
    }
    
    // ============= ADMIN FUNCTIONS =============
    
    /**
     * @notice Set voting duration with enhanced validation
     * @param _duration New voting duration in seconds
     */
    function setVotingDuration(uint256 _duration) external onlyAdmin {
        if (_duration < MIN_VOTING_DURATION || _duration > MAX_VOTING_DURATION) {
            revert("Invalid voting duration");
        }
        
        uint256 oldValue = votingDuration;
        votingDuration = _duration;
        
        emit ConfigurationChanged("votingDuration", oldValue, _duration, block.timestamp);
    }
    
    /**
     * @notice Set minimum investment amount
     * @param _minInvestmentAmount New minimum investment amount
     */
    function setMinInvestmentAmount(uint256 _minInvestmentAmount) external onlyAdmin {
        if (_minInvestmentAmount == 0) revert("Invalid investment amount");
        
        uint256 oldValue = minInvestmentAmount;
        minInvestmentAmount = _minInvestmentAmount;
        
        emit ConfigurationChanged("minInvestmentAmount", oldValue, _minInvestmentAmount, block.timestamp);
    }
    
    /**
     * @notice Set maximum proposals per user (NEW)
     * @param _maxProposals New maximum proposals per user
     */
    function setMaxProposalsPerUser(uint256 _maxProposals) external onlyAdmin {
        if (_maxProposals == 0 || _maxProposals > 100) revert("Invalid max proposals");
        
        uint256 oldValue = maxProposalsPerUser;
        maxProposalsPerUser = _maxProposals;
        
        emit ConfigurationChanged("maxProposalsPerUser", oldValue, _maxProposals, block.timestamp);
    }
    
    /**
     * @notice Add new admin with enhanced validation
     * @param _newAdmin Address of new admin
     */
    function addAdmin(address _newAdmin) external onlyAdmin validAddress(_newAdmin) {
        if (admins[_newAdmin]) revert("Already an admin");
        if (adminCount >= 10) revert("Too many admins");
        
        admins[_newAdmin] = true;
        adminCount++;
        
        emit AdminAdded(_newAdmin, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Remove admin with safety checks
     * @param _admin Address of admin to remove
     */
    function removeAdmin(address _admin) external onlyAdmin validAddress(_admin) {
        if (!admins[_admin]) revert("Not an admin");
        if (_admin == admin) revert("Cannot remove primary admin");
        if (adminCount <= 1) revert("Must have at least one admin");
        
        admins[_admin] = false;
        adminCount--;
        
        emit AdminRemoved(_admin, msg.sender, block.timestamp);
    }
    
    // ============= EMERGENCY FUNCTIONS =============
    
    function pause() external onlyAdmin {
        _pause();
    }
    
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    /**
     * @notice Emergency withdraw with enhanced safety
     * @param _amount Amount to withdraw
     * @param _to Recipient address
     * @param _reason Reason for emergency withdrawal
     */
    function emergencyWithdraw(uint256 _amount, address _to, string calldata _reason) 
        external 
        onlyAdmin 
        validAddress(_to)
        nonReentrant 
    {
        if (_amount == 0) revert("Invalid amount");
        if (bytes(_reason).length == 0) revert("Reason required");
        
        uint256 daoBalance = governanceToken.balanceOf(address(this));
        uint256 maxWithdraw = (daoBalance * MAX_EMERGENCY_WITHDRAW_PERCENT) / 100;
        
        if (_amount > maxWithdraw) revert("Exceeds emergency withdrawal limit");
        if (daoBalance < _amount) revert("Insufficient balance");
        
        if (!governanceToken.transfer(_to, _amount)) {
            revert TransferFailed();
        }
        
        emit EmergencyWithdrawal(_to, _amount, _reason, block.timestamp);
    }
    
    // ============= VIEW FUNCTIONS =============
    
    function getAllProposalIds() external view returns (uint256[] memory) {
        return allProposalIds;
    }
    
    function getTotalProposals() external view returns (uint256) {
        return proposalCount;
    }
    
    function getTotalProposalDeposits(address _proposer) external view returns (uint256) {
        return totalProposalDeposits[_proposer];
    }
    
    function getActiveInvestorCount() external view returns (uint256) {
        return activeInvestorCount;
    }
    
    function getProposalCountByUser(address _user) external view returns (uint256) {
        return proposalCountByUser[_user];
    }
    
    function getTimeUntilNextProposal(address _user) external view returns (uint256) {
        uint256 nextAllowedTime = lastProposalTime[_user] + PROPOSAL_COOLDOWN;
        if (block.timestamp >= nextAllowedTime) return 0;
        return nextAllowedTime - block.timestamp;
    }
    
    /**
     * @notice Enhanced requirements checker with detailed status
     */
    function checkProposalRequirements(address _proposer) external view returns (
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
    ) {
        userBalance = governanceToken.balanceOf(_proposer);
        currentAllowance = governanceToken.allowance(_proposer, address(this));
        tokensNeeded = TOTAL_TOKENS_REQUIRED;
        depositNeeded = PROPOSAL_DEPOSIT_AMOUNT;
        proposalsCreated = proposalCountByUser[_proposer];
        
        uint256 nextAllowedTime = lastProposalTime[_proposer] + PROPOSAL_COOLDOWN;
        timeUntilNextProposal = block.timestamp >= nextAllowedTime ? 0 : nextAllowedTime - block.timestamp;
        
        hasMinTokens = userBalance >= MIN_TOKENS_FOR_PROPOSAL;
        hasDepositTokens = userBalance >= PROPOSAL_DEPOSIT_AMOUNT;
        hasAllowance = currentAllowance >= PROPOSAL_DEPOSIT_AMOUNT;
        cooldownPassed = timeUntilNextProposal == 0;
        belowMaxProposals = proposalsCreated < maxProposalsPerUser;
        
        canCreateProposal = hasMinTokens && hasDepositTokens && hasAllowance && 
                           cooldownPassed && belowMaxProposals && !paused();
        
        if (paused()) {
            statusMessage = "Contract is paused";
        } else if (!hasMinTokens) {
            statusMessage = "Need at least 100 tokens to create proposals";
        } else if (!hasDepositTokens) {
            statusMessage = "Need at least 100 tokens for deposit";
        } else if (!hasAllowance) {
            statusMessage = "Must approve DAO to spend 100 tokens";
        } else if (!cooldownPassed) {
            statusMessage = "Proposal cooldown active";
        } else if (!belowMaxProposals) {
            statusMessage = "Maximum proposals per user reached";
        } else {
            statusMessage = "Ready to create proposal";
        }
    }
    
    /**
     * @notice Get comprehensive proposal information
     */
    function getProposal(uint256 _proposalId) external view validProposal(_proposalId) returns (
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
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.projectName,
            proposal.projectUrl,
            proposal.fundingGoal,
            proposal.proposalDeposit,
            proposal.endTime,
            proposal.executed,
            proposal.passed,
            proposal.depositRefunded,
            proposal.totalVotesFor,
            proposal.totalVotesAgainst,
            proposal.totalInvested,
            proposal.votersFor,
            proposal.votersAgainst
        );
    }
    
    /**
     * @notice Get user's investment in a specific proposal
     */
    function getUserInvestment(uint256 _proposalId, address _user) 
        external 
        view 
        validProposal(_proposalId) 
        returns (uint256 investment, bool hasVoted, uint256 voteTime) 
    {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.investments[_user],
            proposal.hasVoted[_user],
            proposal.voteTimestamp[_user]
        );
    }
    
    /**
     * @notice Get DAO statistics
     */
    function getDAOStats() external view returns (
        uint256 totalProposals,
        uint256 totalFunding,
        uint256 totalActiveInvestors,
        uint256 totalDepositsLocked,
        uint256 contractBalance
    ) {
        totalProposals = proposalCount;
        totalFunding = fundingRecordCount;
        totalActiveInvestors = activeInvestorCount;
        
        // Calculate total deposits locked
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (!proposals[i].depositRefunded) {
                totalDepositsLocked += proposals[i].proposalDeposit;
            }
        }
        
        contractBalance = governanceToken.balanceOf(address(this));
    }
    
    // ============= ALLOWANCE FUNCTIONS =============
    
    /**
     * @notice Approve the DAO contract to spend tokens on behalf of the user
     * @param _amount Amount of tokens to approve for spending
     * @return success Whether the approval was successful
     */
    function approveDAO(uint256 _amount) external returns (bool success) {
        return governanceToken.approve(address(this), _amount);
    }
    
    /**
     * @notice Increase allowance for the DAO contract
     * @param _addedValue Amount to increase allowance by
     * @return success Whether the increase was successful
     */
    function increaseDAOAllowance(uint256 _addedValue) external returns (bool success) {
        uint256 currentAllowance = governanceToken.allowance(msg.sender, address(this));
        return governanceToken.approve(address(this), currentAllowance + _addedValue);
    }
    
    /**
     * @notice Decrease allowance for the DAO contract
     * @param _subtractedValue Amount to decrease allowance by
     * @return success Whether the decrease was successful
     */
    function decreaseDAOAllowance(uint256 _subtractedValue) external returns (bool success) {
        uint256 currentAllowance = governanceToken.allowance(msg.sender, address(this));
        if (currentAllowance < _subtractedValue) {
            revert("Decrease amount exceeds allowance");
        }
        return governanceToken.approve(address(this), currentAllowance - _subtractedValue);
    }
    
    /**
     * @notice Get current allowance for the DAO contract
     * @param _owner Token owner address
     * @return allowance Current allowance amount
     */
    function getDAOAllowance(address _owner) external view returns (uint256 allowance) {
        return governanceToken.allowance(_owner, address(this));
    }
    
    /**
     * @notice Check if user has sufficient allowance for a specific operation
     * @param _user User address to check
     * @param _requiredAmount Amount needed for the operation
     * @return hasAllowance Whether user has sufficient allowance
     * @return currentAllowance Current allowance amount
     * @return shortfall Amount short if insufficient
     */
    function checkAllowanceSufficiency(address _user, uint256 _requiredAmount) 
        external 
        view 
        returns (
            bool hasAllowance, 
            uint256 currentAllowance, 
            uint256 shortfall
        ) 
    {
        currentAllowance = governanceToken.allowance(_user, address(this));
        hasAllowance = currentAllowance >= _requiredAmount;
        shortfall = hasAllowance ? 0 : _requiredAmount - currentAllowance;
    }
}