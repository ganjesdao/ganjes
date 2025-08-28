// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IERC20.sol";
import "../libraries/ReentrancyGuard.sol";
import "../libraries/Pausable.sol";
import "../libraries/SafeERC20.sol";

/**
 * @title ProposalManagement
 * @notice Manages proposal creation, tracking, and lifecycle
 * @dev Abstract contract for proposal-related functionality
 */
abstract contract ProposalManagement is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // ============= PROPOSAL CONSTANTS =============

    uint256 public constant MIN_TOKENS_FOR_PROPOSAL = 100 * 10 ** 18;
    uint256 public constant PROPOSAL_CREATION_FEE = 100 * 10 ** 18; // Non-refundable fee
    uint256 public constant TOTAL_TOKENS_REQUIRED = MIN_TOKENS_FOR_PROPOSAL;
    uint256 public constant MAX_FUNDING_GOAL = 1e6 * 1e18; // 1 million tokens
    uint256 public constant MIN_FUNDING_GOAL = 10 * 10 ** 18;
    uint256 public constant PROPOSAL_COOLDOWN = 1 hours;

    // ============= PROPOSAL STRUCTURES =============

    struct Proposal {
        uint256 id;
        address proposer;
        uint256 fundingGoal;
        uint256 creationFee;
        uint256 totalVotesFor;
        uint256 totalVotesAgainst;
        uint256 totalInvested;
        uint256 endTime;
        uint32 votersFor;
        uint32 votersAgainst;
        bool executed;
        bool passed;
        bool rejected;
        string description;
        string projectName;
        string projectUrl;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteTimestamp;
        mapping(address => uint256) investments;
    }

    // ============= PROPOSAL STORAGE =============

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256[] public allProposalIds;

    mapping(address => uint256[]) public proposalsByProposer;
    mapping(address => uint256) public proposalCountByUser;
    mapping(address => uint256) public totalCreationFeesPaid;
    mapping(address => uint256) public lastProposalTime;

    // Configuration
    uint256 public votingDuration;
    uint256 public maxProposalsPerUser;

    // Token reference
    IERC20 public immutable governanceToken;

    // ============= PROPOSAL EVENTS =============

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string indexed projectName,
        uint256 fundingGoal,
        uint256 proposalDeposit,
        uint256 endTime,
        uint256 timestamp
    );

    event ProposalRejected(
        uint256 indexed proposalId,
        address indexed proposer,
        uint256 timestamp,
        string reason
    );

    // ============= PROPOSAL ERRORS =============

    error InsufficientTokens(uint256 required, uint256 available);
    error InsufficientAllowance(uint256 required, uint256 available);
    error InvalidProposal(uint256 proposalId);
    error InvalidFundingGoal(uint256 goal);
    error ProposalCooldownActive(uint256 timeRemaining);
    error MaxProposalsReached(uint256 maxAllowed);
    error TransferFailed();
    error ContractPaused();

    // ============= PROPOSAL MODIFIERS =============

    modifier onlyProposalCreator() {
        uint256 userBalance = governanceToken.balanceOf(msg.sender);
        if (userBalance < TOTAL_TOKENS_REQUIRED) {
            revert InsufficientTokens(TOTAL_TOKENS_REQUIRED, userBalance);
        }
        _;
    }

    modifier validProposal(uint256 _proposalId) {
        if (_proposalId == 0 || _proposalId > proposalCount) {
            revert InvalidProposal(_proposalId);
        }
        _;
    }

    modifier whenNotPausedCustom() {
        if (paused()) revert ContractPaused();
        _;
    }

    // ============= CONSTRUCTOR =============

    constructor(address _governanceToken) {
        governanceToken = IERC20(_governanceToken);
        proposalCount = 0;
        votingDuration = 5 minutes;
        maxProposalsPerUser = 10;
    }

    // ============= PROPOSAL FUNCTIONS =============

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
    ) external onlyProposalCreator nonReentrant whenNotPausedCustom {
        // Enhanced validation
        if (
            _fundingGoal < MIN_FUNDING_GOAL || _fundingGoal > MAX_FUNDING_GOAL
        ) {
            revert InvalidFundingGoal(_fundingGoal);
        }

        if (
            bytes(_projectName).length == 0 ||
            bytes(_projectUrl).length == 0 ||
            bytes(_description).length == 0
        ) {
            revert("Empty required fields");
        }

        // Cooldown check to prevent spam
        if (
            block.timestamp < lastProposalTime[msg.sender] + PROPOSAL_COOLDOWN
        ) {
            uint256 timeRemaining = (lastProposalTime[msg.sender] +
                PROPOSAL_COOLDOWN) - block.timestamp;
            revert ProposalCooldownActive(timeRemaining);
        }

        // Max proposals per user check
        if (proposalCountByUser[msg.sender] >= maxProposalsPerUser) {
            revert MaxProposalsReached(maxProposalsPerUser);
        }

        // Check allowance and transfer creation fee
        uint256 currentAllowance = governanceToken.allowance(
            msg.sender,
            address(this)
        );
        if (currentAllowance < PROPOSAL_CREATION_FEE) {
            revert InsufficientAllowance(
                PROPOSAL_CREATION_FEE,
                currentAllowance
            );
        }

        // EFFECTS BEFORE INTERACTIONS (Fix reentrancy vulnerability)
        // Update state variables BEFORE external calls
        totalCreationFeesPaid[msg.sender] += PROPOSAL_CREATION_FEE;
        proposalCountByUser[msg.sender]++;
        lastProposalTime[msg.sender] = block.timestamp;
        
        // Create proposal
        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.description = _description;
        newProposal.projectName = _projectName;
        newProposal.projectUrl = _projectUrl;
        newProposal.fundingGoal = _fundingGoal;
        newProposal.creationFee = PROPOSAL_CREATION_FEE;
        newProposal.endTime = block.timestamp + votingDuration;
        newProposal.executed = false;
        newProposal.passed = false;
        newProposal.rejected = false;
        newProposal.votersFor = 0;
        newProposal.votersAgainst = 0;
        newProposal.totalInvested = 0;

        // INTERACTION LAST (external call after state changes)
        // Transfer creation fee (non-refundable) using SafeERC20
        governanceToken.safeTransferFrom(
            msg.sender,
            address(this),
            PROPOSAL_CREATION_FEE
        );

        allProposalIds.push(proposalCount);
        proposalsByProposer[msg.sender].push(proposalCount);

        emit ProposalCreated(
            proposalCount,
            msg.sender,
            _projectName,
            _fundingGoal,
            PROPOSAL_CREATION_FEE,
            newProposal.endTime,
            block.timestamp
        );
    }

    // Note: Creation fee is non-refundable - no refund function needed

    // ============= PROPOSAL VIEW FUNCTIONS =============

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
     * @notice Get comprehensive proposal information
     */
    function getProposal(
        uint256 _proposalId
    )
        external
        view
        validProposal(_proposalId)
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
        Proposal storage proposal = proposals[_proposalId];
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
     * @notice Get proposal details by proposer address and proposal index
     * @param _proposer Address of the proposal creator
     * @param _index Index of the proposal in the proposer's proposal list (0-based)
     */
    function getProposalByAddress(
        address _proposer,
        uint256 _index
    )
        external
        view
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
        require(
            proposalsByProposer[_proposer].length > _index,
            "Proposal index out of bounds"
        );

        uint256 proposalId = proposalsByProposer[_proposer][_index];
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
     * @notice Get all proposal IDs by proposer address
     * @param _proposer Address of the proposal creator
     */
    function getProposalsIDByProposer(
        address _proposer
    ) external view returns (uint256[] memory) {
        return proposalsByProposer[_proposer];
    }

    /**
     * @notice Enhanced requirements checker with detailed status
     */
    function checkProposalRequirements(
        address _proposer
    )
        external
        view
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
    {
        userBalance = governanceToken.balanceOf(_proposer);
        currentAllowance = governanceToken.allowance(_proposer, address(this));
        tokensNeeded = TOTAL_TOKENS_REQUIRED;
        depositNeeded = PROPOSAL_CREATION_FEE;
        proposalsCreated = proposalCountByUser[_proposer];

        uint256 nextAllowedTime = lastProposalTime[_proposer] +
            PROPOSAL_COOLDOWN;
        timeUntilNextProposal = block.timestamp >= nextAllowedTime
            ? 0
            : nextAllowedTime - block.timestamp;

        hasMinTokens = userBalance >= MIN_TOKENS_FOR_PROPOSAL;
        hasDepositTokens = userBalance >= PROPOSAL_CREATION_FEE;
        hasAllowance = currentAllowance >= PROPOSAL_CREATION_FEE;
        cooldownPassed = timeUntilNextProposal <= 0;
        belowMaxProposals = proposalsCreated < maxProposalsPerUser;

        canCreateProposal =
            hasMinTokens &&
            hasDepositTokens &&
            hasAllowance &&
            cooldownPassed &&
            belowMaxProposals &&
            !paused();

        if (paused()) {
            statusMessage = "Contract is paused";
        } else if (!hasMinTokens) {
            statusMessage = "Need at least 100 tokens to create proposals";
        } else if (!hasDepositTokens) {
            statusMessage = "Need at least 50 tokens for deposit";
        } else if (!hasAllowance) {
            statusMessage = "Must approve DAO to spend 50 tokens";
        } else if (!cooldownPassed) {
            statusMessage = "Proposal cooldown active";
        } else if (!belowMaxProposals) {
            statusMessage = "Maximum proposals per user reached";
        } else {
            statusMessage = "Ready to create proposal";
        }
    }
}
