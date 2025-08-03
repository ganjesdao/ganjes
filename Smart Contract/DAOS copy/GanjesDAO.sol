// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./libraries/ReentrancyGuard.sol";
import "./storage/DAOStorage.sol";
import "./contracts/ProposalManager.sol";
import "./contracts/VotingSystem.sol";
import "./contracts/FundManager.sol";

contract GanjesDAO is DAOStorage, ReentrancyGuard, ProposalManager, VotingSystem, FundManager {
    
    event MinInvestmentAmountSet(uint256 amount, uint256 timestamp);
    event VotingDurationSet(uint256 duration, uint256 timestamp);
    
    constructor(address _governanceToken) ReentrancyGuard() {
        require(_governanceToken != address(0), "Invalid token address");
        governanceToken = IERC20(_governanceToken);
        admin = msg.sender;
        admins[msg.sender] = true;
        adminCount = 1;
        proposalCount = 0;
        fundingRecordCount = 0;
        activeInvestorCount = 0;
        minInvestmentAmount = 10 * 10**18;
        votingDuration = 5 minutes;
    }
    
    // Admin configuration functions
    function setVotingDuration(uint256 _duration) external onlyAdmin {
        require(_duration >= MIN_VOTING_DURATION, "Voting duration too short");
        require(_duration <= MAX_VOTING_DURATION, "Voting duration too long");
        votingDuration = _duration;
        emit VotingDurationSet(_duration, block.timestamp);
    }
    
    function setMinInvestmentAmount(uint256 _minInvestmentAmount) external onlyAdmin {
        require(_minInvestmentAmount > 0, "Minimum investment must be greater than zero");
        minInvestmentAmount = _minInvestmentAmount;
        emit MinInvestmentAmountSet(_minInvestmentAmount, block.timestamp);
    }
    
    // View functions
    function getAllProposalIds() external view returns (uint256[] memory) {
        return allProposalIds;
    }
    
    struct ProposalBasicDetails {
        uint256 id;
        address proposer;
        string description;
        string projectName;
        string projectUrl;
        uint256 fundingGoal;
        uint256 endTime;
        uint256 stakeAmount;
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
            stakeAmount: proposal.stakeAmount,
            executed: proposal.executed,
            passed: proposal.passed
        });
    }
    
    function getProposalsByProposer(address _proposer) external view returns (uint256[] memory) {
        return proposalsByProposer[_proposer];
    }
    
    function getVotesByInvestor(address _investor) external view returns (VoteRecord[] memory) {
        return votesByInvestor[_investor];
    }
    
    function getInvestmentByProposal(address _investor, uint256 _proposalId) external view returns (uint256) {
        Proposal storage proposal = proposals[_proposalId];
        return proposal.investments[_investor];
    }
    
    function getTotalProposals() external view returns (uint256) {
        return proposalCount;
    }
    
    function getApprovedProposals() external view returns (uint256 count, uint256[] memory approvedIds) {
        return getApprovedProposalsPaginated(0, proposalCount);
    }
    
    function getApprovedProposalsPaginated(uint256 _offset, uint256 _limit) public view returns (uint256 count, uint256[] memory approvedIds) {
        require(_limit <= 100, "Limit too high, max 100");
        uint256 end = _offset + _limit;
        if (end > proposalCount) {
            end = proposalCount;
        }
        
        uint256 approvedCount = 0;
        uint256[] memory tempIds = new uint256[](_limit);
        
        for (uint256 i = _offset + 1; i <= end; i++) {
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
    
    function getRunningProposals() external view returns (uint256 count, uint256[] memory runningIds) {
        return getRunningProposalsPaginated(0, proposalCount);
    }
    
    function getRunningProposalsPaginated(uint256 _offset, uint256 _limit) public view returns (uint256 count, uint256[] memory runningIds) {
        require(_limit <= 100, "Limit too high, max 100");
        uint256 end = _offset + _limit;
        if (end > proposalCount) {
            end = proposalCount;
        }
        
        uint256 runningCount = 0;
        uint256[] memory tempIds = new uint256[](_limit);
        
        for (uint256 i = _offset + 1; i <= end; i++) {
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
    
    function getActiveInvestorCount() external view returns (uint256) {
        return activeInvestorCount;
    }
    
    // Core DAO functions with security modifiers
    function createProposal(
        string memory _description, 
        string memory _projectName,
        string memory _projectUrl,
        uint256 _fundingGoal
    ) 
        external 
        override
        onlyTokenHolder 
        nonReentrant
        whenNotPaused
    {
        super.createProposal(_description, _projectName, _projectUrl, _fundingGoal);
    }
    
    function vote(uint256 _proposalId, bool _support, uint256 _investmentAmount) 
        external 
        override
        onlyMinimumTokenHolder 
        nonReentrant
        whenNotPaused
    {
        super.vote(_proposalId, _support, _investmentAmount);
    }
    
    function executeProposal(uint256 _proposalId) 
        external 
        override
        onlyAdmin 
        nonReentrant 
        whenNotPaused
    {
        super.executeProposal(_proposalId);
    }
    
    function deposit(uint256 amount) 
        external 
        override
        onlyTokenHolder 
        nonReentrant 
    {
        super.deposit(amount);
    }
    
    function emergencyWithdraw(uint256 _amount, address _to, string memory _reason) 
        external 
        override
        onlyAdmin 
        nonReentrant 
    {
        super.emergencyWithdraw(_amount, _to, _reason);
    }
    
    function increaseVotingDuration(uint256 _proposalId, uint256 _additionalDuration) 
        external 
        override
        onlyAdmin 
        nonReentrant 
    {
        super.increaseVotingDuration(_proposalId, _additionalDuration);
    }
    
    function claimRefund(uint256 _proposalId) 
        external 
        override
        nonReentrant 
    {
        super.claimRefund(_proposalId);
    }
    
    function batchRefund(uint256 _proposalId, address[] memory _investors) 
        external 
        override
        onlyAdmin 
        nonReentrant 
    {
        super.batchRefund(_proposalId, _investors);
    }
    
    // Emergency pause functions
    function pause() external onlyAdmin {
        _pause();
    }
    
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    // Multi-admin preparation functions
    function addAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        require(!admins[_newAdmin], "Already an admin");
        require(adminCount < 10, "Too many admins"); // Prevent admin spam
        
        admins[_newAdmin] = true;
        adminCount++;
        emit AdminAdded(_newAdmin, msg.sender, block.timestamp);
    }
    
    function removeAdmin(address _admin) external onlyAdmin {
        require(admins[_admin], "Not an admin");
        require(_admin != admin, "Cannot remove primary admin");
        require(adminCount > 1, "Must have at least one admin");
        
        admins[_admin] = false;
        adminCount--;
        emit AdminRemoved(_admin, msg.sender, block.timestamp);
    }
    
    function transferPrimaryAdmin(address _newPrimaryAdmin) external {
        require(msg.sender == admin, "Only primary admin can transfer");
        require(admins[_newPrimaryAdmin], "New admin must be in admin list");
        
        address oldAdmin = admin;
        admin = _newPrimaryAdmin;
        emit PrimaryAdminTransferred(oldAdmin, _newPrimaryAdmin, block.timestamp);
    }
    
    // Events for admin management
    event AdminAdded(address indexed newAdmin, address indexed addedBy, uint256 timestamp);
    event AdminRemoved(address indexed removedAdmin, address indexed removedBy, uint256 timestamp);
    event PrimaryAdminTransferred(address indexed oldAdmin, address indexed newAdmin, uint256 timestamp);
}