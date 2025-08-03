// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// IERC20 interface defined outside the contract
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract GanjesDAO {
    // Custom ReentrancyGuard logic
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    // Token used for voting and funding
    IERC20 public governanceToken;
    
    // Admin address
    address public admin;
    
    // Minimum investment amount required to vote (set by admin)
    uint256 public minInvestmentAmount;
    
    // Voting duration (set by admin, in seconds)
    uint256 public votingDuration;
    
    // Proposal structure
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
        uint256 endTime;
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteTimestamp;
        mapping(address => uint256) investments;
    }
    
    // Funding record structure
    struct FundingRecord {
        uint256 proposalId;
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }
    
    // Vote record structure for investor tracking
    struct VoteRecord {
        uint256 proposalId;
        bool support;
        uint256 investmentAmount;
        uint256 timestamp;
    }
    
    // Mappings and arrays for history
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256[] public allProposalIds;
    mapping(uint256 => FundingRecord) public fundingHistory;
    uint256 public fundingRecordCount;
    mapping(address => uint256[]) public proposalsByProposer;
    mapping(address => VoteRecord[]) public votesByInvestor;
    mapping(address => bool) public activeInvestors; // New: Tracks unique investors
    uint256 public activeInvestorCount; // New: Tracks count of unique investors
    
    // Constants
    uint256 public constant MIN_TOKENS_FOR_PROPOSAL = 100 * 10**18;
    uint256 public constant MIN_QUORUM_PERCENT = 50;
    uint256 public constant MIN_VOTING_DURATION = 1 minutes;
    uint256 public constant MAX_VOTING_DURATION = 30 days;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId, 
        address indexed proposer, 
        string description, 
        string projectName,
        string projectUrl,
        uint256 fundingGoal, 
        uint256 timestamp
    );
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight, uint256 investmentAmount, uint256 timestamp);
    event ProposalExecuted(uint256 indexed proposalId, bool passed, uint256 amountAllocated, uint256 timestamp);
    event FundsWithdrawn(address indexed recipient, uint256 amount, uint256 timestamp);
    event FundsDeposited(address indexed depositor, uint256 amount, uint256 timestamp);
    event MinInvestmentAmountSet(uint256 amount, uint256 timestamp);
    event VotingDurationSet(uint256 duration, uint256 timestamp);
    event VotingDurationIncreased(uint256 indexed proposalId, uint256 newEndTime, uint256 timestamp);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyTokenHolder() {
        require(governanceToken.balanceOf(msg.sender) > 0, "Must hold tokens to participate");
        _;
    }
    
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    
    // Constructor
    constructor(address _governanceToken) {
        require(_governanceToken != address(0), "Invalid token address");
        governanceToken = IERC20(_governanceToken);
        admin = msg.sender;
        proposalCount = 0;
        fundingRecordCount = 0;
        activeInvestorCount = 0;
        _status = _NOT_ENTERED;
        minInvestmentAmount = 10 * 10**18;
        votingDuration = 5 minutes;
    }
    
    // Set voting duration (admin only)
    function setVotingDuration(uint256 _duration) external onlyAdmin {
        require(_duration >= MIN_VOTING_DURATION, "Voting duration too short");
        require(_duration <= MAX_VOTING_DURATION, "Voting duration too long");
        votingDuration = _duration;
        emit VotingDurationSet(_duration, block.timestamp);
    }
    
    // Set minimum investment amount (admin only)
    function setMinInvestmentAmount(uint256 _minInvestmentAmount) external onlyAdmin {
        require(_minInvestmentAmount > 0, "Minimum investment must be greater than zero");
        minInvestmentAmount = _minInvestmentAmount;
        emit MinInvestmentAmountSet(_minInvestmentAmount, block.timestamp);
    }
    
    // Increase voting duration for a specific proposal (admin only)
    function increaseVotingDuration(uint256 _proposalId, uint256 _additionalDuration) 
        external 
        onlyAdmin 
        nonReentrant 
    {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.executed, "Proposal already executed");
        require(_additionalDuration > 0, "Additional duration must be positive");
        require(proposal.endTime + _additionalDuration <= block.timestamp + MAX_VOTING_DURATION, "New duration exceeds maximum allowed");
        
        proposal.endTime += _additionalDuration;
        emit VotingDurationIncreased(_proposalId, proposal.endTime, block.timestamp);
    }
    
    // Create a new proposal
    function createProposal(
        string memory _description, 
        string memory _projectName,
        string memory _projectUrl,
        uint256 _fundingGoal
    ) 
        external 
        onlyTokenHolder 
        nonReentrant 
    {
        require(governanceToken.balanceOf(msg.sender) >= MIN_TOKENS_FOR_PROPOSAL, "Insufficient tokens to propose");
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
        newProposal.endTime = block.timestamp + votingDuration;
        newProposal.executed = false;
        newProposal.passed = false;
        newProposal.votersFor = 0;
        newProposal.votersAgainst = 0;
        newProposal.totalInvested = 0;
        
        allProposalIds.push(proposalCount);
        proposalsByProposer[msg.sender].push(proposalCount);
        
        emit ProposalCreated(proposalCount, msg.sender, _description, _projectName, _projectUrl, _fundingGoal, block.timestamp);
    }
    
    // Vote on a proposal
    function vote(uint256 _proposalId, bool _support, uint256 _investmentAmount) 
        external 
        onlyTokenHolder 
        nonReentrant 
    {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(msg.sender != proposal.proposer, "Proposer cannot vote on own proposal");
        require(block.timestamp < proposal.endTime, "Voting period has ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Proposal already executed");
        require(_investmentAmount >= minInvestmentAmount, "Investment below minimum amount");
        require(_investmentAmount <= proposal.fundingGoal, "Investment exceeds funding goal");
        
        uint256 voterBalance = governanceToken.balanceOf(msg.sender);
        require(voterBalance > 0, "No tokens to vote");
        
        require(governanceToken.transferFrom(msg.sender, address(this), _investmentAmount), "Investment transfer failed");
        
        if (!activeInvestors[msg.sender]) {
            activeInvestors[msg.sender] = true;
            activeInvestorCount++;
        }
        
        proposal.hasVoted[msg.sender] = true;
        proposal.voteTimestamp[msg.sender] = block.timestamp;
        proposal.investments[msg.sender] = _investmentAmount;
        proposal.totalInvested += _investmentAmount;
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
            timestamp: block.timestamp
        }));
        
        emit Voted(_proposalId, msg.sender, _support, voterBalance, _investmentAmount, block.timestamp);
    }
    
    // Execute a proposal
    function executeProposal(uint256 _proposalId) external onlyAdmin nonReentrant {
        Proposal storage proposal = proposals[_proposalId];
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        require(!proposal.executed, "Proposal already executed");
        
        proposal.executed = true;
        
        if (proposal.totalInvested >= proposal.fundingGoal) {
            proposal.passed = true;
            require(governanceToken.balanceOf(address(this)) >= proposal.fundingGoal, "Insufficient DAO funds");
            governanceToken.transfer(proposal.proposer, proposal.fundingGoal);
            
            fundingRecordCount++;
            fundingHistory[fundingRecordCount] = FundingRecord({
                proposalId: _proposalId,
                recipient: proposal.proposer,
                amount: proposal.fundingGoal,
                timestamp: block.timestamp
            });
            
            emit FundsWithdrawn(proposal.proposer, proposal.fundingGoal, block.timestamp);
        } else {
            require(block.timestamp >= proposal.endTime, "Voting period not ended");
            uint256 totalSupply = governanceToken.totalSupply();
            uint256 totalVotes = proposal.totalVotesFor + proposal.totalVotesAgainst;
            uint256 quorum = (totalSupply * MIN_QUORUM_PERCENT) / 100;
            
            if (totalVotes >= quorum && proposal.totalVotesFor > proposal.totalVotesAgainst) {
                proposal.passed = true;
                require(governanceToken.balanceOf(address(this)) >= proposal.fundingGoal, "Insufficient DAO funds");
                governanceToken.transfer(proposal.proposer, proposal.fundingGoal);
                
                fundingRecordCount++;
                fundingHistory[fundingRecordCount] = FundingRecord({
                    proposalId: _proposalId,
                    recipient: proposal.proposer,
                    amount: proposal.fundingGoal,
                    timestamp: block.timestamp
                });
                
                emit FundsWithdrawn(proposal.proposer, proposal.fundingGoal, block.timestamp);
            }
        }
        
        emit ProposalExecuted(_proposalId, proposal.passed, proposal.passed ? proposal.fundingGoal : 0, block.timestamp);
    }
    
    // Deposit tokens into DAO
    function deposit(uint256 amount) external onlyTokenHolder nonReentrant {
        require(amount > 0, "Amount must be positive");
        require(governanceToken.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        emit FundsDeposited(msg.sender, amount, block.timestamp);
    }
    
    // Withdraw excess funds (admin only)
    function withdraw(uint256 _amount, address _to) external onlyAdmin nonReentrant {
        require(_amount > 0, "Withdraw amount must be positive");
        require(governanceToken.balanceOf(address(this)) >= _amount, "Insufficient DAO balance");
        governanceToken.transfer(_to, _amount);
        emit FundsWithdrawn(_to, _amount, block.timestamp);
    }
    
    // Get DAO balance
    function getDAOBalance() external view returns (uint256) {
        return governanceToken.balanceOf(address(this));
    }
    
    // Get all proposal IDs
    function getAllProposalIds() external view returns (uint256[] memory) {
        return allProposalIds;
    }
    
    // Get funding history by record ID
    function getFundingRecord(uint256 recordId) external view returns (uint256, address, uint256, uint256) {
        FundingRecord memory record = fundingHistory[recordId];
        return (record.proposalId, record.recipient, record.amount, record.timestamp);
    }
    
    // Get voter counts for a proposal
    function getVoterCounts(uint256 _proposalId) external view returns (uint256 votersFor, uint256 votersAgainst) {
        Proposal storage proposal = proposals[_proposalId];
        return (proposal.votersFor, proposal.votersAgainst);
    }
    
    // Get basic proposal details
    struct ProposalBasicDetails {
        uint256 id;
        address proposer;
        string description;
        string projectName;
        string projectUrl;
        uint256 fundingGoal;
        uint256 endTime;
        bool executed;
        bool passed;
    }
    
    function getProposalBasicDetails(uint256 _proposalId)
        external
        view
        returns (ProposalBasicDetails memory)
    {
        Proposal storage proposal = proposals[_proposalId];
        return ProposalBasicDetails({
            id: proposal.id,
            proposer: proposal.proposer,
            description: proposal.description,
            projectName: proposal.projectName,
            projectUrl: proposal.projectUrl,
            fundingGoal: proposal.fundingGoal,
            endTime: proposal.endTime,
            executed: proposal.executed,
            passed: proposal.passed
        });
    }

    // Get extended proposal voting details
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
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.totalVotesFor,
            proposal.totalVotesAgainst,
            proposal.votersFor,
            proposal.votersAgainst,
            proposal.totalInvested
        );
    }
    
    // Get proposals by proposer address
    function getProposalsByProposer(address _proposer)
        external
        view
        returns (uint256[] memory)
    {
        return proposalsByProposer[_proposer];
    }
    
    // Get votes by investor address
    function getVotesByInvestor(address _investor)
        external
        view
        returns (VoteRecord[] memory)
    {
        return votesByInvestor[_investor];
    }
    
    // Get investment amount for a specific proposal by investor
    function getInvestmentByProposal(address _investor, uint256 _proposalId)
        external
        view
        returns (uint256)
    {
        Proposal storage proposal = proposals[_proposalId];
        return proposal.investments[_investor];
    }
    
    // New: Get total number of proposals
    function getTotalProposals() external view returns (uint256) {
        return proposalCount;
    }
    
    // New: Get approved proposals count and IDs
    function getApprovedProposals() external view returns (uint256 count, uint256[] memory approvedIds) {
        uint256 approvedCount = 0;
        uint256[] memory tempIds = new uint256[](proposalCount);
        
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (proposals[i].passed && proposals[i].executed) {
                tempIds[approvedCount] = i;
                approvedCount++;
            }
        }
        
        approvedIds = new uint256[](approvedCount);
        for (uint256 i = 0; i < approvedCount; i++) {
            approvedIds[i] = tempIds[i];
        }
        
        return (approvedCount, approvedIds);
    }
    
    // New: Get running proposals count and IDs
    function getRunningProposals() external view returns (uint256 count, uint256[] memory runningIds) {
        uint256 runningCount = 0;
        uint256[] memory tempIds = new uint256[](proposalCount);
        
        for (uint256 i = 1; i <= proposalCount; i++) {
            if (!proposals[i].executed && block.timestamp < proposals[i].endTime) {
                tempIds[runningCount] = i;
                runningCount++;
            }
        }
        
        runningIds = new uint256[](runningCount);
        for (uint256 i = 0; i < runningCount; i++) {
            runningIds[i] = tempIds[i];
        }
        
        return (runningCount, runningIds);
    }
    
    // New: Get total funded amount
    function getTotalFundedAmount() external view returns (uint256) {
        uint256 totalFunded = 0;
        for (uint256 i = 1; i <= fundingRecordCount; i++) {
            totalFunded += fundingHistory[i].amount;
        }
        return totalFunded;
    }
    
    // New: Get active investors count
    function getActiveInvestorCount() external view returns (uint256) {
        return activeInvestorCount;
    }
}