// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IERC20.sol";
import "../interfaces/IDAOStructs.sol";
import "../libraries/DAOConstants.sol";

/**
 * @title DAOStorage
 * @dev Base storage contract to avoid variable duplication
 */
abstract contract DAOStorage is IDAOStructs {
    // Token used for voting and funding
    IERC20 public governanceToken;
    
    // Configurable governance parameters
    uint256 public minTokensForProposal;
    uint256 public minVotingTokens;
    uint256 public minQuorumPercent;
    uint256 public minInvestmentAmount;
    uint256 public votingDuration;
    
    // Proposal storage
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    uint256[] public allProposalIds;
    mapping(address => uint256[]) public proposalsByProposer;
    mapping(address => VoteRecord[]) public votesByInvestor;
    
    // Parameter proposals
    mapping(uint256 => ParameterProposal) public parameterProposals;
    uint256 public parameterProposalCount;
    uint256[] public allParameterProposalIds;
    
    // Multi-Sig Variables
    uint256 public multiSigProposalCount;
    mapping(uint256 => MultiSigProposal) public multiSigProposals;
    
    // Proposal fee tracking
    mapping(uint256 => uint256) public proposalFees;
    mapping(address => uint256) public totalProposalFeesPaid;
    
    // Funding history
    mapping(uint256 => FundingRecord) public fundingHistory;
    uint256 public fundingRecordCount;
    
    // Investor management
    mapping(address => bool) public activeInvestors;
    uint256 public activeInvestorCount;
    mapping(address => uint256) public lastInvestorActivity;
    
    // Emergency execution tracking
    mapping(uint256 => bool) public emergencyExecuted;

    // Modifiers
    modifier onlyTokenHolder(bool isProposal) {
        if (isProposal) {
            require(governanceToken.balanceOf(msg.sender) >= minTokensForProposal, "Insufficient tokens to propose");
        } else {
            require(governanceToken.balanceOf(msg.sender) >= minVotingTokens, "Insufficient tokens to vote");
        }
        _;
    }

    /**
     * @dev Initialize DAO storage
     */
    function _initializeDAOStorage(address _governanceToken) internal {
        require(_governanceToken != address(0), "Invalid token address");
        governanceToken = IERC20(_governanceToken);
        
        // Set default parameters
        minTokensForProposal = DAOConstants.DEFAULT_MIN_TOKENS_FOR_PROPOSAL;
        minVotingTokens = DAOConstants.DEFAULT_MIN_VOTING_TOKENS;
        minQuorumPercent = DAOConstants.DEFAULT_MIN_QUORUM_PERCENT;
        minInvestmentAmount = DAOConstants.DEFAULT_MIN_INVESTMENT_AMOUNT;
        votingDuration = DAOConstants.DEFAULT_VOTING_DURATION;
    }
}