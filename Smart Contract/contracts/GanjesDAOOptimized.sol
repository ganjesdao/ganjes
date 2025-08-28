// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./libraries/ReentrancyGuard.sol";
import "./libraries/Pausable.sol";
import "./libraries/SafeERC20.sol";

/**
 * @title GanjesDAOOptimized
 * @notice Optimized DAO contract with enhanced security and efficiency
 * @dev Implements proposal-based governance with token deposits and investment voting
 */
contract GanjesDAOOptimized is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // ============= STATE VARIABLES =============

    // Token and admin configuration
    IERC20 public immutable governanceToken;
    address public immutable admin;
    mapping(address => bool) public admins;
    uint256 public adminCount;

    // DAO parameters - Made configurable with bounds
    uint256 public minInvestmentAmount;
    uint256 public votingDuration;
    uint256 public maxProposalsPerUser; // NEW: Prevent spam

    // Enhanced constants with better naming
    uint256 public constant MIN_TOKENS_FOR_PROPOSAL = 100 * 10 ** 18;
    uint256 public constant PROPOSAL_CREATION_FEE = MIN_TOKENS_FOR_PROPOSAL; // Non-refundable fee
    uint256 public constant TOTAL_TOKENS_REQUIRED = MIN_TOKENS_FOR_PROPOSAL;
    uint256 public constant MIN_QUORUM_PERCENT = 50;
    uint256 public constant MIN_VOTING_DURATION = 1 minutes;
    uint256 public constant MAX_VOTING_DURATION = 30 days;
    uint256 public constant MAX_FUNDING_GOAL = 1_000_000 * 10 ** 18; // NEW: 1M token max
    uint256 public constant MIN_FUNDING_GOAL = 10 * 10 ** 18; // NEW: 10 token min
    uint256 public constant MAX_EMERGENCY_WITHDRAW_PERCENT = 5; // 5% max emergency withdraw

    // Proposal structure - Optimized layout
    struct Proposal {
        uint256 id;
        address proposer;
        uint256 fundingGoal;
        uint256 creationFee; // Non-refundable fee
        uint256 totalVotesFor;
        uint256 totalVotesAgainst;
        uint256 totalInvested;
        uint256 endTime;
        uint32 votersFor;
        uint32 votersAgainst;
        bool executed;
        bool passed;
        bool rejected; // New field to track rejected proposals
        string description;
        string projectName;
        string projectUrl;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteTimestamp;
        mapping(address => uint256) investments;
        mapping(address => bool) voteSupport; // Track vote support
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

    struct ProposalRequirements {
        bool canCreateProposal;
        bool hasMinTokens;
        bool hasDepositTokens;
        bool hasAllowance;
        bool cooldownPassed;
        bool belowMaxProposals;
        uint256 userBalance;
        uint256 currentAllowance;
        uint256 tokensNeeded;
        uint256 depositNeeded;
        uint256 timeUntilNextProposal;
        uint256 proposalsCreated;
        string statusMessage;
    }

    // Storage - Optimized organization
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256[] public allProposalIds;

    mapping(uint256 => FundingRecord) public fundingHistory;
    uint256 public fundingRecordCount;

    mapping(address => uint256[]) public proposalsByProposer;
    mapping(address => VoteRecord[]) public votesByInvestor;

    mapping(address => uint256) public totalCreationFeesPaid;
    mapping(address => uint256) public proposalCountByUser;

    // NEW: Track investors per proposal
    mapping(uint256 => address[]) public proposalInvestors;
    mapping(uint256 => mapping(address => uint256))
        public proposalInvestorIndex;

    // Pull payment pattern for refunds (eliminates reentrancy risk)
    mapping(address => uint256) public pendingRefunds;

    // SECURITY FIX: Track committed funds for proper emergency withdrawal calculation
    uint256 public totalCommittedFunds; // Sum of all active proposal funding goals
    mapping(uint256 => bool) public proposalFundsCommitted; // Track which proposals have committed funds

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

    event ProposalExecuted(
        uint256 indexed proposalId,
        bool passed,
        uint256 amountAllocated,
        uint256 timestamp,
        string message
    );
    event ProposalRejected(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 timestamp,
        string reason
    );

    event AutoRefundProcessed(
        uint256 indexed proposalId,
        address indexed investor,
        uint256 amount,
        uint256 timestamp
    );
    event RefundClaimed(
        uint256 indexed proposalId,
        address indexed investor,
        uint256 amount,
        uint256 timestamp
    );
    event PendingRefundWithdrawn(
        address indexed investor,
        uint256 amount,
        uint256 timestamp
    );
    event FundsWithdrawn(
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    event EmergencyWithdrawal(
        address indexed recipient,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    event AdminAdded(
        address indexed newAdmin,
        address indexed addedBy,
        uint256 timestamp
    );
    event AdminRemoved(
        address indexed removedAdmin,
        address indexed removedBy,
        uint256 timestamp
    );
    event ConfigurationChanged(
        string indexed parameter,
        uint256 oldValue,
        uint256 newValue,
        uint256 timestamp
    );
    event ProposalVotingTimeChanged(
        uint256 indexed proposalId,
        uint256 oldEndTime,
        uint256 newEndTime,
        uint256 timeChange,
        bool isExtension,
        uint256 timestamp
    );

    // ============= ERRORS - Gas efficient custom errors =============

    error InsufficientTokens(uint256 required, uint256 available);
    error InsufficientAllowance(uint256 required, uint256 available);
    error InvalidProposal(uint256 proposalId);
    error ProposalAlreadyExecuted(uint256 proposalId);
    error VotingPeriodEnded(uint256 proposalId);
    error VotingPeriodNotEnded(uint256 proposalId);
    // error AlreadyVoted(uint256 proposalId);
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

    modifier validProposal(uint256 proposalId) {
        if (proposalId == 0 || proposalId > proposalCount) {
            revert InvalidProposal(proposalId);
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
        minInvestmentAmount = 10 * 10 ** 18;
        votingDuration = 5 minutes;
        maxProposalsPerUser = 10; // NEW: Default limit

        emit AdminAdded(msg.sender, address(0), block.timestamp);
        emit ConfigurationChanged(
            "minInvestmentAmount",
            0,
            minInvestmentAmount,
            block.timestamp
        );
        emit ConfigurationChanged(
            "votingDuration",
            0,
            votingDuration,
            block.timestamp
        );
    }

    // ============= CORE FUNCTIONS =============

    /**
     * @notice Create a new proposal with enhanced validation
     * @param description Detailed description of the proposal
     * @param projectName Name of the project
     * @param projectUrl URL for project information
     * @param fundingGoal Amount of tokens requested
     */
    function createProposal(
        string calldata description,
        string calldata projectName,
        string calldata projectUrl,
        uint256 fundingGoal
    ) external onlyProposalCreator nonReentrant whenNotPausedCustom {
        // Enhanced validation
        if (fundingGoal < MIN_FUNDING_GOAL || fundingGoal > MAX_FUNDING_GOAL) {
            revert InvalidFundingGoal(fundingGoal);
        }

        if (
            bytes(projectName).length == 0 ||
            bytes(projectUrl).length == 0 ||
            bytes(description).length == 0
        ) {
            revert("Empty required fields");
        }

        // NEW: Cooldown check to prevent spam
        if (
            block.timestamp < lastProposalTime[msg.sender] + PROPOSAL_COOLDOWN
        ) {
            uint256 timeRemaining = (lastProposalTime[msg.sender] +
                PROPOSAL_COOLDOWN) - block.timestamp;
            revert ProposalCooldownActive(timeRemaining);
        }

        // NEW: Max proposals per user check
        if (proposalCountByUser[msg.sender] >= maxProposalsPerUser) {
            revert MaxProposalsReached(maxProposalsPerUser);
        }

        // CEI Pattern: Update state first
        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.projectName = projectName;
        newProposal.projectUrl = projectUrl;
        newProposal.fundingGoal = fundingGoal;
        newProposal.creationFee = PROPOSAL_CREATION_FEE;
        newProposal.endTime = block.timestamp + votingDuration;
        newProposal.executed = false;
        newProposal.passed = false;
        newProposal.rejected = false;
        newProposal.votersFor = 0;
        newProposal.votersAgainst = 0;
        newProposal.totalInvested = 0;

        // Update tracking before external call
        totalCreationFeesPaid[msg.sender] += PROPOSAL_CREATION_FEE;
        proposalCountByUser[msg.sender]++;
        lastProposalTime[msg.sender] = block.timestamp;

        // SECURITY FIX: Track committed funds for emergency withdrawal calculation
        totalCommittedFunds += fundingGoal;
        proposalFundsCommitted[proposalCount] = true;

        allProposalIds.push(proposalCount);
        proposalsByProposer[msg.sender].push(proposalCount);

        // External call after all state updates - using SafeERC20
        governanceToken.safeTransferFrom(
            msg.sender,
            address(this),
            PROPOSAL_CREATION_FEE
        );

        emit ProposalCreated(
            proposalCount,
            msg.sender,
            projectName,
            fundingGoal,
            PROPOSAL_CREATION_FEE,
            newProposal.endTime,
            block.timestamp
        );
    }

    /**
     * @notice Vote on a proposal with investment
     * @dev SECURITY FIX: Vote weight is now based on investment amount only (not token balance)
     * @param proposalId ID of the proposal to vote on
     * @param support True for support, false for against
     * @param investmentAmount Amount of tokens to invest (determines vote weight)
     */
    function vote(
        uint256 proposalId,
        bool support,
        uint256 investmentAmount
    )
        external
        validProposal(proposalId)
        onlyVoter
        nonReentrant
        whenNotPausedCustom
    {
        Proposal storage proposal = proposals[proposalId];

        // Validation checks with custom errors
        if (msg.sender == proposal.proposer)
            revert ProposerCannotVote(proposalId);
        if (block.timestamp >= proposal.endTime)
            revert VotingPeriodEnded(proposalId);
        
        // Allow multiple votes only if increasing investment amount
        if (proposal.hasVoted[msg.sender] && investmentAmount <= proposal.investments[msg.sender]) {
            revert("Can only vote again with increased investment amount");
        }
        
        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId);

        if (investmentAmount < minInvestmentAmount) {
            revert InsufficientTokens(minInvestmentAmount, investmentAmount);
        }
        if (investmentAmount > proposal.fundingGoal) {
            revert("Investment exceeds funding goal");
        }

        // Check balance first
        uint256 voterBalance = governanceToken.balanceOf(msg.sender);
        uint256 previousInvestment = proposal.investments[msg.sender];
        uint256 additionalInvestment = investmentAmount - previousInvestment;
        
        if (voterBalance < additionalInvestment) {
            revert InsufficientTokens(additionalInvestment, voterBalance);
        }

        // Try transfer with better error handling
        // CEI Pattern: Update state first before external calls

        // Track proposal investors
        if (proposal.investments[msg.sender] == 0) {
            proposalInvestors[proposalId].push(msg.sender);
            proposalInvestorIndex[proposalId][msg.sender] =
                proposalInvestors[proposalId].length -
                1;
        }

        // Record vote state updates
        proposal.hasVoted[msg.sender] = true;
        proposal.voteTimestamp[msg.sender] = block.timestamp;
        proposal.voteSupport[msg.sender] = support;
        proposal.investments[msg.sender] = investmentAmount;
        proposal.totalInvested += additionalInvestment;

        // Update vote counts before external call - FIXED: Use investment-based voting
        bool isFirstVote = previousInvestment == 0;
        bool changedSupport = !isFirstVote && (proposal.voteSupport[msg.sender] != support);
        
        if (isFirstVote) {
            // First time voting - add full investment amount as vote weight
            if (support) {
                proposal.totalVotesFor += investmentAmount;
                proposal.votersFor++;
            } else {
                proposal.totalVotesAgainst += investmentAmount;
                proposal.votersAgainst++;
            }
        } else if (changedSupport) {
            // Changed vote support - move vote weight from one side to other
            if (support) {
                // Moving from against to for
                proposal.totalVotesAgainst -= previousInvestment; // Remove old weight
                proposal.totalVotesFor += investmentAmount; // Add new weight
                proposal.votersFor++;
                proposal.votersAgainst--;
            } else {
                // Moving from for to against
                proposal.totalVotesFor -= previousInvestment; // Remove old weight
                proposal.totalVotesAgainst += investmentAmount; // Add new weight
                proposal.votersAgainst++;
                proposal.votersFor--;
            }
        } else {
            // Same support, just increasing investment - adjust vote weight
            uint256 weightIncrease = investmentAmount - previousInvestment;
            if (support) {
                proposal.totalVotesFor += weightIncrease;
            } else {
                proposal.totalVotesAgainst += weightIncrease;
            }
        }

        // Record vote for investor tracking (before external call)
        votesByInvestor[msg.sender].push(
            VoteRecord({
                proposalId: proposalId,
                support: support,
                investmentAmount: investmentAmount,
                timestamp: block.timestamp
            })
        );

        // External call after all state updates - only transfer additional amount using SafeERC20
        if (additionalInvestment > 0) {
            governanceToken.safeTransferFrom(
                msg.sender,
                address(this),
                additionalInvestment
            );
        }

        emit Voted(
            proposalId,
            msg.sender,
            support,
            investmentAmount, // FIXED: Use investment amount as vote weight
            investmentAmount,
            block.timestamp
        );
    }

    /**
     * @notice Execute a proposal after voting period ends
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(
        uint256 proposalId
    )
        external
        validProposal(proposalId)
        onlyAdmin
        nonReentrant
        whenNotPausedCustom
    {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.executed) revert ProposalAlreadyExecuted(proposalId);

        // Allow execution if funding goal is achieved OR voting period has ended
        bool fundingGoalAchieved = proposal.totalInvested >=
            proposal.fundingGoal;
        bool votingPeriodEnded = block.timestamp >= proposal.endTime;

        if (!fundingGoalAchieved && !votingPeriodEnded) {
            revert VotingPeriodNotEnded(proposalId);
        }

        proposal.executed = true;

        // Enhanced proposal evaluation logic
        bool forVotesWin = proposal.totalVotesFor > proposal.totalVotesAgainst;
        bool hasVotes = (proposal.totalVotesFor + proposal.totalVotesAgainst) >
            0;

        // Proposal execution conditions:
        // 1. Funding goal achieved = Pass (regardless of votes)
        // 2. For votes > Against votes AND has votes > 0 = Pass
        // 3. Otherwise = Reject and refund all investors

        if (fundingGoalAchieved || (forVotesWin && hasVotes)) {
            // Case 1: Funding goal achieved - Pass proposal
            proposal.passed = true;

            // Check balance before transfer
            uint256 daoBalance = governanceToken.balanceOf(address(this));
            if (daoBalance < proposal.fundingGoal) {
                revert("Insufficient DAO funds for funding");
            }

            // SECURITY FIX: Remove committed funds since proposal is being funded
            if (proposalFundsCommitted[proposalId]) {
                totalCommittedFunds -= proposal.fundingGoal;
                proposalFundsCommitted[proposalId] = false;
            }

            // Record funding before external call
            fundingRecordCount++;
            fundingHistory[fundingRecordCount] = FundingRecord({
                proposalId: proposalId,
                recipient: proposal.proposer,
                amount: proposal.fundingGoal,
                timestamp: block.timestamp
            });

            // External call after state updates - using SafeERC20
            governanceToken.safeTransfer(
                proposal.proposer,
                proposal.fundingGoal
            );

            emit FundsWithdrawn(
                proposal.proposer,
                proposal.fundingGoal,
                block.timestamp
            );

            string memory successReason = fundingGoalAchieved
                ? "Proposal passed: Funding goal achieved"
                : "Proposal passed: For votes exceeded against votes";

            emit ProposalExecuted(
                proposalId,
                true,
                proposal.fundingGoal,
                block.timestamp,
                successReason
            );
        } else {
            // Case 3: For votes don't win or no votes - Reject and refund all
            proposal.rejected = true;
            
            // SECURITY FIX: Remove committed funds since proposal is rejected
            if (proposalFundsCommitted[proposalId]) {
                totalCommittedFunds -= proposal.fundingGoal;
                proposalFundsCommitted[proposalId] = false;
            }
            
            _processAllInvestorRefunds(proposalId);

            string memory reason = hasVotes
                ? "Against votes exceeded or equaled for votes"
                : "No votes received";

            emit ProposalRejected(
                proposalId,
                proposal.proposer,
                block.timestamp,
                reason
            );

            emit ProposalExecuted(
                proposalId,
                false,
                0,
                block.timestamp,
                string.concat("Proposal rejected: ", reason)
            );
        }
    }

    // ============= REFUND FUNCTIONS =============

    /**
     * @notice Process automatic refunds for ALL investors in rejected proposals
     * @param proposalId ID of the rejected proposal
     */
    function _processAllInvestorRefunds(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        address[] memory investors = proposalInvestors[proposalId];

        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 refundAmount = proposal.investments[investor];

            if (refundAmount > 0) {
                // Clear investment record first (CEI pattern)
                proposal.investments[investor] = 0;

                // Add to pending refunds instead of direct transfer
                pendingRefunds[investor] += refundAmount;

                emit AutoRefundProcessed(
                    proposalId,
                    investor,
                    refundAmount,
                    block.timestamp
                );
            }
        }
    }

    /**
     * @notice Claim refund for failed/rejected proposal investment
     * @param proposalId ID of the failed proposal
     */
    function claimRefund(
        uint256 proposalId
    ) external validProposal(proposalId) nonReentrant {
        Proposal storage proposal = proposals[proposalId];

        if (!proposal.executed) revert("Proposal not yet executed");
        if (proposal.passed) revert("Cannot refund passed proposal");
        if (proposal.investments[msg.sender] == 0)
            revert("No investment to refund");

        uint256 refundAmount = proposal.investments[msg.sender];
        proposal.investments[msg.sender] = 0;

        if (!governanceToken.transfer(msg.sender, refundAmount)) {
            revert TransferFailed();
        }

        emit RefundClaimed(
            proposalId,
            msg.sender,
            refundAmount,
            block.timestamp
        );
    }

    /**
     * @notice Withdraw pending refunds (Pull Payment Pattern)
     * @dev Eliminates reentrancy risk by separating refund processing from token transfers
     */
    function withdrawPendingRefunds() external nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        require(amount > 0, "No pending refunds");

        // Clear pending refunds before external call (CEI pattern)
        pendingRefunds[msg.sender] = 0;

        // Transfer tokens
        require(
            governanceToken.transfer(msg.sender, amount),
            "Refund withdrawal failed"
        );

        emit PendingRefundWithdrawn(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Get complete investor details for a specific proposal
     * @param proposalId ID of the proposal
     * @return investors Array of investor addresses
     * @return investments Array of investment amounts
     * @return voteSupports Array of vote supports (true=for, false=against)
     * @return timestamps Array of vote timestamps
     * @return hasVotedFlags Array indicating if each address has voted
     */
    function getInvestorDetails(
        uint256 proposalId
    )
        external
        view
        validProposal(proposalId)
        returns (
            address[] memory investors,
            uint256[] memory investments,
            bool[] memory voteSupports,
            uint256[] memory timestamps,
            bool[] memory hasVotedFlags
        )
    {
        Proposal storage proposal = proposals[proposalId];
        address[] memory proposalInvestorsList = proposalInvestors[proposalId];
        uint256 investorCount = proposalInvestorsList.length;

        investors = new address[](investorCount);
        investments = new uint256[](investorCount);
        voteSupports = new bool[](investorCount);
        timestamps = new uint256[](investorCount);
        hasVotedFlags = new bool[](investorCount);

        for (uint256 i = 0; i < investorCount; i++) {
            address investor = proposalInvestorsList[i];
            investors[i] = investor;
            investments[i] = proposal.investments[investor];
            voteSupports[i] = proposal.voteSupport[investor];
            timestamps[i] = proposal.voteTimestamp[investor];
            hasVotedFlags[i] = proposal.hasVoted[investor];
        }
    }

    /**
     * @notice Get investor count for a specific proposal
     * @param proposalId ID of the proposal
     * @return count Number of investors in the proposal
     */
    function getInvestorCount(
        uint256 proposalId
    ) external view validProposal(proposalId) returns (uint256 count) {
        return proposalInvestors[proposalId].length;
    }

    // ============= ADMIN FUNCTIONS =============

    /**
     * @notice Set voting duration with enhanced validation
     * @param _duration New voting duration in seconds
     */
    function setVotingDuration(uint256 _duration) external onlyAdmin {
        if (
            _duration < MIN_VOTING_DURATION || _duration > MAX_VOTING_DURATION
        ) {
            revert("Invalid voting duration");
        }

        uint256 oldValue = votingDuration;
        votingDuration = _duration;

        emit ConfigurationChanged(
            "votingDuration",
            oldValue,
            _duration,
            block.timestamp
        );
    }

    /**
     * @notice Set minimum investment amount
     * @param _minInvestmentAmount New minimum investment amount
     */
    function setMinInvestmentAmount(
        uint256 _minInvestmentAmount
    ) external onlyAdmin {
        if (_minInvestmentAmount == 0) revert("Invalid investment amount");

        uint256 oldValue = minInvestmentAmount;
        minInvestmentAmount = _minInvestmentAmount;

        emit ConfigurationChanged(
            "minInvestmentAmount",
            oldValue,
            _minInvestmentAmount,
            block.timestamp
        );
    }

    /**
     * @notice Set maximum proposals per user (NEW)
     * @param _maxProposals New maximum proposals per user
     */
    function setMaxProposalsPerUser(uint256 _maxProposals) external onlyAdmin {
        if (_maxProposals == 0 || _maxProposals > 100)
            revert("Invalid max proposals");

        uint256 oldValue = maxProposalsPerUser;
        maxProposalsPerUser = _maxProposals;

        emit ConfigurationChanged(
            "maxProposalsPerUser",
            oldValue,
            _maxProposals,
            block.timestamp
        );
    }

    /**
     * @notice Extend voting time for a specific active proposal
     * @param proposalId ID of the proposal to extend
     * @param _extensionTime Additional time to add (in seconds)
     */
    function extendProposalVotingTime(
        uint256 proposalId,
        uint256 _extensionTime
    ) external onlyAdmin validProposal(proposalId) {
        if (_extensionTime == 0) revert("Invalid extension time");

        Proposal storage proposal = proposals[proposalId];

        // Can only extend active proposals (not executed and not ended)
        if (proposal.executed) revert("Cannot extend executed proposal");

        uint256 oldEndTime = proposal.endTime;
        uint256 newEndTime = proposal.endTime + _extensionTime;

        // Prevent extending beyond maximum allowed duration from creation
        uint256 maxAllowedEndTime = (proposal.endTime - votingDuration) +
            MAX_VOTING_DURATION;
        if (newEndTime > maxAllowedEndTime) {
            revert("Extension exceeds maximum allowed voting duration");
        }

        proposal.endTime = newEndTime;

        emit ProposalVotingTimeChanged(
            proposalId,
            oldEndTime,
            newEndTime,
            _extensionTime,
            true,
            block.timestamp
        );
    }

    /**
     * @notice Reduce voting time for a specific active proposal
     * @param proposalId ID of the proposal to reduce time
     * @param _reductionTime Time to subtract (in seconds)
     */
    function reduceProposalVotingTime(
        uint256 proposalId,
        uint256 _reductionTime
    ) external onlyAdmin validProposal(proposalId) {
        if (_reductionTime == 0) revert("Invalid reduction time");

        Proposal storage proposal = proposals[proposalId];

        // Can only modify active proposals (not executed)
        if (proposal.executed) revert("Cannot modify executed proposal");

        uint256 oldEndTime = proposal.endTime;

        // Ensure we don't reduce below current time + minimum duration
        uint256 minAllowedEndTime = block.timestamp + MIN_VOTING_DURATION;

        if (proposal.endTime <= _reductionTime) {
            revert("Reduction time too large");
        }

        uint256 newEndTime = proposal.endTime - _reductionTime;

        if (newEndTime < minAllowedEndTime) {
            revert(
                "New end time too early - must allow minimum voting duration"
            );
        }

        proposal.endTime = newEndTime;

        emit ProposalVotingTimeChanged(
            proposalId,
            oldEndTime,
            newEndTime,
            _reductionTime,
            false,
            block.timestamp
        );
    }

    /**
     * @notice Add new admin with enhanced validation
     * @param _newAdmin Address of new admin
     */
    function addAdmin(
        address _newAdmin
    ) external onlyAdmin validAddress(_newAdmin) {
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
    function removeAdmin(
        address _admin
    ) external onlyAdmin validAddress(_admin) {
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
     * @notice Emergency withdraw with enhanced safety - SECURITY FIX APPLIED
     * @dev Fixed calculation excludes committed proposal funds from emergency withdrawal limit
     * @param _amount Amount to withdraw
     * @param _to Recipient address
     * @param _reason Reason for emergency withdrawal
     */
    function emergencyWithdraw(
        uint256 _amount,
        address _to,
        string calldata _reason
    ) external onlyAdmin validAddress(_to) nonReentrant {
        if (_amount == 0) revert("Invalid amount");
        if (bytes(_reason).length == 0) revert("Reason required");

        uint256 daoBalance = governanceToken.balanceOf(address(this));
        
        // SECURITY FIX: Calculate emergency withdrawal based on uncommitted funds only
        // This prevents withdrawal of funds committed to active proposals
        uint256 uncommittedFunds = daoBalance > totalCommittedFunds ? daoBalance - totalCommittedFunds : 0;
        uint256 maxWithdraw = (uncommittedFunds * MAX_EMERGENCY_WITHDRAW_PERCENT) / 100;

        if (_amount > maxWithdraw) revert("Exceeds emergency withdrawal limit");
        if (daoBalance < _amount) revert("Insufficient balance");
        if (uncommittedFunds < _amount) revert("Cannot withdraw committed proposal funds");

        if (!governanceToken.transfer(_to, _amount)) {
            revert TransferFailed();
        }

        emit EmergencyWithdrawal(_to, _amount, _reason, block.timestamp);
    }

    // ============= VIEW FUNCTIONS =============

    /**
     * @notice Get all proposal IDs by proposer address
     * @param _proposer Address of the proposal creator
     */
    function getProposalsIDByProposer(
        address _proposer
    ) external view returns (uint256[] memory) {
        return proposalsByProposer[_proposer];
    }

    /**
     * @notice Get all proposal IDs that an investor has voted on
     * @param _investor Address of the investor
     * @return proposalIds Array of proposal IDs the investor has voted on
     */
    function getProposalsIdByInvestor(
        address _investor
    ) external view returns (uint256[] memory proposalIds) {
        // Count how many proposals the investor has voted on
        uint256 count = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (proposals[i].hasVoted[_investor]) {
                count++;
            }
        }

        // Create array and populate with proposal IDs
        proposalIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (proposals[i].hasVoted[_investor]) {
                proposalIds[index] = i;
                index++;
            }
        }
    }

    function getAllProposalIds() external view returns (uint256[] memory) {
        return allProposalIds;
    }

    function getTotalProposals() external view returns (uint256) {
        return proposalCount;
    }

    function getTotalCreationFeesPaid(
        address _proposer
    ) external view returns (uint256) {
        return totalCreationFeesPaid[_proposer];
    }

    function getProposalCountByUser(
        address _user
    ) external view returns (uint256) {
        return proposalCountByUser[_user];
    }

    function getTimeUntilNextProposal(
        address _user
    ) external view returns (uint256) {
        uint256 nextAllowedTime = lastProposalTime[_user] + PROPOSAL_COOLDOWN;
        if (block.timestamp >= nextAllowedTime) return 0;
        return nextAllowedTime - block.timestamp;
    }

    /**
     * @notice Enhanced requirements checker with detailed status
     */
    function checkProposalRequirements(
        address _proposer
    ) external view returns (ProposalRequirements memory requirements) {
        requirements.userBalance = governanceToken.balanceOf(_proposer);
        requirements.currentAllowance = governanceToken.allowance(
            _proposer,
            address(this)
        );
        requirements.tokensNeeded = TOTAL_TOKENS_REQUIRED;
        requirements.depositNeeded = PROPOSAL_CREATION_FEE;
        requirements.proposalsCreated = proposalCountByUser[_proposer];

        uint256 nextAllowedTime = lastProposalTime[_proposer] +
            PROPOSAL_COOLDOWN;
        requirements.timeUntilNextProposal = block.timestamp >= nextAllowedTime
            ? 0
            : nextAllowedTime - block.timestamp;

        requirements.hasMinTokens =
            requirements.userBalance >= MIN_TOKENS_FOR_PROPOSAL;
        requirements.hasDepositTokens =
            requirements.userBalance >= PROPOSAL_CREATION_FEE;
        requirements.hasAllowance =
            requirements.currentAllowance >= PROPOSAL_CREATION_FEE;
        requirements.cooldownPassed = requirements.timeUntilNextProposal <= 0;
        requirements.belowMaxProposals =
            requirements.proposalsCreated < maxProposalsPerUser;

        requirements.canCreateProposal =
            requirements.hasMinTokens &&
            requirements.hasDepositTokens &&
            requirements.hasAllowance &&
            requirements.cooldownPassed &&
            requirements.belowMaxProposals &&
            !paused();

        if (paused()) {
            requirements.statusMessage = "Contract is paused";
        } else if (!requirements.hasMinTokens) {
            requirements
                .statusMessage = "Need at least 100 tokens to create proposals";
        } else if (!requirements.hasDepositTokens) {
            requirements.statusMessage = "Need at least 100 tokens for deposit";
        } else if (!requirements.hasAllowance) {
            requirements.statusMessage = "Must approve DAO to spend 100 tokens";
        } else if (!requirements.cooldownPassed) {
            requirements.statusMessage = "Proposal cooldown active";
        } else if (!requirements.belowMaxProposals) {
            requirements.statusMessage = "Maximum proposals per user reached";
        } else {
            requirements.statusMessage = "Ready to create proposal";
        }
    }

    /**
     * @notice Get comprehensive proposal information
     */
    function getProposal(
        uint256 proposalId
    )
        external
        view
        validProposal(proposalId)
        returns (
            uint256 id,
            address proposer,
            string memory description,
            string memory projectName,
            string memory projectUrl,
            uint256 fundingGoal,
            uint256 creationFee,
            uint256 endTime,
            bool executed,
            bool passed,
            bool rejected,
            uint256 totalVotesFor,
            uint256 totalVotesAgainst,
            uint256 totalInvested,
            uint32 votersFor,
            uint32 votersAgainst
        )
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.projectName,
            proposal.projectUrl,
            proposal.fundingGoal,
            proposal.creationFee,
            proposal.endTime,
            proposal.executed,
            proposal.passed,
            proposal.rejected,
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
    function getUserInvestment(
        uint256 proposalId,
        address _user
    )
        external
        view
        validProposal(proposalId)
        returns (uint256 investment, bool hasVoted, uint256 voteTime)
    {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.investments[_user],
            proposal.hasVoted[_user],
            proposal.voteTimestamp[_user]
        );
    }

    /**
     * @notice Get comprehensive DAO statistics
     */
    function getDAOStats()
        external
        view
        returns (
            uint256 totalProposals,
            uint256 activeProposals,
            uint256 passedProposals,
            uint256 rejectedProposals,
            uint256 activeInvestorsCount,
            uint256 inactiveInvestorsCount,
            uint256 totalFunded,
            uint256 allowedFunding,
            uint256 totalDepositsLocked,
            uint256 contractBalance
        )
    {
        totalProposals = proposalCount;
        // activeInvestorsCount removed
        contractBalance = governanceToken.balanceOf(address(this));

        // Count proposal statuses and calculate funding metrics
        for (uint256 i = 1; i <= proposalCount; i++) {
            Proposal storage proposal = proposals[i];

            // Count proposal by status
            if (!proposal.executed && block.timestamp < proposal.endTime) {
                activeProposals++;
            } else if (proposal.executed && proposal.passed) {
                passedProposals++;
                totalFunded += proposal.fundingGoal;
            } else if (
                proposal.executed && (proposal.rejected || !proposal.passed)
            ) {
                rejectedProposals++;
            }

            // Calculate total creation fees paid
            totalDepositsLocked += proposal.creationFee;

            // Calculate allowed funding for active proposals
            if (!proposal.executed && block.timestamp < proposal.endTime) {
                allowedFunding += proposal.fundingGoal;
            }
        }

        // Calculate inactive investors
        // Note: This is an approximation based on total supply vs active investors
        // In a real implementation, you might track this more precisely
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 estimatedHolders = totalSupply / (10 * 10 ** 18); // Estimate holders
        inactiveInvestorsCount = estimatedHolders > activeInvestorsCount
            ? estimatedHolders - activeInvestorsCount
            : 0;
    }

    /**
     * @notice Get emergency withdrawal information and limits
     * @return totalBalance Current contract balance
     * @return committedFunds Funds committed to active proposals  
     * @return uncommittedFunds Available funds for emergency withdrawal
     * @return maxEmergencyWithdraw Maximum amount that can be withdrawn in emergency
     */
    function getEmergencyWithdrawInfo()
        external
        view
        returns (
            uint256 totalBalance,
            uint256 committedFunds,
            uint256 uncommittedFunds,
            uint256 maxEmergencyWithdraw
        )
    {
        totalBalance = governanceToken.balanceOf(address(this));
        committedFunds = totalCommittedFunds;
        uncommittedFunds = totalBalance > committedFunds ? totalBalance - committedFunds : 0;
        maxEmergencyWithdraw = (uncommittedFunds * MAX_EMERGENCY_WITHDRAW_PERCENT) / 100;
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
    function increaseDAOAllowance(
        uint256 _addedValue
    ) external returns (bool success) {
        uint256 currentAllowance = governanceToken.allowance(
            msg.sender,
            address(this)
        );
        return
            governanceToken.approve(
                address(this),
                currentAllowance + _addedValue
            );
    }

    /**
     * @notice Decrease allowance for the DAO contract
     * @param _subtractedValue Amount to decrease allowance by
     * @return success Whether the decrease was successful
     */
    function decreaseDAOAllowance(
        uint256 _subtractedValue
    ) external returns (bool success) {
        uint256 currentAllowance = governanceToken.allowance(
            msg.sender,
            address(this)
        );
        if (currentAllowance < _subtractedValue) {
            revert("Decrease amount exceeds allowance");
        }
        return
            governanceToken.approve(
                address(this),
                currentAllowance - _subtractedValue
            );
    }

    /**
     * @notice Get current allowance for the DAO contract
     * @param _owner Token owner address
     * @return allowance Current allowance amount
     */
    function getDAOAllowance(
        address _owner
    ) external view returns (uint256 allowance) {
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
    function checkAllowanceSufficiency(
        address _user,
        uint256 _requiredAmount
    )
        external
        view
        returns (bool hasAllowance, uint256 currentAllowance, uint256 shortfall)
    {
        currentAllowance = governanceToken.allowance(_user, address(this));
        hasAllowance = currentAllowance >= _requiredAmount;
        shortfall = hasAllowance ? 0 : _requiredAmount - currentAllowance;
    }
}
