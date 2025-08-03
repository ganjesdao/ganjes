// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../storage/DAOStorage.sol";
import "../libraries/ReentrancyGuard.sol";

contract ProposalManager is DAOStorage {
    
    event ProposalCreated(
        uint256 indexed proposalId, 
        address indexed proposer, 
        string description, 
        string projectName,
        string projectUrl,
        uint256 fundingGoal,
        uint256 stakeAmount,
        uint256 timestamp
    );
    
    event VotingDurationIncreased(uint256 indexed proposalId, uint256 newEndTime, uint256 timestamp);
    
    function createProposal(
        string memory _description, 
        string memory _projectName,
        string memory _projectUrl,
        uint256 _fundingGoal
    ) 
        external 
        virtual
        onlyTokenHolder 
    {
        require(governanceToken.balanceOf(msg.sender) >= MIN_TOKENS_FOR_PROPOSAL, "Insufficient tokens to propose");
        require(_fundingGoal > 0, "Funding goal must be greater than zero");
        require(bytes(_projectName).length > 0, "Project name cannot be empty");
        require(bytes(_projectUrl).length > 0, "Project URL cannot be empty");
        
        // Transfer required tokens from proposer to contract
        require(governanceToken.transferFrom(msg.sender, address(this), MIN_TOKENS_FOR_PROPOSAL), "Token transfer failed");
        
        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.description = _description;
        newProposal.projectName = _projectName;
        newProposal.projectUrl = _projectUrl;
        newProposal.fundingGoal = _fundingGoal;
        newProposal.endTime = block.timestamp + votingDuration;
        newProposal.stakeAmount = MIN_TOKENS_FOR_PROPOSAL;
        newProposal.executed = false;
        newProposal.passed = false;
        newProposal.votersFor = 0;
        newProposal.votersAgainst = 0;
        newProposal.totalInvested = 0;
        
        allProposalIds.push(proposalCount);
        proposalsByProposer[msg.sender].push(proposalCount);
        
        emit ProposalCreated(proposalCount, msg.sender, _description, _projectName, _projectUrl, _fundingGoal, MIN_TOKENS_FOR_PROPOSAL, block.timestamp);
    }
    
    function increaseVotingDuration(uint256 _proposalId, uint256 _additionalDuration) 
        external 
        virtual
        onlyAdmin 
    {
        require(_proposalId > 0 && _proposalId <= proposalCount, "Invalid proposal ID");
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.executed, "Proposal already executed");
        require(_additionalDuration > 0, "Additional duration must be positive");
        require(proposal.endTime + _additionalDuration <= block.timestamp + MAX_VOTING_DURATION, "New duration exceeds maximum allowed");
        
        proposal.endTime += _additionalDuration;
        emit VotingDurationIncreased(_proposalId, proposal.endTime, block.timestamp);
    }
}