// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IDAOStructs
 * @dev Interface defining all DAO data structures
 */
interface IDAOStructs {
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
        uint256 endBlock;
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteBlock;
        mapping(address => uint256) investments;
    }

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
        uint256 endBlock;
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
    }

    // Funding record structure
    struct FundingRecord {
        uint256 proposalId;
        address recipient;
        uint256 amount;
        uint256 blockNumber;
    }

    // Vote record structure for investor tracking
    struct VoteRecord {
        uint256 proposalId;
        bool support;
        uint256 investmentAmount;
        uint256 blockNumber;
    }
}