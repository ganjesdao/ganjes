// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGanjesDAO {
    // Core DAO functions
    function createProposal(string memory _description, string memory _projectName, string memory _projectUrl, uint256 _fundingGoal) external;
    function vote(uint256 _proposalId, bool _support, uint256 _investmentAmount) external;
    function executeProposal(uint256 _proposalId) external;
    
    // Fund management functions
    function deposit(uint256 amount) external;
    function emergencyWithdraw(uint256 _amount, address _to, string memory _reason) external;
    function claimRefund(uint256 _proposalId) external;
    function batchRefund(uint256 _proposalId, address[] memory _investors) external;
    
    // Admin functions
    function increaseVotingDuration(uint256 _proposalId, uint256 _additionalDuration) external;
}