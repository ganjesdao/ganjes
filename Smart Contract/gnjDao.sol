// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// IERC20 interface
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// @notice For large-scale DAOs, use off-chain indexing (e.g., The Graph, SubQuery) to query approved and running proposals efficiently.
// @notice Index `ProposalCreated`, `ProposalExecuted`, and `InvestorDeactivated` events to track proposal and investor status.
// @notice Use paginated `getApprovedProposals(uint256, uint256)` and `getRunningProposals(uint256, uint256)` for on-chain queries with limited gas consumption.
// @dev Future optimization: Consider maintaining separate arrays for approved/running proposals to reduce iteration gas costs.
contract GanjesDAO {
    // Custom ReentrancyGuard logic
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    // Pausable state
    bool public paused;

    // Token used for voting and funding
    IERC20 public governanceToken;

    // Average block time (12 seconds for Ethereum)
    uint256 public constant AVERAGE_BLOCK_TIME = 12; // seconds

    // Multi-Sig Structure
    struct MultiSigProposal {
        uint256 id;
        address proposer;
        string action;
        uint256 value;
        address target;
        uint256 approvals;
        mapping(address => bool) hasApproved;
        bool executed;
    }

    // Multi-Sig Variables
    mapping(address => bool) public owners;
    uint256 public requiredApprovals;
    uint256 public multiSigProposalCount;
    mapping(uint256 => MultiSigProposal) public multiSigProposals;
    uint256 public constant MIN_OWNERS = 3; // Fixed to ensure robust multi-sig security
    uint256 public constant MAX_OWNERS = 10; // Fixed to prevent governance complexity

    // Minimum investment amount required to vote (set by parameter proposal)
    uint256 public minInvestmentAmount;

    // Voting duration in blocks (set by parameter proposal)
    uint256 public votingDuration; // in blocks

    // Configurable governance parameters
    uint256 public minTokensForProposal = 100 * 10**18; // Minimum tokens required to propose
    uint256 public minVotingTokens = 10 * 10**18; // Minimum tokens required to vote
    uint256 public minQuorumPercent = 50; // Minimum quorum percentage for proposal approval

    // Fixed constants with justification
    uint256 public constant MIN_VOTING_DURATION = 5 * 60 / AVERAGE_BLOCK_TIME; // 5 minutes in blocks (~25 blocks)
    uint256 public constant MAX_VOTING_DURATION = 30 * 24 * 60 * 60 / AVERAGE_BLOCK_TIME; // 30 days in blocks (~216,000 blocks)
    uint256 public constant INACTIVITY_PERIOD = 90 * 24 * 60 * 60 / AVERAGE_BLOCK_TIME; // 90 days in blocks (~648,000 blocks)

    // Proposal structure for funding
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        string projectName;
        string projectUrl;
        uint256 fundingGoal;
        uint256 totalVotesFor;
        uint256 totalVotesAgainst;
        uint256 votersFor;
        uint256 votersAgainst;
        uint256 totalInvested;
        uint256 endBlock; // Changed to block number
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteBlock; // Changed to block number
        mapping(address => uint256) investments;
    }

    // Parameter Proposal structure
    enum ProposalType { Funding, Parameter }
    struct ParameterProposal {
        uint256 id;
        string parameter;
        uint256 value;
        uint256 totalVotesFor;
        uint256 totalVotesAgainst;
        uint256 votersFor;
        uint256 votersAgainst;
        uint256 endBlock; // Changed to block number
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
    }

    // Funding record structure
    struct FundingRecord {
        uint256 proposalId;
        address recipient;
        uint256 amount;
        uint256 blockNumber; // Changed to block number
    }

    // Vote record structure for investor tracking
    struct VoteRecord {
        uint256 proposalId;
        bool support;
        uint256 investmentAmount;
        uint256 blockNumber; // Changed to block number
    }

    // Mappings and arrays for history
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256[] public allProposalIds;
    mapping(uint256 => ParameterProposal) public parameterProposals;
    uint256 public parameterProposalCount;
    uint256[] public allParameterProposalIds;
    mapping(uint256 => FundingRecord) public fundingHistory;
    uint256 public fundingRecordCount;
    mapping(address => uint256[]) public proposalsByProposer;
    mapping(address => VoteRecord[]) public votesByInvestor;
    mapping(address => bool) public activeInvestors;
    uint256 public activeInvestorCount;
    mapping(address => uint256) public lastInvestorActivity; // Tracks last activity block number

    // Emergency execution tracking
    mapping(uint256 => bool) public emergencyExecuted;

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        string projectName,
        string projectUrl,
        uint256 fundingGoal,
        uint256 blockNumber,
        uint256 timestamp // Kept for off-chain compatibility
    );
    event ParameterProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string parameter,
        uint256 value,
        uint256 blockNumber,
        uint256 timestamp
    );
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight, uint256 investmentAmount, uint256 blockNumber, uint256 timestamp);
    event ParameterProposalVoted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight,
        uint256 blockNumber,
        uint256 timestamp
    );
    event ProposalExecuted(
        uint256 indexed proposalId,
        bool passed,
        uint256 amountAllocated,
        uint256 actualAmountTransferred,
        bool isFullyFunded,
        uint256 blockNumber,
        uint256 timestamp
    );
    event ParameterProposalExecuted(
        uint256 indexed proposalId,
        string parameter,
        uint256 value,
        bool passed,
        uint256 blockNumber,
        uint256 timestamp
    );
    event FundsWithdrawn(address indexed recipient, uint256 amount, uint256 blockNumber, uint256 timestamp);
    event FundsDeposited(address indexed depositor, uint256 amount, uint256 blockNumber, uint256 timestamp);
    event VotingDurationSet(uint256 duration, uint256 blockNumber, uint256 timestamp);
    event MinInvestmentAmountSet(uint256 amount, uint256 blockNumber, uint256 timestamp);
    event MinTokensForProposalSet(uint256 amount, uint256 blockNumber, uint256 timestamp);
    event MinVotingTokensSet(uint256 amount, uint256 blockNumber, uint256 timestamp);
    event MinQuorumPercentSet(uint256 percent, uint256 blockNumber, uint256 timestamp);
    event VotingDurationIncreased(uint256 indexed proposalId, uint256 newEndBlock, uint256 blockNumber, uint256 timestamp);
    event MultiSigProposalCreated(uint256 indexed proposalId, address indexed proposer, string action, uint256 value, address target, uint256 blockNumber, uint256 timestamp);
    event MultiSigProposalApproved(uint256 indexed proposalId, address indexed approver, uint256 blockNumber, uint256 timestamp);
    event MultiSigProposalExecuted(uint256 indexed proposalId, string action, uint256 value, address target, uint256 blockNumber, uint256 timestamp);
    event InvestorDeactivated(address indexed investor, uint256 blockNumber, uint256 timestamp);
    event Paused(address indexed owner, uint256 blockNumber, uint256 timestamp);
    event Unpaused(address indexed owner, uint256 blockNumber, uint256 timestamp);
    event EmergencyExecution(uint256 indexed proposalId, address indexed executor, uint256 blockNumber, uint256 timestamp);

    // Modifiers
    modifier onlyOwner() {
        require(owners[msg.sender], "Only owner can perform this action");
        _;
    }

    // SECURITY FIX: Improved token holder validation
    modifier onlyTokenHolder(bool isProposal) {
        if (isProposal) {
            require(governanceToken.balanceOf(msg.sender) >= minTokensForProposal, "Insufficient tokens to propose");
        } else {
            require(governanceToken.balanceOf(msg.sender) >= minVotingTokens, "Insufficient tokens to vote");
        }
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // SECURITY FIX: Added emergency modifier
    modifier onlyEmergency() {
        require(paused, "Only available during emergency pause");
        _;
    }

    // Constructor
    constructor(address _governanceToken, address[] memory _initialOwners, uint256 _requiredApprovals) {
        require(_governanceToken != address(0), "Invalid token address");
        require(_initialOwners.length >= MIN_OWNERS, "At least 3 owners required");
        require(_initialOwners.length <= MAX_OWNERS, "Too many owners");
        require(_requiredApprovals > 0 && _requiredApprovals <= _initialOwners.length, "Invalid required approvals");

        governanceToken = IERC20(_governanceToken);
        for (uint256 i = 0; i < _initialOwners.length; i++) {
            require(_initialOwners[i] != address(0), "Invalid owner address");
            require(!owners[_initialOwners[i]], "Duplicate owner");
            owners[_initialOwners[i]] = true;
        }
        requiredApprovals = _requiredApprovals;
        _status = _NOT_ENTERED;
        minInvestmentAmount = 10 * 10**18;
        votingDuration = 5 * 60 / AVERAGE_BLOCK_TIME; // 5 minutes in blocks (~25 blocks)
        paused = false;
    }

    // Check if investor is active based on balance and activity
    function _checkInvestorActivity(address investor) internal view returns (bool) {
        // Investor is active if they have a non-zero balance or recent activity
        return governanceToken.balanceOf(investor) > 0 || 
               (lastInvestorActivity[investor] > 0 && block.number <= lastInvestorActivity[investor] + INACTIVITY_PERIOD);
    }

    // Deactivate inactive investors (called by multi-sig owners)
    function deactivateInactiveInvestors(address[] memory investors) external onlyOwner nonReentrant {
        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            if (activeInvestors[investor] && !_checkInvestorActivity(investor)) {
                activeInvestors[investor] = false;
                activeInvestorCount--;
                lastInvestorActivity[investor] = 0; // Reset activity block
                emit InvestorDeactivated(investor, block.number, block.timestamp);
            }
        }
    }

    // Get approved funding proposals count and IDs with pagination
    function getApprovedProposals(uint256 startIndex, uint256 limit) 
        external 
        view 
        returns (uint256 count, uint256[] memory approvedIds) 
    {
        require(startIndex <= proposalCount, "Invalid start index");
        require(limit > 0, "Limit must be greater than zero");

        // Temporary array to store matching IDs
        uint256[] memory tempIds = new uint256[](limit);
        uint256 approvedCount = 0;

        // Iterate through proposals starting from startIndex
        for (uint256 i = startIndex; i <= proposalCount && approvedCount < limit; i++) {
            if (proposals[i].passed && proposals[i].executed) {
                tempIds[approvedCount] = i;
                approvedCount++;
            }
        }

        // Copy to final array of exact size
        approvedIds = new uint256[](approvedCount);
        for (uint256 i = 0; i < approvedCount; i++) {
            approvedIds[i] = tempIds[i];
        }

        return (approvedCount, approvedIds);
    }

    // Get running funding proposals count and IDs with pagination
    function getRunningProposals(uint256 startIndex, uint256 limit) 
        external 
        view 
        returns (uint256 count, uint256[] memory runningIds) 
    {
        require(startIndex <= proposalCount, "Invalid start index");
        require(limit > 0, "Limit must be greater than zero");

        // Temporary array to store matching IDs
        uint256[] memory tempIds = new uint256[](limit);
        uint256 runningCount = 0;

        // Iterate through proposals starting from startIndex
        for (uint256 i = startIndex; i <= proposalCount && runningCount < limit; i++) {
            if (!proposals[i].executed && block.number < proposals[i].endBlock) {
                tempIds[runningCount] = i;
                runningCount++;
            }
        }

        // Copy to final array of exact size
        runningIds = new uint256[](runningCount);
        for (uint256 i = 0; i < runningCount; i++) {
            runningIds[i] = tempIds[i];
        }

        return (runningCount, runningIds);
    }

    // Deprecated: Use getApprovedProposals(uint256, uint256) with pagination for large projects
    function getAllApprovedProposals() 
        external 
        view 
        returns (uint256 count, uint256[] memory approvedIds) 
    {
        // Inline logic to avoid calling getApprovedProposals
        uint256 startIndex = 1;
        uint256 limit = proposalCount;
        require(startIndex <= proposalCount, "Invalid start index");
        require(limit > 0, "Limit must be greater than zero");

        // Temporary array to store matching IDs
        uint256[] memory tempIds = new uint256[](limit);
        uint256 approvedCount = 0;

        // Iterate through proposals starting from startIndex
        for (uint256 i = startIndex; i <= proposalCount && approvedCount < limit; i++) {
            if (proposals[i].passed && proposals[i].executed) {
                tempIds[approvedCount] = i;
                approvedCount++;
            }
        }

        // Copy to final array of exact size
        approvedIds = new uint256[](approvedCount);
        for (uint256 i = 0; i < approvedCount; i++) {
            approvedIds[i] = tempIds[i];
        }

        return (approvedCount, approvedIds);
    }

    // Deprecated: Use getRunningProposals(uint256, uint256) with pagination for large projects
    function getAllRunningProposals() 
        external 
        view 
        returns (uint256 count, uint256[] memory runningIds) 
    {
        // Inline logic to avoid calling getRunningProposals
        uint256 startIndex = 1;
        uint256 limit = proposalCount;
        require(startIndex <= proposalCount, "Invalid start index");
        require(limit > 0, "Limit must be greater than zero");

        // Temporary array to store matching IDs
        uint256[] memory tempIds = new uint256[](limit);
        uint256 runningCount = 0;

        // Iterate through proposals starting from startIndex
        for (uint256 i = startIndex; i <= proposalCount && runningCount < limit; i++) {
            if (!proposals[i].executed && block.number < proposals[i].endBlock) {
                tempIds[runningCount] = i;
                runningCount++;
            }
        }

        // Copy to final array of exact size
        runningIds = new uint256[](runningCount);
        for (uint256 i = 0; i < runningCount; i++) {
            runningIds[i] = tempIds[i];
        }

        return (runningCount, runningIds);
    }

    // Create a Multi-Sig Proposal
    function createMultiSigProposal(string memory _action, uint256 _value, address _target)
        external
        onlyOwner
        nonReentrant
        returns (uint256)
    {
        require(
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("increaseVotingDuration")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("executeProposal")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("retryFunding")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("batchRefund")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("deactivateInactiveInvestors")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("pause")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("unpause")) ||
            keccak256(abi.encodePacked(_action)) == keccak256(abi.encodePacked("emergencyExecute")),
            "Invalid action"
        );

        multiSigProposalCount++;
        MultiSigProposal storage proposal = multiSigProposals[multiSigProposalCount];
        proposal.id = multiSigProposalCount;
        proposal.proposer = msg.sender;
        proposal.action = _action;
        proposal.value = _value;
        proposal.target = _target;
        proposal.approvals = 1;
        proposal.hasApproved[msg.sender] = true;
        proposal.executed = false;

        emit MultiSigProposalCreated(multiSigProposalCount, msg.sender, _action, _value, _target, block.number, block.timestamp);
        return multiSigProposalCount;
    }

    // Approve a Multi-Sig Proposal
    function approveMultiSigProposal(uint256 _proposalId) external onlyOwner nonReentrant {
        MultiSigProposal storage proposal = multiSigProposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= multiSigProposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        require(!proposal.hasApproved[msg.sender], "Already approved");

        proposal.hasApproved[msg.sender] = true;
        proposal.approvals++;

        emit MultiSigProposalApproved(_proposalId, msg.sender, block.number, block.timestamp);

        if (proposal.approvals >= requiredApprovals) {
            _executeMultiSigProposal(_proposalId);
        }
    }

    // Internal function to execute Multi-Sig Proposal
    function _executeMultiSigProposal(uint256 _proposalId) internal {
        MultiSigProposal storage proposal = multiSigProposals[_proposalId];
        require(!proposal.executed, "Proposal already executed");
        proposal.executed = true;

        if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("increaseVotingDuration"))) {
            require(proposal.value > 0 && proposal.target != address(0), "Invalid parameters");
            Proposal storage daoProposal = proposals[proposal.value];
            require(daoProposal.id > 0, "Invalid DAO proposal ID");
            require(!daoProposal.executed, "DAO Proposal already executed");
            require(daoProposal.endBlock + proposal.value <= block.number + MAX_VOTING_DURATION, "New duration exceeds maximum allowed");
            daoProposal.endBlock += proposal.value;
            emit VotingDurationIncreased(proposal.value, daoProposal.endBlock, block.number, block.timestamp);
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("executeProposal"))) {
            require(proposal.value > 0 && proposal.target == address(0), "Invalid parameters");
            _executeProposal(proposal.value);
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("retryFunding"))) {
            require(proposal.value > 0 && proposal.target == address(0), "Invalid parameters");
            retryFunding(proposal.value);
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("batchRefund"))) {
            require(proposal.value > 0 && proposal.target == address(0), "Invalid parameters");
            // Batch refund requires explicit call with voters list; handled via batchRefund function
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("deactivateInactiveInvestors"))) {
            require(proposal.value == 0 && proposal.target != address(0), "Invalid parameters");
            address[] memory investors = new address[](1);
            investors[0] = proposal.target;
            this.deactivateInactiveInvestors(investors);
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("pause"))) {
            require(!paused, "Contract already paused");
            require(proposal.value == 0 && proposal.target == address(0), "Invalid parameters");
            paused = true;
            emit Paused(msg.sender, block.number, block.timestamp);
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("unpause"))) {
            require(paused, "Contract not paused");
            require(proposal.value == 0 && proposal.target == address(0), "Invalid parameters");
            paused = false;
            emit Unpaused(msg.sender, block.number, block.timestamp);
        } else if (keccak256(abi.encodePacked(proposal.action)) == keccak256(abi.encodePacked("emergencyExecute"))) {
            require(proposal.value > 0 && proposal.target == address(0), "Invalid parameters");
            _emergencyExecuteProposal(proposal.value);
        }

        emit MultiSigProposalExecuted(_proposalId, proposal.action, proposal.value, proposal.target, block.number, block.timestamp);
    }

    // SECURITY FIX: New emergency execution function
    function _emergencyExecuteProposal(uint256 _proposalId) internal {
        require(paused, "Only available during emergency pause");
        require(!emergencyExecuted[_proposalId], "Already emergency executed");
        emergencyExecuted[_proposalId] = true;
        
        // Execute without normal voting period restrictions during emergency
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        
        proposal.executed = true;
        
        // Emergency execution logic - simplified for emergency situations
        if (proposal.totalInvested >= proposal.fundingGoal || 
            (proposal.totalVotesFor > proposal.totalVotesAgainst && proposal.totalVotesFor > 0)) {
            
            uint256 actualAmountTransferred = 0;
            bool isFullyFunded = false;
            (actualAmountTransferred, isFullyFunded) = _tryFinalizeProposal(_proposalId, proposal);
            
            emit ProposalExecuted(
                _proposalId, 
                proposal.passed, 
                proposal.passed ? proposal.fundingGoal : 0, 
                actualAmountTransferred, 
                isFullyFunded, 
                block.number,
                block.timestamp
            );
        }
        
        emit EmergencyExecution(_proposalId, msg.sender, block.number, block.timestamp);
    }

    // Create a Funding Proposal
    function createProposal(
        string memory _description,
        string memory _projectName,
        string memory _projectUrl,
        uint256 _fundingGoal
    )
        external
        onlyTokenHolder(true)
        nonReentrant
        whenNotPaused
    {
        require(_fundingGoal > 0, "Funding goal must be greater than zero");
        require(bytes(_projectName).length > 0, "Project name cannot be empty");
        require(bytes(_projectUrl).length > 0, "Project URL cannot be empty");

        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.description = _description;
        newProposal.projectName = _projectName;
        newProposal.projectUrl = _projectUrl;
        newProposal.fundingGoal = _fundingGoal;
        newProposal.endBlock = block.number + votingDuration;
        newProposal.executed = false;
        newProposal.passed = false;
        newProposal.votersFor = 0;
        newProposal.votersAgainst = 0;
        newProposal.totalInvested = 0;

        allProposalIds.push(proposalCount);
        proposalsByProposer[msg.sender].push(proposalCount);

        lastInvestorActivity[msg.sender] = block.number; // Update activity block
        if (!activeInvestors[msg.sender]) {
            activeInvestors[msg.sender] = true;
            activeInvestorCount++;
        }

        emit ProposalCreated(proposalCount, msg.sender, _description, _projectName, _projectUrl, _fundingGoal, block.number, block.timestamp);
    }

    // Create a Parameter Proposal
    function createParameterProposal(string memory _parameter, uint256 _value)
        external
        onlyTokenHolder(true)
        nonReentrant
        whenNotPaused
    {
        require(
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("votingDuration")) ||
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("minInvestmentAmount")) ||
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("minTokensForProposal")) ||
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("minVotingTokens")) ||
            keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("minQuorumPercent")),
            "Invalid parameter"
        );

        // Convert _value to blocks for votingDuration
        uint256 valueInBlocks = _value;
        if (keccak256(abi.encodePacked(_parameter)) == keccak256(abi.encodePacked("votingDuration"))) {
            valueInBlocks = _value / AVERAGE_BLOCK_TIME; // Convert seconds to blocks
            require(valueInBlocks >= MIN_VOTING_DURATION, "Voting duration too short");
            require(valueInBlocks <= MAX_VOTING_DURATION, "Voting duration too long");
        }

        parameterProposalCount++;
        ParameterProposal storage newProposal = parameterProposals[parameterProposalCount];
        newProposal.id = parameterProposalCount;
        newProposal.parameter = _parameter;
        newProposal.value = valueInBlocks; // Store in blocks for votingDuration
        newProposal.endBlock = block.number + votingDuration;
        newProposal.executed = false;
        newProposal.passed = false;

        allParameterProposalIds.push(parameterProposalCount);
        proposalsByProposer[msg.sender].push(parameterProposalCount);

        lastInvestorActivity[msg.sender] = block.number; // Update activity block
        if (!activeInvestors[msg.sender]) {
            activeInvestors[msg.sender] = true;
            activeInvestorCount++;
        }

        emit ParameterProposalCreated(parameterProposalCount, msg.sender, _parameter, _value, block.number, block.timestamp);
    }

    // Vote on a Funding Proposal
    function vote(uint256 _proposalId, bool _support, uint256 _investmentAmount)
        external
        onlyTokenHolder(false)
        nonReentrant
        whenNotPaused
    {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(msg.sender != proposal.proposer, "Proposer cannot vote on own proposal");
        require(block.number < proposal.endBlock, "Voting period has ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Proposal already executed");
        require(_investmentAmount >= minInvestmentAmount, "Investment below minimum amount");
        require(_investmentAmount <= proposal.fundingGoal, "Investment exceeds funding goal");
        require(governanceToken.transferFrom(msg.sender, address(this), _investmentAmount), "Investment transfer failed");

        if (!activeInvestors[msg.sender]) {
            activeInvestors[msg.sender] = true;
            activeInvestorCount++;
        }
        lastInvestorActivity[msg.sender] = block.number;

        proposal.hasVoted[msg.sender] = true;
        proposal.voteBlock[msg.sender] = block.number;
        proposal.investments[msg.sender] = _investmentAmount;
        proposal.totalInvested += _investmentAmount;

        uint256 voterBalance = governanceToken.balanceOf(msg.sender);
        if (_support) {
            proposal.totalVotesFor += voterBalance;
            proposal.votersFor += 1;
        } else {
            proposal.totalVotesAgainst += voterBalance;
            proposal.votersAgainst += 1;
        }

        votesByInvestor[msg.sender].push(VoteRecord({
            proposalId: _proposalId,
            support: _support,
            investmentAmount: _investmentAmount,
            blockNumber: block.number
        }));

        emit Voted(_proposalId, msg.sender, _support, voterBalance, _investmentAmount, block.number, block.timestamp);
    }

    // Vote on a Parameter Proposal
    function voteParameterProposal(uint256 _proposalId, bool _support)
        external
        onlyTokenHolder(false)
        nonReentrant
        whenNotPaused
    {
        ParameterProposal storage proposal = parameterProposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= parameterProposalCount, "Invalid proposal ID");
        require(block.number < proposal.endBlock, "Voting period has ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Proposal already executed");

        if (!activeInvestors[msg.sender]) {
            activeInvestors[msg.sender] = true;
            activeInvestorCount++;
        }
        lastInvestorActivity[msg.sender] = block.number;

        uint256 voterBalance = governanceToken.balanceOf(msg.sender);
        proposal.hasVoted[msg.sender] = true;
        if (_support) {
            proposal.totalVotesFor += voterBalance;
            proposal.votersFor += 1;
        } else {
            proposal.totalVotesAgainst += voterBalance;
            proposal.votersAgainst += 1;
        }

        votesByInvestor[msg.sender].push(VoteRecord({
            proposalId: _proposalId,
            support: _support,
            investmentAmount: 0,
            blockNumber: block.number
        }));

        emit ParameterProposalVoted(_proposalId, msg.sender, _support, voterBalance, block.number, block.timestamp);
    }

    // SECURITY FIX: Execute a Funding Proposal with proper voting period enforcement
    function _executeProposal(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        
        // CRITICAL FIX: Always enforce voting period before execution
        require(block.number >= proposal.endBlock, "Voting period not ended");

        proposal.executed = true;

        uint256 actualAmountTransferred = 0;
        bool isFullyFunded = false;

        // Check if proposal should pass based on investment or voting
        bool shouldPass = false;
        
        if (proposal.totalInvested >= proposal.fundingGoal) {
            shouldPass = true;
        } else {
            uint256 totalSupply = governanceToken.totalSupply();
            uint256 totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
            if (totalVotes >= (totalSupply * minQuorumPercent) / 100 && 
                proposal.totalVotesFor > proposal.totalVotesAgainst) {
                shouldPass = true;
            }
        }

        if (shouldPass) {
            (actualAmountTransferred, isFullyFunded) = _tryFinalizeProposal(_proposalId, proposal);
        }

        emit ProposalExecuted(
            _proposalId, 
            proposal.passed, 
            proposal.passed ? proposal.fundingGoal : 0, 
            actualAmountTransferred, 
            isFullyFunded, 
            block.number,
            block.timestamp
        );
    }

    // Internal helper function to try finalizing proposal
    function _tryFinalizeProposal(uint256 _proposalId, Proposal storage proposal) 
        internal 
        returns (uint256 actualAmountTransferred, bool isFullyFunded) 
    {
        proposal.passed = true;
        uint256 amount = proposal.fundingGoal;
        actualAmountTransferred = 0;
        isFullyFunded = false;

        if (governanceToken.balanceOf(address(this)) >= amount) {
            governanceToken.transfer(proposal.proposer, amount);
            actualAmountTransferred = amount;
            isFullyFunded = true;

            fundingRecordCount++;
            fundingHistory[fundingRecordCount] = FundingRecord({
                proposalId: _proposalId,
                recipient: proposal.proposer,
                amount: amount,
                blockNumber: block.number
            });

            emit FundsWithdrawn(proposal.proposer, amount, block.number, block.timestamp);
        } else if (governanceToken.balanceOf(address(this)) > 0) {
            // Partial funding scenario
            actualAmountTransferred = governanceToken.balanceOf(address(this));
            governanceToken.transfer(proposal.proposer, actualAmountTransferred);

            fundingRecordCount++;
            fundingHistory[fundingRecordCount] = FundingRecord({
                proposalId: _proposalId,
                recipient: proposal.proposer,
                amount: actualAmountTransferred,
                blockNumber: block.number
            });

            emit FundsWithdrawn(proposal.proposer, actualAmountTransferred, block.number, block.timestamp);
        }

        return (actualAmountTransferred, isFullyFunded);
    }

    // Retry funding for a passed but unfunded proposal
    function retryFunding(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(proposal.executed, "Proposal not executed");
        require(proposal.passed, "Proposal not passed");
        require(governanceToken.balanceOf(address(this)) < proposal.fundingGoal, "Already fully funded");

        uint256 amount = proposal.fundingGoal;
        uint256 actualAmountTransferred = governanceToken.balanceOf(address(this)) >= amount 
            ? amount 
            : governanceToken.balanceOf(address(this));
        
        if (actualAmountTransferred > 0) {
            governanceToken.transfer(proposal.proposer, actualAmountTransferred);

            fundingRecordCount++;
            fundingHistory[fundingRecordCount] = FundingRecord({
                proposalId: _proposalId,
                recipient: proposal.proposer,
                amount: actualAmountTransferred,
                blockNumber: block.number
            });

            emit FundsWithdrawn(proposal.proposer, actualAmountTransferred, block.number, block.timestamp);
        }
    }

    // SECURITY IMPROVEMENT: Enhanced refund function with better error handling
    function refundInvestments(uint256 _proposalId) external nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(proposal.executed, "Proposal not executed");
        require(!proposal.passed || (proposal.passed && governanceToken.balanceOf(address(this)) < proposal.fundingGoal), "Proposal fully funded");

        uint256 amount = proposal.investments[msg.sender];
        require(amount > 0, "No investment to refund");

        proposal.investments[msg.sender] = 0;
        proposal.totalInvested -= amount;
        require(governanceToken.transfer(msg.sender, amount), "Refund transfer failed");

        // Check if investor should be deactivated
        if (activeInvestors[msg.sender] && !_checkInvestorActivity(msg.sender)) {
            activeInvestors[msg.sender] = false;
            activeInvestorCount--;
            lastInvestorActivity[msg.sender] = 0;
            emit InvestorDeactivated(msg.sender, block.number, block.timestamp);
        }

        emit FundsWithdrawn(msg.sender, amount, block.number, block.timestamp);
    }

    // Batch refund investments for all voters of a failed or unfunded proposal
    function batchRefund(uint256 _proposalId, address[] memory _voters) external onlyOwner nonReentrant whenNotPaused {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(proposal.executed, "Proposal not executed");
        require(!proposal.passed || (proposal.passed && governanceToken.balanceOf(address(this)) < proposal.fundingGoal), "Proposal fully funded");

        for (uint256 i = 0; i < _voters.length; i++) {
            address voter = _voters[i];
            uint256 amount = proposal.investments[voter];
            if (amount > 0) {
                proposal.investments[voter] = 0;
                proposal.totalInvested -= amount;
                require(governanceToken.transfer(voter, amount), "Refund transfer failed");

                // Check if voter should be deactivated
                if (activeInvestors[voter] && !_checkInvestorActivity(voter)) {
                    activeInvestors[voter] = false;
                    activeInvestorCount--;
                    lastInvestorActivity[voter] = 0;
                    emit InvestorDeactivated(voter, block.number, block.timestamp);
                }

                emit FundsWithdrawn(voter, amount, block.number, block.timestamp);
            }
        }
    }

    // Execute a Parameter Proposal
    function executeParameterProposal(uint256 _proposalId) external onlyOwner nonReentrant whenNotPaused {
        ParameterProposal storage proposal = parameterProposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= parameterProposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        require(block.number >= proposal.endBlock, "Voting period not ended");

        proposal.executed = true;

        uint256 totalSupply = governanceToken.totalSupply();
        uint256 totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
        uint256 quorum = (totalSupply * minQuorumPercent) / 100;

        if (totalVotes >= quorum && proposal.totalVotesFor > proposal.totalVotesAgainst) {
            proposal.passed = true;
            if (keccak256(abi.encodePacked(proposal.parameter)) == keccak256(abi.encodePacked("votingDuration"))) {
                votingDuration = proposal.value; // Already in blocks
                emit VotingDurationSet(proposal.value, block.number, block.timestamp);
            } else if (keccak256(abi.encodePacked(proposal.parameter)) == keccak256(abi.encodePacked("minInvestmentAmount"))) {
                require(proposal.value > 0, "Minimum investment must be greater than zero");
                minInvestmentAmount = proposal.value;
                emit MinInvestmentAmountSet(proposal.value, block.number, block.timestamp);
            } else if (keccak256(abi.encodePacked(proposal.parameter)) == keccak256(abi.encodePacked("minTokensForProposal"))) {
                require(proposal.value >= 10 * 10**18, "Proposal token threshold too low");
                minTokensForProposal = proposal.value;
                emit MinTokensForProposalSet(proposal.value, block.number, block.timestamp);
            } else if (keccak256(abi.encodePacked(proposal.parameter)) == keccak256(abi.encodePacked("minVotingTokens"))) {
                require(proposal.value >= 1 * 10**18, "Voting token threshold too low");
                minVotingTokens = proposal.value;
                emit MinVotingTokensSet(proposal.value, block.number, block.timestamp);
            } else if (keccak256(abi.encodePacked(proposal.parameter)) == keccak256(abi.encodePacked("minQuorumPercent"))) {
                require(proposal.value >= 10 && proposal.value <= 100, "Quorum percent out of range");
                minQuorumPercent = proposal.value;
                emit MinQuorumPercentSet(proposal.value, block.number, block.timestamp);
            }
        }

        emit ParameterProposalExecuted(_proposalId, proposal.parameter, proposal.value, proposal.passed, block.number, block.timestamp);
    }

    // Deposit tokens into DAO
    function deposit(uint256 amount) external onlyTokenHolder(false) nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be positive");
        require(governanceToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        if (!activeInvestors[msg.sender]) {
            activeInvestors[msg.sender] = true;
            activeInvestorCount++;
        }
        lastInvestorActivity[msg.sender] = block.number;

        emit FundsDeposited(msg.sender, amount, block.number, block.timestamp);
    }

    // SECURITY IMPROVEMENT: View functions with better validation
    function getDAOBalance() external view returns (uint256) {
        return governanceToken.balanceOf(address(this));
    }

    function getAllProposalIds() external view returns (uint256[] memory) {
        return allProposalIds;
    }

    function getAllParameterProposalIds() external view returns (uint256[] memory) {
        return allParameterProposalIds;
    }

    function getFundingRecord(uint256 recordId) external view returns (uint256, address, uint256, uint256) {
        require(recordId > 0 && recordId <= fundingRecordCount, "Invalid record ID");
        FundingRecord memory record = fundingHistory[recordId];
        return (record.proposalId, record.recipient, record.amount, record.blockNumber);
    }

    function getVoterCounts(uint256 _proposalId) external view returns (uint256 votersFor, uint256 votersAgainst) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return (proposal.votersFor, proposal.votersAgainst);
    }

    function getProposalBasicDetails(uint256 _proposalId)
        external
        view
        returns (
            uint256 id,
            address proposer,
            string memory description,
            string memory projectName,
            string memory projectUrl,
            uint256 fundingGoal,
            uint256 endBlock,
            bool executed,
            bool passed
        )
    {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.projectName,
            proposal.projectUrl,
            proposal.fundingGoal,
            proposal.endBlock,
            proposal.executed,
            proposal.passed
        );
    }

    function getProposalVotingDetails(uint256 _proposalId)
        external
        view
        returns (
            uint256 totalVotesFor,
            uint256 totalVotesAgainst,
            uint256 votersFor,
            uint256 votersAgainst,
            uint256 totalInvested
        )
    {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.totalVotesFor,
            proposal.totalVotesAgainst,
            proposal.votersFor,
            proposal.votersAgainst,
            proposal.totalInvested
        );
    }

    function getParameterProposalDetails(uint256 _proposalId)
        external
        view
        returns (
            uint256 id,
            string memory parameter,
            uint256 value,
            uint256 totalVotesFor,
            uint256 totalVotesAgainst,
            uint256 votersFor,
            uint256 votersAgainst,
            uint256 endBlock,
            bool executed,
            bool passed
        )
    {
        require(_proposalId > 0 && _proposalId <= parameterProposalCount, "Invalid proposal ID");
        ParameterProposal storage proposal = parameterProposals[_proposalId];
        return (
            proposal.id,
            proposal.parameter,
            proposal.value,
            proposal.totalVotesFor,
            proposal.totalVotesAgainst,
            proposal.votersFor,
            proposal.votersAgainst,
            proposal.endBlock,
            proposal.executed,
            proposal.passed
        );
    }

    function getProposalsByProposer(address _proposer)
        external
        view
        returns (uint256[] memory)
    {
        return proposalsByProposer[_proposer];
    }

    function getVotesByInvestor(address _investor)
        external
        view
        returns (VoteRecord[] memory)
    {
        return votesByInvestor[_investor];
    }

    function getInvestmentByProposal(address _investor, uint256 _proposalId)
        external
        view
        returns (uint256)
    {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return proposal.investments[_investor];
    }

    function getTotalProposals() external view returns (uint256) {
        return proposalCount;
    }

    function getTotalFundedAmount() external view returns (uint256) {
        uint256 totalFunded = 0;
        for (uint256 i = 1; i <= fundingRecordCount; i++) {
            totalFunded += fundingHistory[i].amount;
        }
        return totalFunded;
    }

    function getActiveInvestorCount() external view returns (uint256) {
        return activeInvestorCount;
    }

    function getLastInvestorActivity(address investor) external view returns (uint256) {
        return lastInvestorActivity[investor];
    }

    // SECURITY IMPROVEMENT: New utility functions for better transparency
    function isProposalActive(uint256 _proposalId) external view returns (bool) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        return !proposal.executed && block.number < proposal.endBlock;
    }

    function canExecuteProposal(uint256 _proposalId) external view returns (bool, string memory reason) {
        if (_proposalId == 0 || _proposalId > proposalCount) {
            return (false, "Invalid proposal ID");
        }
        
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.executed) {
            return (false, "Proposal already executed");
        }
        
        if (block.number < proposal.endBlock) {
            return (false, "Voting period not ended");
        }
        
        // Check if proposal meets execution criteria
        bool meetsInvestmentGoal = proposal.totalInvested >= proposal.fundingGoal;
        
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
        bool meetsQuorumAndVotes = totalVotes >= (totalSupply * minQuorumPercent) / 100 && 
                                   proposal.totalVotesFor > proposal.totalVotesAgainst;
        
        if (meetsInvestmentGoal || meetsQuorumAndVotes) {
            return (true, "Proposal can be executed");
        }
        
        return (false, "Proposal does not meet execution criteria");
    }

    function getMultiSigProposalDetails(uint256 _proposalId) 
        external 
        view 
        returns (
            uint256 id,
            address proposer,
            string memory action,
            uint256 value,
            address target,
            uint256 approvals,
            bool executed
        ) 
    {
        require(_proposalId > 0 && _proposalId <= multiSigProposalCount, "Invalid multi-sig proposal ID");
        MultiSigProposal storage proposal = multiSigProposals[_proposalId];
        return (
            proposal.id,
            proposal.proposer,
            proposal.action,
            proposal.value,
            proposal.target,
            proposal.approvals,
            proposal.executed
        );
    }

    // SECURITY IMPROVEMENT: Emergency functions documentation
    function getEmergencyStatus(uint256 _proposalId) external view returns (bool wasEmergencyExecuted) {
        return emergencyExecuted[_proposalId];
    }

    function getContractStatus() external view returns (
        bool isPaused,
        uint256 totalProposals,
        uint256 totalParameterProposals,
        uint256 totalMultiSigProposals,
        uint256 daoBalance,
        uint256 activeInvestors
    ) {
        return (
            paused,
            proposalCount,
            parameterProposalCount,
            multiSigProposalCount,
            governanceToken.balanceOf(address(this)),
            activeInvestorCount
        );
    }

    // SECURITY IMPROVEMENT: Owner management functions
    function isOwner(address account) external view returns (bool) {
        return owners[account];
    }

    function getRequiredApprovals() external view returns (uint256) {
        return requiredApprovals;
    }

    function hasApprovedMultiSig(uint256 _proposalId, address owner) external view returns (bool) {
        require(_proposalId > 0 && _proposalId <= multiSigProposalCount, "Invalid multi-sig proposal ID");
        return multiSigProposals[_proposalId].hasApproved[owner];
    }

    // SECURITY IMPROVEMENT: Additional validation functions
    function validateProposalExecution(uint256 _proposalId) external view returns (
        bool canExecute,
        bool hasEnded,
        bool meetsInvestmentGoal,
        bool meetsQuorum,
        uint256 currentBlock,
        uint256 endBlock
    ) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        
        hasEnded = block.number >= proposal.endBlock;
        meetsInvestmentGoal = proposal.totalInvested >= proposal.fundingGoal;
        
        uint256 totalSupply = governanceToken.totalSupply();
        uint256 totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
        meetsQuorum = totalVotes >= (totalSupply * minQuorumPercent) / 100 && 
                      proposal.totalVotesFor > proposal.totalVotesAgainst;
        
        canExecute = hasEnded && (meetsInvestmentGoal || meetsQuorum) && !proposal.executed;
        
        return (
            canExecute,
            hasEnded,
            meetsInvestmentGoal,
            meetsQuorum,
            block.number,
            proposal.endBlock
        );
    }

    // SECURITY IMPROVEMENT: Governance parameter getters
    function getGovernanceParameters() external view returns (
        uint256 _minInvestmentAmount,
        uint256 _votingDuration,
        uint256 _minTokensForProposal,
        uint256 _minVotingTokens,
        uint256 _minQuorumPercent
    ) {
        return (
            minInvestmentAmount,
            votingDuration,
            minTokensForProposal,
            minVotingTokens,
            minQuorumPercent
        );
    }

    // SECURITY IMPROVEMENT: Time-based utility functions
    function getCurrentBlock() external view returns (uint256) {
        return block.number;
    }

    function getBlocksUntilEnd(uint256 _proposalId) external view returns (uint256) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        
        if (block.number >= proposal.endBlock) {
            return 0;
        }
        return proposal.endBlock - block.number;
    }

    function estimateTimeUntilEnd(uint256 _proposalId) external view returns (uint256 secondsRemaining) {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        
        if (block.number >= proposal.endBlock) {
            return 0;
        }
        uint256 blocksRemaining = proposal.endBlock - block.number;
        return blocksRemaining * AVERAGE_BLOCK_TIME;
    }
}