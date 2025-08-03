// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IERC20.sol";
import "../libraries/Pausable.sol";

contract DAOStorage is Pausable {
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
        uint256 stakeAmount;
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) voteTimestamp;
        mapping(address => uint256) investments;
    }
    
    struct FundingRecord {
        uint256 proposalId;
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }
    
    struct VoteRecord {
        uint256 proposalId;
        bool support;
        uint256 investmentAmount;
        uint256 timestamp;
    }
    
    // Token used for voting and funding
    IERC20 public governanceToken;
    
    // Admin addresses - prepare for multi-sig
    address public admin;
    mapping(address => bool) public admins;
    uint256 public adminCount;
    
    // Configuration
    uint256 public minInvestmentAmount;
    uint256 public votingDuration;
    
    // Proposal storage
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256[] public allProposalIds;
    
    // Funding storage
    mapping(uint256 => FundingRecord) public fundingHistory;
    uint256 public fundingRecordCount;
    
    // User tracking
    mapping(address => uint256[]) public proposalsByProposer;
    mapping(address => VoteRecord[]) public votesByInvestor;
    mapping(address => bool) public activeInvestors;
    uint256 public activeInvestorCount;
    
    // Constants
    uint256 public constant MIN_TOKENS_FOR_PROPOSAL = 100 * 10**18;
    uint256 public constant MIN_QUORUM_PERCENT = 50;
    uint256 public constant MIN_VOTING_DURATION = 1 minutes;
    uint256 public constant MAX_VOTING_DURATION = 30 days;
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyTokenHolder() {
        require(governanceToken.balanceOf(msg.sender) > 0, "Must hold tokens to participate");
        _;
    }
    
    modifier onlyMinimumTokenHolder() {
        require(governanceToken.balanceOf(msg.sender) >= minInvestmentAmount, "Insufficient tokens to participate");
        _;
    }
}