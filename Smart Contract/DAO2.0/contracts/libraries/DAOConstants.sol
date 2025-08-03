// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DAOConstants
 * @dev Library containing all DAO constants and configurations
 */
library DAOConstants {
    // Average block time (12 seconds for Ethereum)
    uint256 public constant AVERAGE_BLOCK_TIME = 12; // seconds
    
    // Time-based constants in blocks
    uint256 public constant MIN_VOTING_DURATION = 5 * 60 / AVERAGE_BLOCK_TIME; // 5 minutes (~25 blocks)
    uint256 public constant MAX_VOTING_DURATION = 30 * 24 * 60 * 60 / AVERAGE_BLOCK_TIME; // 30 days (~216,000 blocks)
    uint256 public constant INACTIVITY_PERIOD = 90 * 24 * 60 * 60 / AVERAGE_BLOCK_TIME; // 90 days (~648,000 blocks)
    
    // Default governance parameters
    uint256 public constant DEFAULT_MIN_TOKENS_FOR_PROPOSAL = 100 * 10**18;
    uint256 public constant DEFAULT_MIN_VOTING_TOKENS = 10 * 10**18;
    uint256 public constant DEFAULT_MIN_QUORUM_PERCENT = 50;
    uint256 public constant DEFAULT_MIN_INVESTMENT_AMOUNT = 10 * 10**18;
    uint256 public constant DEFAULT_VOTING_DURATION = 3 * 24 * 60 * 60 / AVERAGE_BLOCK_TIME; // 3 days in blocks (~21,600 blocks)
    
    // Validation ranges
    uint256 public constant MIN_PROPOSAL_TOKEN_THRESHOLD = 10 * 10**18;
    uint256 public constant MIN_VOTING_TOKEN_THRESHOLD = 1 * 10**18;
    uint256 public constant MIN_QUORUM_PERCENT_THRESHOLD = 10;
    uint256 public constant MAX_QUORUM_PERCENT_THRESHOLD = 100;
}