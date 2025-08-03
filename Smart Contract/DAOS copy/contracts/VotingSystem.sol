// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../storage/DAOStorage.sol";
import "../libraries/ReentrancyGuard.sol";

contract VotingSystem is DAOStorage {
    
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight, uint256 investmentAmount, uint256 timestamp);
    
    function vote(uint256 _proposalId, bool _support, uint256 _investmentAmount) 
        external 
        virtual
        onlyTokenHolder 
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
    
    function getVoterCounts(uint256 _proposalId) external view returns (uint256 votersFor, uint256 votersAgainst) {
        Proposal storage proposal = proposals[_proposalId];
        return (proposal.votersFor, proposal.votersAgainst);
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
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.totalVotesFor,
            proposal.totalVotesAgainst,
            proposal.votersFor,
            proposal.votersAgainst,
            proposal.totalInvested
        );
    }
}